import { Router, Response } from 'express';
import { Progress } from '../models/Progress.js';
import { Activity } from '../models/Activity.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { Template } from '../models/Template.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { generateAIMessage, generateCompletionMessage } from '../services/aiService.js';
import { sendTelegramMessage } from '../services/telegramService.js';
import { emitNewActivity } from '../services/socketService.js';

const router = Router();

// GET /api/progress/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const progress = await Progress.find({ userId: user._id });
    res.json(progress);
  } catch (error) {
    console.error('Get my progress error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/progress/group/:groupId
router.get('/group/:groupId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await Progress.find({ groupId: req.params.groupId });
    res.json(progress);
  } catch (error) {
    console.error('Get group progress error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/progress
router.patch('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.groupId) return res.status(400).json({ error: 'You must be in a group' });

    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const groupId = user.groupId as unknown as string;

    // Fetch template for label lookups
    const template = await Template.findOne({ groupId });
    const sectionMap = new Map<string, any>();
    const topicMap = new Map<string, string>();

    if (template?.schema?.sections) {
      for (const section of template.schema.sections) {
        sectionMap.set(section.id, section);
        if (section.topics) {
          for (const topic of section.topics) {
            topicMap.set(topic.id, topic.label);
          }
        }
      }
    }

    // Collect deltas
    const delta: {
      topicsCompleted: string[];
      topicsCompletedIds: { topicId: string, sectionId: string }[];
      topicsUnchecked: string[];
      lectureDeltas: Array<{ section: string; from: number; to: number; total: number }>;
    } = {
      topicsCompleted: [],
      topicsCompletedIds: [],
      topicsUnchecked: [],
      lectureDeltas: [],
    };

    // Process each update
    for (const update of updates) {
      const { sectionId, topicId, type, checked, lecturesDone } = update;

      // Get previous value
      const existing = await Progress.findOne({
        userId: user._id,
        sectionId,
        topicId: topicId || null,
      });

      if (type === 'checkbox') {
        const wasChecked = existing?.checked || false;
        const nowChecked = checked || false;

        if (nowChecked && !wasChecked) {
          const label = topicId ? (topicMap.get(topicId) || topicId) : sectionId;
          delta.topicsCompleted.push(label);
          if (topicId) delta.topicsCompletedIds.push({ topicId, sectionId });
        } else if (!nowChecked && wasChecked) {
          const label = topicId ? (topicMap.get(topicId) || topicId) : sectionId;
          delta.topicsUnchecked.push(label);
        }
      } else if (type === 'lecture') {
        const prevLectures = existing?.lecturesDone || 0;
        const newLectures = lecturesDone || 0;

        if (newLectures !== prevLectures) {
          const section = sectionMap.get(sectionId);
          delta.lectureDeltas.push({
            section: section?.title || sectionId,
            from: prevLectures,
            to: newLectures,
            total: section?.lectures?.total || 0,
          });
        }
      }

      // Upsert progress
      await Progress.findOneAndUpdate(
        { userId: user._id, sectionId, topicId: topicId || null },
        {
          userId: user._id,
          groupId,
          sectionId,
          topicId: topicId || null,
          type,
          checked: type === 'checkbox' ? checked : null,
          lecturesDone: type === 'lecture' ? lecturesDone : null,
        },
        { upsert: true, new: true }
      );
    }

    // Update streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDate = user.lastProgressDate ? new Date(user.lastProgressDate) : null;
    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0);
    }

    if (!lastDate || lastDate.getTime() < today.getTime()) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastDate && lastDate.getTime() === yesterday.getTime()) {
        user.currentStreak += 1;
      } else if (!lastDate || lastDate.getTime() < yesterday.getTime()) {
        user.currentStreak = 1;
      }
      user.lastProgressDate = new Date();
      await user.save();
    }

    // Return 200 immediately
    res.json({ message: 'Progress updated', delta });

    // Async: AI + Telegram + Activity + Socket (don't await)
    const hasDelta = delta.topicsCompleted.length > 0 || delta.topicsUnchecked.length > 0 || delta.lectureDeltas.length > 0;

    if (hasDelta) {
      (async () => {
        try {
          // Check for section completion
          let completionMsg: string | null = null;
          const sectionsToCheck = new Set(updates.map((u: any) => u.sectionId));

          for (const sid of sectionsToCheck) {
            const section = sectionMap.get(sid);
            if (!section) continue;

            const topicCount = section.topics?.length || 0;
            const totalLectures = section.lectures?.total || 0;

            if (topicCount > 0) {
              const checkedTopics = await Progress.countDocuments({
                userId: user._id,
                sectionId: sid,
                type: 'checkbox',
                checked: true,
              });
              if (checkedTopics < topicCount) continue;
            }

            if (totalLectures > 0) {
              const lectureProgress = await Progress.findOne({
                userId: user._id,
                sectionId: sid,
                type: 'lecture',
                topicId: null,
              });
              if (!lectureProgress || (lectureProgress.lecturesDone || 0) < totalLectures) continue;
            }

            // Section is complete!
            completionMsg = generateCompletionMessage(user.name.split(' ')[0], section.title);
          }

          // Generate AI message
          const firstName = user.name.split(' ')[0];
          const aiMessage = completionMsg || await generateAIMessage(firstName, delta);

          user.aiMessageCount = (user.aiMessageCount || 0) + 1;
          await user.save();

          // Save activity
          const activity = await Activity.create({
            userId: user._id,
            groupId,
            userName: user.name,
            avatarColor: user.avatarColor,
            aiMessage,
            delta,
          });

          // Emit socket event
          emitNewActivity(groupId, {
            _id: activity._id,
            userName: activity.userName,
            avatarColor: activity.avatarColor,
            aiMessage: activity.aiMessage,
            delta: activity.delta,
            createdAt: activity.createdAt,
          });

          // Send Telegram message
          const group = await Group.findById(groupId);
          if (group?.telegramBotToken && group?.telegramChatId) {
            await sendTelegramMessage(group.telegramBotToken, group.telegramChatId, aiMessage);

            // 10% probability tagging message or every 5th message
            const shouldTag = (user.aiMessageCount % 5 === 0) || (Math.random() < 0.1);
            if (shouldTag && delta.topicsCompletedIds.length > 0) {
              const firstCompleted = delta.topicsCompletedIds[0];
              const label = topicMap.get(firstCompleted.topicId) || firstCompleted.topicId;

              const groupMembers = await User.find({ groupId });
              const completedProgresses = await Progress.find({
                 groupId,
                 sectionId: firstCompleted.sectionId,
                 topicId: firstCompleted.topicId,
                 type: 'checkbox',
                 checked: true
              });
              const completedUserIds = new Set(completedProgresses.map(p => p.userId.toString()));
              
              const incompleteUsers = groupMembers.filter(m => m._id.toString() !== user._id.toString() && !completedUserIds.has(m._id.toString()));

              if (incompleteUsers.length > 0) {
                 const tags = incompleteUsers.map(m => m.telegramUsername ? `@${m.telegramUsername}` : `@${m.name.replace(/\s+/g, '')}`).join(' ');
                 const tagMessage = `Hey ${tags}, ${user.name} just completed "<b>${label}</b>". Don't get left behind! 👀🔥`;
                 await sendTelegramMessage(group.telegramBotToken, group.telegramChatId, tagMessage);
              }
            }
          }
        } catch (err) {
          console.error('Async activity error:', err);
        }
      })();
    }
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

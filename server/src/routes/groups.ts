import { Router, Response } from 'express';
import { customAlphabet } from 'nanoid';
import multer from 'multer';
import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { Template } from '../models/Template.js';
import { Progress } from '../models/Progress.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Validate template JSON format
function validateTemplate(schema: any): string | null {
  if (!schema || typeof schema !== 'object') return 'Invalid JSON object';
  if (!schema.title || typeof schema.title !== 'string') return 'Missing or invalid "title"';
  if (!Array.isArray(schema.sections)) return 'Missing or invalid "sections" array';

  const ids = new Set<string>();
  for (const section of schema.sections) {
    if (!section.id || typeof section.id !== 'string') return 'Each section must have a string "id"';
    if (!section.title || typeof section.title !== 'string') return 'Each section must have a string "title"';
    if (ids.has(section.id)) return `Duplicate id: "${section.id}"`;
    ids.add(section.id);

    if (section.topics) {
      if (!Array.isArray(section.topics)) return `Section "${section.id}": topics must be an array`;
      for (const topic of section.topics) {
        if (!topic.id || typeof topic.id !== 'string') return `Section "${section.id}": each topic must have a string "id"`;
        if (!topic.label || typeof topic.label !== 'string') return `Section "${section.id}": each topic must have a string "label"`;
        if (ids.has(topic.id)) return `Duplicate id: "${topic.id}"`;
        ids.add(topic.id);
      }
    }

    if (section.lectures) {
      if (Array.isArray(section.lectures)) {
        for (const lecture of section.lectures) {
          if (!lecture.id || typeof lecture.id !== 'string') return `Section "${section.id}": each lecture must have a string "id"`;
          if (!lecture.label || typeof lecture.label !== 'string') return `Section "${section.id}": each lecture must have a string "label"`;
          if (typeof lecture.total !== 'number' || lecture.total < 1) return `Section "${section.id}": lecture.total must be a positive number`;
          if (ids.has(lecture.id)) return `Duplicate id: "${lecture.id}"`;
          ids.add(lecture.id);
        }
      } else {
        if (typeof section.lectures !== 'object') return `Section "${section.id}": lectures must be an object or array`;
        if (!section.lectures.label || typeof section.lectures.label !== 'string') return `Section "${section.id}": lectures must have a "label"`;
        if (typeof section.lectures.total !== 'number' || section.lectures.total < 1) return `Section "${section.id}": lectures.total must be a positive number`;
      }
    }
  }

  return null;
}

// POST /api/groups/create
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const user = req.user!;
    if (user.groupId) return res.status(400).json({ error: 'You are already in a group' });

    const groupId = nanoid();
    const group = await Group.create({
      _id: groupId,
      name: name.trim(),
      adminId: user._id,
    });

    user.groupId = group._id;
    await user.save();

    res.status(201).json({
      _id: group._id,
      name: group.name,
      adminId: group.adminId,
      createdAt: group.createdAt,
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/join
router.post('/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ error: 'Group code is required' });

    const user = req.user!;
    if (user.groupId) return res.status(400).json({ error: 'You are already in a group' });

    const group = await Group.findById(groupId.toUpperCase());
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Check member count
    const memberCount = await User.countDocuments({ groupId: group._id });
    if (memberCount >= 5) return res.status(400).json({ error: 'Group is full (max 5 members)' });

    user.groupId = group._id;
    await user.save();

    res.json({
      _id: group._id,
      name: group.name,
      adminId: group.adminId,
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const members = await User.find({ groupId: group._id }).select('name email avatarColor currentStreak');

    res.json({
      _id: group._id,
      name: group.name,
      adminId: group.adminId,
      telegramBotToken: group.telegramBotToken ? '••••••' + group.telegramBotToken.slice(-6) : '',
      telegramChatId: group.telegramChatId,
      createdAt: group.createdAt,
      members,
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/template
router.post('/:id/template', authMiddleware, upload.single('template'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    let schema: any;
    if (req.file) {
      schema = JSON.parse(req.file.buffer.toString('utf-8'));
    } else if (req.body.schema) {
      schema = typeof req.body.schema === 'string' ? JSON.parse(req.body.schema) : req.body.schema;
    } else {
      return res.status(400).json({ error: 'No template file or schema provided' });
    }

    const validationError = validateTemplate(schema);
    if (validationError) return res.status(400).json({ error: validationError });

    await Template.findOneAndUpdate(
      { groupId: group._id },
      { schema },
      { upsert: true, new: true }
    );

    res.json({ message: 'Template uploaded successfully', schema });
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON file' });
    }
    console.error('Upload template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups/:id/template
router.get('/:id/template', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const template = await Template.findOne({ groupId: req.params.id });
    if (!template) return res.status(404).json({ error: 'No template found' });

    res.json({ schema: template.schema });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/groups/:id/settings
router.put('/:id/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.adminId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only the group admin can update settings' });
    }

    const { name, telegramBotToken, telegramChatId } = req.body;
    if (name) group.name = name.trim();
    if (telegramBotToken !== undefined) group.telegramBotToken = telegramBotToken;
    if (telegramChatId !== undefined) group.telegramChatId = telegramChatId;

    await group.save();
    res.json({ message: 'Settings updated', group: { _id: group._id, name: group.name } });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

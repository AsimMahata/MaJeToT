import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { useProgress } from '@/hooks/useProgress';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toaster';
import { getInitials } from '@/lib/utils';
import { ArrowLeft, Check, Minus, Plus, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TemplateSection {
  id: string;
  title: string;
  color: string;
  topics?: Array<{ id: string; label: string }>;
  lectures?: { label: string; total: number };
}

interface GroupMember {
  _id: string;
  name: string;
  avatarColor: string;
}

export default function SectionPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myProgress, groupProgress, fetchMyProgress, fetchGroupProgress } = useProgressStore();
  const { queueUpdate, isSaving } = useProgress();

  const [section, setSection] = useState<TemplateSection | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.groupId) return;

    const load = async () => {
      try {
        const [templateRes, groupRes] = await Promise.all([
          api.get(`/groups/${user.groupId}/template`),
          api.get(`/groups/${user.groupId}`),
        ]);

        const template = templateRes.data.schema;
        const found = template.sections.find((s: TemplateSection) => s.id === sectionId);
        if (found) setSection(found);

        setMembers(groupRes.data.members.filter((m: GroupMember) => m._id !== user._id));

        await fetchMyProgress();
        await fetchGroupProgress(user.groupId);
      } catch (err) {
        console.error('Failed to load section:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [sectionId, user?.groupId]);

  // Check if topic is completed by current user
  const isTopicChecked = (topicId: string) => {
    return myProgress.some(p => p.sectionId === sectionId && p.topicId === topicId && p.checked);
  };

  // Get current lecture count
  const lecturesDone = useMemo(() => {
    const lp = myProgress.find(p => p.sectionId === sectionId && p.type === 'lecture' && !p.topicId);
    return lp?.lecturesDone || 0;
  }, [myProgress, sectionId]);

  // Get members who completed a topic
  const getMembersWhoCompletedTopic = (topicId: string) => {
    return members.filter(m =>
      groupProgress.some(p => p.userId === m._id && p.sectionId === sectionId && p.topicId === topicId && p.checked)
    );
  };

  // Get other members' lecture counts
  const memberLectureCounts = useMemo(() => {
    return members.map(m => {
      const lp = groupProgress.find(p => p.userId === m._id && p.sectionId === sectionId && p.type === 'lecture' && !p.topicId);
      return { ...m, lecturesDone: lp?.lecturesDone || 0 };
    });
  }, [members, groupProgress, sectionId]);

  // Section progress
  const sectionProgress = useMemo(() => {
    if (!section) return 0;
    let total = 0, completed = 0;

    if (section.topics) {
      total += section.topics.length;
      completed += section.topics.filter(t => isTopicChecked(t.id)).length;
    }
    if (section.lectures) {
      total += section.lectures.total;
      completed += lecturesDone;
    }
    return total > 0 ? (completed / total) * 100 : 0;
  }, [section, myProgress, lecturesDone]);

  // Handle topic toggle
  const toggleTopic = (topicId: string) => {
    const isChecked = isTopicChecked(topicId);
    queueUpdate({
      sectionId: sectionId!,
      topicId,
      type: 'checkbox',
      checked: !isChecked,
    });

    // Check for section completion
    if (!isChecked && section?.topics) {
      const otherTopicsChecked = section.topics
        .filter(t => t.id !== topicId)
        .every(t => isTopicChecked(t.id));

      const lecturesComplete = !section.lectures || lecturesDone >= section.lectures.total;

      if (otherTopicsChecked && lecturesComplete) {
        setTimeout(() => {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          toast({ title: '🎉 Section Complete!', description: `You completed ${section.title}!`, variant: 'success' });
        }, 300);
      }
    }
  };

  // Handle lecture change
  const changeLectures = (delta: number) => {
    const newVal = Math.max(0, Math.min(lecturesDone + delta, section?.lectures?.total || 0));
    queueUpdate({
      sectionId: sectionId!,
      type: 'lecture',
      lecturesDone: newVal,
    });

    // Check for section completion
    if (section?.lectures && newVal >= section.lectures.total) {
      const topicsComplete = !section.topics || section.topics.every(t => isTopicChecked(t.id));
      if (topicsComplete) {
        setTimeout(() => {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          toast({ title: '🎉 Section Complete!', description: `You completed ${section.title}!`, variant: 'success' });
        }, 300);
      }
    }
  };

  const setLectures = (val: number) => {
    const newVal = Math.max(0, Math.min(val, section?.lectures?.total || 0));
    queueUpdate({
      sectionId: sectionId!,
      type: 'lecture',
      lecturesDone: newVal,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Section not found</p>
      </div>
    );
  }

  const totalTopics = section.topics?.length || 0;
  const completedTopics = section.topics?.filter(t => isTopicChecked(t.id)).length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
              <h1 className="font-bold text-lg">{section.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <span className="text-sm font-bold" style={{ color: section.color }}>
              {Math.round(sectionProgress)}%
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress overview */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Section Progress</span>
              <span className="text-sm font-bold" style={{ color: section.color }}>
                {Math.round(sectionProgress)}%
              </span>
            </div>
            <Progress value={sectionProgress} indicatorColor={section.color} className="h-3" />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue={section.topics ? "topics" : "lectures"}>
          <TabsList className="mb-6">
            {section.topics && <TabsTrigger value="topics">Topics ({completedTopics}/{totalTopics})</TabsTrigger>}
            {section.lectures && <TabsTrigger value="lectures">Lectures ({lecturesDone}/{section.lectures.total})</TabsTrigger>}
          </TabsList>

          {/* Topics tab */}
          {section.topics && (
            <TabsContent value="topics" className="space-y-2">
              {section.topics.map((topic) => {
                const checked = isTopicChecked(topic.id);
                const completedBy = getMembersWhoCompletedTopic(topic.id);

                return (
                  <div
                    key={topic.id}
                    className={`group flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent/30 ${checked ? 'bg-accent/20' : ''}`}
                    onClick={() => toggleTopic(topic.id)}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        checked
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30 group-hover:border-primary/50'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm transition-all ${checked ? 'line-through opacity-50' : ''}`}>
                        {topic.label}
                      </p>
                      {completedBy.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          {completedBy.map(m => (
                            <div
                              key={m._id}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-semibold"
                              style={{ backgroundColor: m.avatarColor }}
                              title={m.name}
                            >
                              {getInitials(m.name)}
                            </div>
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {completedBy.length === 1 ? `${completedBy[0].name} too` : `+${completedBy.length} others`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          )}

          {/* Lectures tab */}
          {section.lectures && (
            <TabsContent value="lectures">
              <Card>
                <CardContent className="p-8 text-center space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{section.lectures.label}</h3>
                    <p className="text-muted-foreground text-sm">Track your lecture progress</p>
                  </div>

                  {/* Big counter */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-12 h-12 rounded-full text-lg"
                      onClick={() => changeLectures(-1)}
                      disabled={lecturesDone <= 0}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>

                    <div className="text-center">
                      <input
                        type="number"
                        value={lecturesDone}
                        onChange={(e) => setLectures(parseInt(e.target.value) || 0)}
                        className="w-20 text-center text-4xl font-bold bg-transparent border-b-2 border-primary outline-none"
                        min={0}
                        max={section.lectures.total}
                      />
                      <p className="text-muted-foreground text-sm mt-1">
                        of {section.lectures.total} lectures
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="w-12 h-12 rounded-full text-lg"
                      onClick={() => changeLectures(1)}
                      disabled={lecturesDone >= section.lectures.total}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  <Progress
                    value={(lecturesDone / section.lectures.total) * 100}
                    indicatorColor={section.color}
                    className="h-4"
                  />

                  {/* Quick add buttons */}
                  <div className="flex items-center justify-center gap-2">
                    {[5, 10, 20].map(n => (
                      <Button
                        key={n}
                        variant="secondary"
                        size="sm"
                        onClick={() => changeLectures(n)}
                        disabled={lecturesDone + n > section.lectures!.total}
                      >
                        +{n}
                      </Button>
                    ))}
                  </div>

                  {/* Other members' progress */}
                  {memberLectureCounts.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-3 text-muted-foreground">Group progress</h4>
                      <div className="space-y-2">
                        {memberLectureCounts.map(m => (
                          <div key={m._id} className="flex items-center gap-3">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-semibold shrink-0"
                              style={{ backgroundColor: m.avatarColor }}
                            >
                              {getInitials(m.name)}
                            </div>
                            <div className="flex-1">
                              <Progress
                                value={(m.lecturesDone / section.lectures!.total) * 100}
                                className="h-1.5"
                                indicatorColor={m.avatarColor}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {m.lecturesDone}/{section.lectures!.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

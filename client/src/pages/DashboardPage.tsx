import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { useSocket } from '@/hooks/useSocket';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import SectionCard from '@/components/SectionCard';
import MemberCard from '@/components/MemberCard';
import ActivityFeed from '@/components/ActivityFeed';
import { getInitials } from '@/lib/utils';
import { BookOpen, Settings, LogOut, Download, Flame, Users, Activity } from 'lucide-react';

interface TemplateSection {
  id: string;
  title: string;
  color: string;
  topics?: Array<{ id: string; label: string }>;
  lectures?: Array<{ id?: string | null; label: string; total: number }> | { label: string; total: number };
}

interface TemplateSchema {
  title: string;
  sections: TemplateSection[];
}

interface Member {
  _id: string;
  name: string;
  email: string;
  avatarColor: string;
  currentStreak: number;
}

interface ActivityEntry {
  _id: string;
  userName: string;
  avatarColor: string;
  aiMessage: string;
  delta: any;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const { myProgress, groupProgress, fetchMyProgress, fetchGroupProgress } = useProgressStore();
  const navigate = useNavigate();
  const socketRef = useSocket(user?.groupId);

  const [template, setTemplate] = useState<TemplateSchema | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.groupId) {
      navigate('/group');
      return;
    }

    const load = async () => {
      try {
        const [templateRes, groupRes, activityRes] = await Promise.all([
          api.get(`/groups/${user.groupId}/template`).catch(() => null),
          api.get(`/groups/${user.groupId}`),
          api.get(`/activity/group/${user.groupId}?limit=20`),
        ]);

        if (templateRes?.data?.schema) setTemplate(templateRes.data.schema);
        setMembers(groupRes.data.members || []);
        setActivities(activityRes.data || []);

        await fetchMyProgress();
        await fetchGroupProgress(user!.groupId!);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?.groupId]);

  // Socket.io for live activity
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handler = (activity: ActivityEntry) => {
      setActivities(prev => [activity, ...prev].slice(0, 30));
    };

    socket.on('new-activity', handler);
    return () => { socket.off('new-activity', handler); };
  }, [socketRef.current]);

  // Helper to get array format of lectures
  const getLecturesList = (section: TemplateSection) => {
    return Array.isArray(section.lectures) ? section.lectures : (section.lectures ? [{ id: null, ...section.lectures }] : []);
  };

  // Compute per-section stats for current user
  const sectionStats = useMemo(() => {
    if (!template) return {};
    const stats: Record<string, { topicsCompleted: number; lecturesDone: number; totalLectures: number }> = {};

    for (const section of template.sections) {
      const topicsCompleted = section.topics
        ? myProgress.filter(p => p.sectionId === section.id && p.type === 'checkbox' && p.checked).length
        : 0;
      
      let lecturesDone = 0;
      let totalLectures = 0;
      const lecturesList = getLecturesList(section);
      
      for (const l of lecturesList) {
        totalLectures += l.total;
        const lp = myProgress.find(p => p.sectionId === section.id && p.type === 'lecture' && (l.id ? p.topicId === l.id : !p.topicId));
        lecturesDone += lp?.lecturesDone || 0;
      }

      stats[section.id] = { topicsCompleted, lecturesDone, totalLectures };
    }
    return stats;
  }, [template, myProgress]);

  // Overall progress
  const overallProgress = useMemo(() => {
    if (!template) return 0;
    let totalItems = 0;
    let completedItems = 0;

    for (const section of template.sections) {
      const stats = sectionStats[section.id];
      if (!stats) continue;

      if (section.topics) {
        totalItems += section.topics.length;
        completedItems += stats.topicsCompleted;
      }
      
      totalItems += stats.totalLectures;
      completedItems += stats.lecturesDone;
    }

    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  }, [template, sectionStats]);

  // Compute member progress percentages
  const memberProgress = useMemo(() => {
    if (!template) return {};
    const result: Record<string, number> = {};

    for (const member of members) {
      let total = 0;
      let completed = 0;
      for (const section of template.sections) {
        if (section.topics) {
          total += section.topics.length;
          completed += groupProgress.filter(
            p => p.userId === member._id && p.sectionId === section.id && p.type === 'checkbox' && p.checked
          ).length;
        }
        
        const lecturesList = getLecturesList(section);
        for (const l of lecturesList) {
           total += l.total;
           const lp = groupProgress.find(p => p.userId === member._id && p.sectionId === section.id && p.type === 'lecture' && (l.id ? p.topicId === l.id : !p.topicId));
           completed += lp?.lecturesDone || 0;
        }
      }
      result[member._id] = total > 0 ? (completed / total) * 100 : 0;
    }
    return result;
  }, [template, members, groupProgress]);

  // Member section-by-section detail for modal
  const getMemberSectionStats = (memberId: string) => {
    if (!template) return [];
    return template.sections.map(section => {
      const topicsCompleted = section.topics
        ? groupProgress.filter(p => p.userId === memberId && p.sectionId === section.id && p.type === 'checkbox' && p.checked).length
        : 0;
        
      let lecturesDone = 0;
      let totalLectures = 0;
      const lecturesList = getLecturesList(section);
      for (const l of lecturesList) {
         totalLectures += l.total;
         const lp = groupProgress.find(p => p.userId === memberId && p.sectionId === section.id && p.type === 'lecture' && (l.id ? p.topicId === l.id : !p.topicId));
         lecturesDone += lp?.lecturesDone || 0;
      }
      
      return {
        ...section,
        topicsCompleted,
        totalTopics: section.topics?.length || 0,
        lecturesDone,
        totalLectures,
      };
    });
  };

  // Export progress as markdown
  const exportProgress = () => {
    if (!template) return;
    let md = `# ${template.title}\n\n`;
    md += `*Exported on ${new Date().toLocaleDateString()}*\n\n`;

    for (const section of template.sections) {
      md += `## ${section.title}\n\n`;
      const stats = sectionStats[section.id];

      if (section.topics) {
        md += `### Topics (${stats?.topicsCompleted || 0}/${section.topics.length})\n\n`;
        for (const topic of section.topics) {
          const isChecked = myProgress.some(p => p.sectionId === section.id && p.topicId === topic.id && p.checked);
          md += `- [${isChecked ? 'x' : ' '}] ${topic.label}\n`;
        }
        md += '\n';
      }

      const lecturesList = getLecturesList(section);
      for (const l of lecturesList) {
         const lp = myProgress.find(p => p.sectionId === section.id && p.type === 'lecture' && (l.id ? p.topicId === l.id : !p.topicId));
         const done = lp?.lecturesDone || 0;
         md += `### ${l.label} (${done}/${l.total})\n\n`;
      }
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.title.replace(/\s+/g, '_')}_progress.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">MaJeToT</span>
          </div>

          <div className="flex items-center gap-3">
            {user && user.currentStreak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 text-sm font-medium">
                <Flame className="w-4 h-4" />
                {user.currentStreak}
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={exportProgress} title="Export progress">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title="Settings">
              <Settings className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 ml-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                style={{ backgroundColor: user?.avatarColor }}
              >
                {user ? getInitials(user.name) : '?'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/'); }} title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!template ? (
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-lg text-muted-foreground mb-4">No curriculum template uploaded yet</p>
              <Button onClick={() => navigate('/settings')}>Upload Template</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column: Your Progress + Sections */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overall progress */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">{template.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">Your overall progress</p>
                    </div>
                    <span className="text-3xl font-bold text-primary">{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </CardContent>
              </Card>

              {/* Section cards grid */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Sections
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {template.sections.map(section => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      topicsCompleted={sectionStats[section.id]?.topicsCompleted || 0}
                      lecturesDone={sectionStats[section.id]?.lecturesDone || 0}
                      totalLectures={sectionStats[section.id]?.totalLectures || 0}
                    />
                  ))}
                </div>
              </div>

              {/* Group Members */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Group Members
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map(member => (
                    <MemberCard
                      key={member._id}
                      member={member}
                      progressPct={memberProgress[member._id] || 0}
                      onClick={() => setSelectedMember(member)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: Activity Feed */}
            <div>
              <Card className="sticky top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Activity Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityFeed activities={activities} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Member detail modal */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => { if (!open) setSelectedMember(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedMember && (
                <>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: selectedMember.avatarColor }}
                  >
                    {getInitials(selectedMember.name)}
                  </div>
                  <div>
                    <div>{selectedMember.name}</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      {Math.round(memberProgress[selectedMember._id] || 0)}% overall
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">Detailed progress for this member</DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4 mt-2">
              {getMemberSectionStats(selectedMember._id).map(section => (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />
                    <span className="font-medium text-sm">{section.title}</span>
                  </div>
                  {section.totalTopics > 0 && (
                    <div className="ml-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Topics</span>
                        <span>{section.topicsCompleted}/{section.totalTopics}</span>
                      </div>
                      <Progress value={(section.topicsCompleted / section.totalTopics) * 100} className="h-1.5" indicatorColor={section.color} />
                    </div>
                  )}
                  {section.totalLectures > 0 && (
                    <div className="ml-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Lectures</span>
                        <span>{section.lecturesDone}/{section.totalLectures}</span>
                      </div>
                      <Progress value={(section.lecturesDone / section.totalLectures) * 100} className="h-1.5" indicatorColor={section.color} />
                    </div>
                  )}
                  <Separator className="mt-2" />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

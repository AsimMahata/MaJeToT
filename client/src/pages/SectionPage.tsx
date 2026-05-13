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
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { getInitials } from '@/lib/utils';
import { ArrowLeft, Check, Minus, Plus, Loader2, Edit2, Save, X, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TemplateSection {
  id: string;
  title: string;
  color: string;
  topics?: Array<{ id: string; label: string }>;
  lectures?: any;
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

  const [schema, setSchema] = useState<any>(null);
  const [section, setSection] = useState<TemplateSection | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [groupAdminId, setGroupAdminId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editSection, setEditSection] = useState<TemplateSection | null>(null);
  const [topicInsertIndex, setTopicInsertIndex] = useState('');
  const [lectureInsertIndex, setLectureInsertIndex] = useState('');

  useEffect(() => {
    if (!user?.groupId) return;

    const load = async () => {
      try {
        const [templateRes, groupRes] = await Promise.all([
          api.get(`/groups/${user.groupId}/template`),
          api.get(`/groups/${user.groupId}`),
        ]);

        const template = templateRes.data.schema;
        setSchema(template);
        const found = template.sections.find((s: TemplateSection) => s.id === sectionId);
        if (found) setSection(found);

        setMembers(groupRes.data.members.filter((m: GroupMember) => m._id !== user._id));
        setGroupAdminId(groupRes.data.adminId);

        await fetchMyProgress();
        await fetchGroupProgress(user!.groupId!);
      } catch (err) {
        console.error('Failed to load section:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [sectionId, user?.groupId]);

  const isTopicChecked = (topicId: string) => {
    return myProgress.some(p => p.sectionId === sectionId && p.topicId === topicId && p.checked);
  };

  const getLectureProgress = (lectureId: string | null) => {
    const lp = myProgress.find(p => p.sectionId === sectionId && p.type === 'lecture' && (p.topicId === lectureId || (!p.topicId && !lectureId)));
    return lp?.lecturesDone || 0;
  };

  const getMembersWhoCompletedTopic = (topicId: string) => {
    return members.filter(m =>
      groupProgress.some(p => p.userId === m._id && p.sectionId === sectionId && p.topicId === topicId && p.checked)
    );
  };

  const getMemberLectureProgress = (memberId: string, lectureId: string | null) => {
    const lp = groupProgress.find(p => p.userId === memberId && p.sectionId === sectionId && p.type === 'lecture' && (p.topicId === lectureId || (!p.topicId && !lectureId)));
    return lp?.lecturesDone || 0;
  };

  const sectionProgress = useMemo(() => {
    if (!section) return 0;
    let total = 0, completed = 0;

    if (section.topics) {
      total += section.topics.length;
      completed += section.topics.filter(t => isTopicChecked(t.id)).length;
    }
    
    let lecturesList = Array.isArray(section.lectures) ? section.lectures : (section.lectures ? [{ id: null, ...section.lectures }] : []);
    for (const l of lecturesList) {
      total += l.total;
      completed += getLectureProgress(l.id);
    }
    
    return total > 0 ? (completed / total) * 100 : 0;
  }, [section, myProgress]);

  const checkSectionCompletion = () => {
    if (!section) return;
    
    let allTopicsChecked = true;
    if (section.topics) {
      allTopicsChecked = section.topics.every(t => isTopicChecked(t.id));
    }
    
    let allLecturesDone = true;
    let lecturesList = Array.isArray(section.lectures) ? section.lectures : (section.lectures ? [{ id: null, ...section.lectures }] : []);
    for (const l of lecturesList) {
      if (getLectureProgress(l.id) < l.total) {
        allLecturesDone = false;
        break;
      }
    }
    
    if (allTopicsChecked && allLecturesDone) {
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        toast({ title: '🎉 Section Complete!', description: `You completed ${section.title}!`, variant: 'success' });
      }, 300);
    }
  };

  const toggleTopic = (topicId: string) => {
    const isChecked = isTopicChecked(topicId);
    queueUpdate({
      sectionId: sectionId!,
      topicId,
      type: 'checkbox',
      checked: !isChecked,
    });
  };

  const changeLectures = (lectureId: string | null, delta: number, max: number) => {
    const current = getLectureProgress(lectureId);
    const newVal = Math.max(0, Math.min(current + delta, max));
    queueUpdate({
      sectionId: sectionId!,
      type: 'lecture',
      topicId: lectureId,
      lecturesDone: newVal,
    });
  };

  const setLecturesVal = (lectureId: string | null, val: number, max: number) => {
    const newVal = Math.max(0, Math.min(val, max));
    queueUpdate({
      sectionId: sectionId!,
      type: 'lecture',
      topicId: lectureId,
      lecturesDone: newVal,
    });
  };

  const startEdit = () => {
    let lectures = section?.lectures;
    if (lectures && !Array.isArray(lectures)) {
      lectures = [{ id: `lecture-${Date.now()}`, label: lectures.label, total: lectures.total }];
    } else if (!lectures) {
      lectures = [];
    }
    setEditSection({ ...section, lectures } as any);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      if (!editSection) return;
      setIsLoading(true);
      const newSchema = { ...schema };
      const secIndex = newSchema.sections.findIndex((s: any) => s.id === sectionId);
      if (secIndex !== -1) {
        newSchema.sections[secIndex] = editSection;
      }
      
      await api.post(`/groups/${user?.groupId}/template`, { schema: newSchema });
      setSchema(newSchema);
      setSection(editSection);
      setIsEditing(false);
      toast({ title: 'Success', description: 'Section updated successfully' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to update section', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const moveItem = (array: any[], index: number, direction: 'up' | 'down') => {
    const newArray = [...array];
    if (direction === 'up' && index > 0) {
      [newArray[index - 1], newArray[index]] = [newArray[index], newArray[index - 1]];
    } else if (direction === 'down' && index < newArray.length - 1) {
      [newArray[index + 1], newArray[index]] = [newArray[index], newArray[index + 1]];
    }
    return newArray;
  };

  if (isLoading && !isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!section && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Section not found</p>
      </div>
    );
  }

  const totalTopics = section?.topics?.length || 0;
  const completedTopics = section?.topics?.filter(t => isTopicChecked(t.id)).length || 0;
  let lecturesList = Array.isArray(section?.lectures) ? section.lectures : (section?.lectures ? [{ id: null, ...section.lectures }] : []);
  const totalLectures = lecturesList.reduce((acc, l) => acc + l.total, 0);
  const completedLectures = lecturesList.reduce((acc, l) => acc + getLectureProgress(l.id), 0);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
               if (isEditing) setIsEditing(false);
               else navigate('/dashboard');
            }}>
              {isEditing ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section?.color || '#fff' }} />
              <h1 className="font-bold text-lg">{isEditing ? 'Editing Section' : section?.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button size="sm" onClick={handleSave} disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Save
              </Button>
            ) : (
              <>
                  <Button variant="ghost" size="sm" onClick={startEdit}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <span className="text-sm font-bold" style={{ color: section?.color || '#fff' }}>
                  {Math.round(sectionProgress)}%
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {isEditing ? (
          <Card>
            <CardContent className="p-6 space-y-8">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">Section Details</h3>
                <Input 
                  value={editSection?.title} 
                  onChange={e => setEditSection({...editSection!, title: e.target.value})}
                  className="text-lg font-medium"
                />
              </div>

              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">Topics</h3>
                <div className="space-y-3">
                  {editSection?.topics?.map((t, idx) => (
                    <div key={t.id} className="flex gap-2 items-center bg-accent/10 p-2 rounded-md border border-accent/20">
                       <div className="flex flex-col gap-0.5">
                         <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === 0} onClick={() => setEditSection({...editSection!, topics: moveItem(editSection!.topics!, idx, 'up')})}>
                           <ChevronUp className="w-4 h-4" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === editSection!.topics!.length - 1} onClick={() => setEditSection({...editSection!, topics: moveItem(editSection!.topics!, idx, 'down')})}>
                           <ChevronDown className="w-4 h-4" />
                         </Button>
                       </div>
                       <span className="font-mono text-xs text-muted-foreground w-4 text-center">{idx + 1}.</span>
                       <Input 
                          value={t.label} 
                          onChange={(e) => {
                             const nt = [...editSection.topics!];
                             nt[idx].label = e.target.value;
                             setEditSection({...editSection!, topics: nt});
                          }} 
                       />
                       <Button size="icon" variant="ghost" onClick={() => {
                          const nt = editSection.topics!.filter((_, i) => i !== idx);
                          setEditSection({...editSection!, topics: nt});
                       }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <div className="flex gap-2 items-center mt-2">
                    <Input 
                      type="number" 
                      placeholder="Pos (eg. 1)" 
                      className="w-28" 
                      value={topicInsertIndex}
                      onChange={e => setTopicInsertIndex(e.target.value)}
                    />
                    <Button variant="outline" size="sm" onClick={() => {
                      const nt = [...(editSection?.topics || [])];
                      const pos = parseInt(topicInsertIndex);
                      const newItem = { id: `topic-${Date.now()}`, label: 'New Topic' };
                      if (!isNaN(pos) && pos > 0 && pos <= nt.length) {
                        nt.splice(pos - 1, 0, newItem);
                      } else {
                        nt.push(newItem);
                      }
                      setEditSection({...editSection!, topics: nt});
                      setTopicInsertIndex('');
                    }}>
                      <Plus className="w-4 h-4 mr-2" /> Add Topic
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">Lectures / Playlists</h3>
                <div className="space-y-3">
                  {(editSection?.lectures || []).map((l: any, idx: number) => (
                    <div key={l.id} className="flex gap-2 items-center bg-accent/10 p-2 rounded-md border border-accent/20">
                       <div className="flex flex-col gap-0.5">
                         <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === 0} onClick={() => setEditSection({...editSection!, lectures: moveItem(editSection!.lectures!, idx, 'up')})}>
                           <ChevronUp className="w-4 h-4" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === editSection!.lectures!.length - 1} onClick={() => setEditSection({...editSection!, lectures: moveItem(editSection!.lectures!, idx, 'down')})}>
                           <ChevronDown className="w-4 h-4" />
                         </Button>
                       </div>
                       <span className="font-mono text-xs text-muted-foreground w-4 text-center">{idx + 1}.</span>
                       <Input 
                          placeholder="Playlist Name"
                          value={l.label} 
                          onChange={(e) => {
                             const nl = [...editSection!.lectures];
                             nl[idx].label = e.target.value;
                             setEditSection({...editSection!, lectures: nl});
                          }} 
                          className="flex-1"
                       />
                       <Input 
                          type="number" 
                          className="w-20"
                          value={l.total} 
                          min={1}
                          onChange={(e) => {
                             const nl = [...editSection!.lectures];
                             nl[idx].total = parseInt(e.target.value) || 1;
                             setEditSection({...editSection!, lectures: nl});
                          }} 
                       />
                       <Button size="icon" variant="ghost" onClick={() => {
                          const nl = editSection!.lectures.filter((_: any, i: number) => i !== idx);
                          setEditSection({...editSection!, lectures: nl});
                       }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <div className="flex gap-2 items-center mt-2">
                    <Input 
                      type="number" 
                      placeholder="Pos (eg. 1)" 
                      className="w-28" 
                      value={lectureInsertIndex}
                      onChange={e => setLectureInsertIndex(e.target.value)}
                    />
                    <Button variant="outline" size="sm" onClick={() => {
                      const nl = [...(editSection?.lectures || [])];
                      const pos = parseInt(lectureInsertIndex);
                      const newItem = { id: `lecture-${Date.now()}`, label: 'New Playlist', total: 10 };
                      if (!isNaN(pos) && pos > 0 && pos <= nl.length) {
                        nl.splice(pos - 1, 0, newItem);
                      } else {
                        nl.push(newItem);
                      }
                      setEditSection({...editSection!, lectures: nl});
                      setLectureInsertIndex('');
                    }}>
                      <Plus className="w-4 h-4 mr-2" /> Add Playlist
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Section Progress</span>
                  <span className="text-sm font-bold" style={{ color: section?.color }}>
                    {Math.round(sectionProgress)}%
                  </span>
                </div>
                <Progress value={sectionProgress} indicatorColor={section?.color} className="h-3" />
              </CardContent>
            </Card>

            <Tabs defaultValue={section?.topics?.length ? "topics" : "lectures"}>
              <TabsList className="mb-6">
                {(section?.topics && section.topics.length > 0) && <TabsTrigger value="topics">Topics ({completedTopics}/{totalTopics})</TabsTrigger>}
                {lecturesList.length > 0 && <TabsTrigger value="lectures">Lectures ({completedLectures}/{totalLectures})</TabsTrigger>}
              </TabsList>

              {section?.topics && section.topics.length > 0 && (
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

              {lecturesList.length > 0 && (
                <TabsContent value="lectures" className="space-y-6">
                  {lecturesList.map((lecture: any, idx: number) => {
                    const currentDone = getLectureProgress(lecture.id);
                    return (
                      <Card key={lecture.id || idx}>
                        <CardContent className="p-6 sm:p-8 text-center space-y-6">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{lecture.label}</h3>
                            <p className="text-muted-foreground text-sm">Track your progress</p>
                          </div>

                          <div className="flex items-center justify-center gap-4">
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-12 h-12 rounded-full text-lg shrink-0"
                              onClick={() => changeLectures(lecture.id, -1, lecture.total)}
                              disabled={currentDone <= 0}
                            >
                              <Minus className="w-5 h-5" />
                            </Button>

                            <div className="text-center">
                              <input
                                type="number"
                                value={currentDone}
                                onChange={(e) => setLecturesVal(lecture.id, parseInt(e.target.value) || 0, lecture.total)}
                                className="w-20 text-center text-4xl font-bold bg-transparent border-b-2 border-primary outline-none"
                                min={0}
                                max={lecture.total}
                              />
                              <p className="text-muted-foreground text-sm mt-1">
                                of {lecture.total} lectures
                              </p>
                            </div>

                            <Button
                              variant="outline"
                              size="icon"
                              className="w-12 h-12 rounded-full text-lg shrink-0"
                              onClick={() => changeLectures(lecture.id, 1, lecture.total)}
                              disabled={currentDone >= lecture.total}
                            >
                              <Plus className="w-5 h-5" />
                            </Button>
                          </div>

                          <Progress
                            value={(currentDone / lecture.total) * 100}
                            indicatorColor={section?.color}
                            className="h-4"
                          />

                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {[5, 10, 20].map(n => (
                              <Button
                                key={n}
                                variant="secondary"
                                size="sm"
                                onClick={() => changeLectures(lecture.id, n, lecture.total)}
                                disabled={currentDone + n > lecture.total}
                              >
                                +{n}
                              </Button>
                            ))}
                          </div>

                          {members.length > 0 && (
                            <div className="pt-6 border-t text-left mt-6">
                              <h4 className="text-sm font-medium mb-4 text-muted-foreground">Group progress</h4>
                              <div className="space-y-3">
                                {members.map(m => {
                                  const mDone = getMemberLectureProgress(m._id, lecture.id);
                                  return (
                                    <div key={m._id} className="flex items-center gap-3">
                                      <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-semibold shrink-0 shadow-sm"
                                        style={{ backgroundColor: m.avatarColor }}
                                      >
                                        {getInitials(m.name)}
                                      </div>
                                      <div className="flex-1">
                                        <Progress
                                          value={(mDone / lecture.total) * 100}
                                          className="h-2"
                                          indicatorColor={m.avatarColor}
                                        />
                                      </div>
                                      <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                                        {mDone}/{lecture.total}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

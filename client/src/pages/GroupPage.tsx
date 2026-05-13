import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toaster';
import { BookOpen, Copy, Upload, CheckCircle2, AlertCircle, FileJson } from 'lucide-react';

export default function GroupPage() {
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [templateUploaded, setTemplateUploaded] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();
  const { fetchMe } = useAuthStore();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.post('/groups/create', { name: groupName });
      setCreatedCode(data._id);
      await fetchMe();
      toast({ title: 'Group created!', description: `Share code: ${data._id}`, variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to create group', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/groups/join', { groupId: joinCode.toUpperCase() });
      await fetchMe();
      toast({ title: 'Joined group!', variant: 'success' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to join group', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setTemplateError('');
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Basic client-side validation
      if (!json.title || !Array.isArray(json.sections)) {
        setTemplateError('JSON must have "title" (string) and "sections" (array)');
        return;
      }

      const formData = new FormData();
      formData.append('template', file);

      const user = useAuthStore.getState().user;
      await api.post(`/groups/${user?.groupId}/template`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTemplateUploaded(true);
      toast({ title: 'Template uploaded!', description: `${json.sections.length} sections loaded`, variant: 'success' });
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setTemplateError('Invalid JSON file');
      } else {
        setTemplateError(err.response?.data?.error || 'Upload failed');
      }
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdCode);
    toast({ title: 'Copied!', description: 'Group code copied to clipboard' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">MaJeToT</h1>
        </div>

        <Card className="border shadow-2xl shadow-black/5 dark:shadow-black/30">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Set Up Your Group</CardTitle>
            <CardDescription>Create a new group or join an existing one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create">Create Group</TabsTrigger>
                <TabsTrigger value="join">Join Group</TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-6">
                {!createdCode ? (
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block" htmlFor="group-name">Group Name</label>
                      <Input
                        id="group-name"
                        placeholder="e.g. Placement Warriors 2025"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Group'}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    {/* Generated code */}
                    <div className="text-center space-y-3">
                      <p className="text-sm text-muted-foreground">Your group code:</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="font-mono text-3xl font-bold tracking-[0.3em] bg-secondary px-6 py-3 rounded-lg">
                          {createdCode}
                        </div>
                        <Button variant="outline" size="icon" onClick={copyCode}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Share this code with your friends to join</p>
                    </div>

                    {/* Template upload */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium block">Upload Curriculum Template</label>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`
                          relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
                          ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                          ${templateUploaded ? 'border-green-500 bg-green-500/5' : ''}
                        `}
                        onClick={() => document.getElementById('template-file')?.click()}
                      >
                        <input
                          id="template-file"
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        {templateUploaded ? (
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                            <p className="text-sm font-medium text-green-500">Template uploaded successfully!</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <FileJson className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-sm font-medium">Drop your JSON file here</p>
                            <p className="text-xs text-muted-foreground">or click to browse</p>
                          </div>
                        )}
                      </div>

                      {templateError && (
                        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{templateError}</span>
                        </div>
                      )}
                    </div>

                    <Button onClick={() => navigate('/dashboard')} className="w-full" variant={templateUploaded ? 'default' : 'outline'}>
                      {templateUploaded ? 'Go to Dashboard →' : 'Skip for now'}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="join">
                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block" htmlFor="join-code">Group Code</label>
                    <Input
                      id="join-code"
                      placeholder="e.g. AB12CD"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="font-mono text-center text-lg tracking-[0.3em] uppercase"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Ask your group admin for the 6-character code
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || joinCode.length < 6}>
                    {isLoading ? 'Joining...' : 'Join Group'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

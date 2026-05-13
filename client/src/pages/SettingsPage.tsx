import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toaster';
import { getInitials } from '@/lib/utils';
import { ArrowLeft, BookOpen, Save, Upload, AlertTriangle, FileJson, CheckCircle2, ExternalLink, Copy } from 'lucide-react';

interface Member {
  _id: string;
  name: string;
  email: string;
  avatarColor: string;
  currentStreak: number;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templateUploaded, setTemplateUploaded] = useState(false);
  const [templateError, setTemplateError] = useState('');

  const [userName, setUserName] = useState(user?.name || '');
  const [telegramUsername, setTelegramUsername] = useState(user?.telegramUsername || user?.name || '');
  const { setUser } = useAuthStore();

  useEffect(() => {
    if (!user?.groupId) return;

    const load = async () => {
      try {
        const { data } = await api.get(`/groups/${user.groupId}`);
        setGroupName(data.name);
        setGroupCode(data._id);
        setTelegramToken('');
        setTelegramChatId(data.telegramChatId || '');
        setMembers(data.members || []);
        setIsAdmin(data.adminId === user._id);
      } catch (err) {
        console.error('Failed to load group:', err);
      }
    };

    load();
  }, [user?.groupId]);

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const { data } = await api.put('/auth/profile', { name: userName, telegramUsername });
      setUser({ ...user!, ...data });
      toast({ title: 'Profile saved!', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to save profile', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.groupId) return;
    setIsSaving(true);
    try {
      const payload: any = { name: groupName };
      if (telegramToken) payload.telegramBotToken = telegramToken;
      if (telegramChatId) payload.telegramChatId = telegramChatId;

      await api.put(`/groups/${user.groupId}/settings`, payload);
      toast({ title: 'Settings saved!', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to save settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateUpload = useCallback(async (file: File) => {
    setTemplateError('');
    setTemplateUploaded(false);
    try {
      const text = await file.text();
      JSON.parse(text); // validate JSON

      const formData = new FormData();
      formData.append('template', file);

      await api.post(`/groups/${user?.groupId}/template`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTemplateUploaded(true);
      toast({ title: 'Template updated!', variant: 'success' });
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setTemplateError('Invalid JSON file');
      } else {
        setTemplateError(err.response?.data?.error || 'Upload failed');
      }
    }
  }, [user?.groupId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Profile</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block" htmlFor="profile-name">Name</label>
              <Input
                id="profile-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block" htmlFor="profile-tg">Telegram Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="profile-tg"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ''))}
                  className="pl-8"
                />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={isSaving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Group Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Group Information</CardTitle>
            <CardDescription>Manage your group settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block" htmlFor="settings-group-name">Group Name</label>
              <Input
                id="settings-group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Group Code</label>
              <div className="flex items-center gap-2">
                <div className="font-mono text-lg font-bold tracking-[0.2em] bg-secondary px-4 py-2 rounded-md">
                  {groupCode}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(groupCode);
                    toast({ title: 'Copied!' });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Setup */}
        <Card>
            <CardHeader>
              <CardTitle className="text-base">Telegram Integration</CardTitle>
              <CardDescription>Get AI-powered updates in your Telegram group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Message <strong>@BotFather</strong> on Telegram → create a new bot → copy the token</li>
                  <li>Add the bot to your group chat</li>
                  <li>Send a message in the group, then visit:
                    <code className="block bg-background px-2 py-1 rounded mt-1 text-xs break-all">
                      https://api.telegram.org/bot{'<TOKEN>'}/getUpdates
                    </code>
                  </li>
                  <li>Find the <code className="bg-background px-1 rounded">chat.id</code> in the response</li>
                  <li>Paste both below and save</li>
                </ol>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" htmlFor="tg-token">Bot Token</label>
                <Input
                  id="tg-token"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  type="password"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" htmlFor="tg-chatid">Chat ID</label>
                <Input
                  id="tg-chatid"
                  placeholder="-1001234567890"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
              </div>

              <Button onClick={saveSettings} disabled={isSaving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>

        {/* Re-upload template */}
        <Card>
            <CardHeader>
              <CardTitle className="text-base">Curriculum Template</CardTitle>
              <CardDescription>Re-upload the curriculum JSON template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Warning: Re-uploading may affect existing progress tracking</span>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors ${
                  templateUploaded ? 'border-green-500 bg-green-500/5' : 'border-border'
                }`}
                onClick={() => document.getElementById('settings-template-file')?.click()}
              >
                <input
                  id="settings-template-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTemplateUpload(file);
                  }}
                />
                {templateUploaded ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <p className="text-sm text-green-500">Template updated!</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileJson className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm">Click to upload new template</p>
                  </div>
                )}
              </div>

              {templateError && (
                <p className="text-sm text-red-500">{templateError}</p>
              )}
            </CardContent>
          </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members ({members.length}/5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map(member => (
                <div key={member._id} className="flex items-center gap-3 p-2">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

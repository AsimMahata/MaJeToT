import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Users, Zap, TrendingUp } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, signup, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
      const user = useAuthStore.getState().user;
      if (user?.groupId) {
        navigate('/dashboard');
      } else {
        navigate('/group');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <BookOpen className="w-7 h-7" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">MaJeToT</h1>
          </div>
          
          <p className="text-xl text-white/80 mb-12 leading-relaxed max-w-md">
            Track your placement prep with friends. Stay motivated, stay accountable, get placed together.
          </p>

          <div className="space-y-6">
            {[
              { icon: Users, label: 'Group accountability with 2-5 friends' },
              { icon: Zap, label: 'AI-powered motivational updates' },
              { icon: TrendingUp, label: 'Track topics, lectures & streaks' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-white/90 text-lg">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-16 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#6366f1', '#ec4899', '#10b981', '#f97316'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="text-white/60 text-sm">Join hundreds preparing together</span>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">MaJeToT</h1>
          </div>

          <Card className="border-0 shadow-2xl shadow-black/5 dark:shadow-black/30">
            <CardContent className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight">
                  {isLogin ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {isLogin
                    ? 'Enter your credentials to continue'
                    : 'Start tracking your placement prep'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="text-sm font-medium mb-2 block" htmlFor="auth-name">Full Name</label>
                    <Input
                      id="auth-name"
                      placeholder="Arjun Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-2 block" htmlFor="auth-email">Email</label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="arjun@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" htmlFor="auth-password">Password</label>
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Please wait...</span>
                    </div>
                  ) : isLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <span className="text-primary font-medium">
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

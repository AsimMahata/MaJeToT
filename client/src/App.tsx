import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from '@/components/ui/toaster';
import AuthPage from '@/pages/AuthPage';
import GroupPage from '@/pages/GroupPage';
import DashboardPage from '@/pages/DashboardPage';
import SectionPage from '@/pages/SectionPage';
import SettingsPage from '@/pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (token && user?.groupId) return <Navigate to="/dashboard" replace />;
  if (token && !user?.groupId) return <Navigate to="/group" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="dark">
        <Routes>
          <Route path="/" element={<AuthRoute><AuthPage /></AuthRoute>} />
          <Route path="/group" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/section/:sectionId" element={<ProtectedRoute><SectionPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

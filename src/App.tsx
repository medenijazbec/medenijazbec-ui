import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Keep the alias-based imports; the alias is configured below.
import Home from '@/components/pages/Home/Home';
import Projects from '@/components/pages/Projects/Projects';
import AnimGroupsPage from './components/admin/AnimGroups';
import VGRegister from './components/auth/VGRegister/VGRegister';
import VSLogin from './components/auth/VSLogin/VSLogin';

// super-simple auth stub — replace with real logic later
function useAuth() {
  const token = localStorage.getItem('hb_token');
  const roles = (localStorage.getItem('hb_roles') ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return { isAuthed: !!token, roles };
}

function RequireAuth(props: { children: React.ReactNode; role?: string }) {
  const { isAuthed, roles } = useAuth();
  if (!isAuthed) return <Navigate to="/" replace />;
  if (props.role && !roles.includes(props.role)) return <Navigate to="/" replace />;
  return <>{props.children}</>;
}

export default function App() {
  useEffect(() => {
    // global effects or app init can go here
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Make /projects public so it doesn't bounce back to / */}
        <Route path="/projects" element={<Projects />} />
        <Route path="/vg" element={<VGRegister />} />
        <Route path="/vs" element={<VSLogin />} />
        {/* Keep admin-only area protected */}
        <Route
          path="/admin/animgroups"
          element={
            <RequireAuth role="Admin">
              <AnimGroupsPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

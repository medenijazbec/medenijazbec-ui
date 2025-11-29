import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "@/components/auth/AuthContext";

import Home from "@/components/pages/Home/Home";
import Projects from "@/components/pages/Projects/Projects";
import AnimGroupsPage from "@/components/admin/AdminAnimGroups/AnimGroups";
import VGRegister from "@/components/auth/VGRegister/VGRegister";
import VSLogin from "@/components/auth/VSLogin/VSLogin";
import AdminShowcase from "@/components/admin/AdminShowcase/AdminShowcase";
import ProjectsAdmin from "./components/admin/ProjectsAdmin/ProjectsAdmin";
import AboutPage from "@/components/pages/About/About";
import AdminFitness from "@/components/admin/AdminFitness/AdminFitness";
import FitnessPage from "@/components/pages/Fitness/Fitness";
import AdminMarket from "./components/admin/AdminMarket/AdminMarket";
import AdminCandleTrading from "./components/admin/AdminCandleTrading/AdminCandleTrading";
import LiveTradingPage from "@/components/pages/LiveTrading/LiveTradingPage";

function RequireAuth(props: { children: React.ReactNode; role?: string }) {
  const { isAuthed, roles } = useAuth();
  if (!isAuthed) return <Navigate to="/" replace />;
  if (props.role && !roles.includes(props.role)) return <Navigate to="/" replace />;
  return <>{props.children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Public */}
          <Route path="/projects" element={<Projects />} />
          {/* public/user-visible fitness page */}
          <Route path="/fitness" element={<FitnessPage />} />
          <Route path="/vg" element={<VGRegister />} />
          <Route path="/vs" element={<VSLogin />} />
           <Route path="/about" element={<AboutPage />} />  
          <Route
            path="/live-trading"
            element={
              <RequireAuth>
                <LiveTradingPage />
              </RequireAuth>
            }
          />
          {/* Admin-only */}
          <Route
            path="/admin"
            element={
              <RequireAuth role="Admin">
                <AdminShowcase />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/market"
            element={
              <RequireAuth role="Admin">
                <AdminMarket />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/candle-trading"
            element={
              <RequireAuth role="Admin">
                <AdminCandleTrading />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/showcase"
            element={
              <RequireAuth role="Admin">
                <AdminShowcase />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/projects"
            element={
              <RequireAuth role="Admin">
                <ProjectsAdmin />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/animgroups"
            element={
              <RequireAuth role="Admin">
                <AnimGroupsPage />
              </RequireAuth>
            }
          />
          {/* admin fitness page */}
          <Route
            path="/admin/fitness"
            element={
              <RequireAuth role="Admin">
                <AdminFitness />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

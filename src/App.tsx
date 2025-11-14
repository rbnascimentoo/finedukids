import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { autoCreditOnAppOpen } from "./services/autoAllowance";
import { getCurrentUser } from "./services/auth";

import AcceptInvite from "./pages/auth/AcceptInvite";
import AuthCallback from "./pages/auth/AuthCallback";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Reset from "./pages/auth/Reset";
import UpdatePassword from "./pages/auth/UpdatePassword";

import ChildDashboard from "./pages/child/ChildDashboard";
import ChildLearn from "./pages/child/Learn";
import ChildRewards from "./pages/child/Rewards";
import ChildSettings from "./pages/child/Settings";
import LessonDetail from "./pages/child/LessonDetail";

import NotFound from "./pages/NotFound";

import ParentDashboard from "./pages/parent/ParentDashboard";
import KidDetail from "./pages/parent/KidDetail";
import ParentKids from "./pages/parent/Kids";
import ParentProgress from "./pages/parent/Progress";
import ParentSettings from "./pages/parent/Settings";

import ProtectedRoute from "./router/ProtectedRoute";
import Splash from "./pages/Splash";

export default function App() {
  useEffect(() => {
    // tenta rodar assim que a app abre (ou quando a aba recarrega)
    const user = getCurrentUser();
    if (user?.role !== "parent") return;

    let alive = true;
    autoCreditOnAppOpen(user.id)
      .then((qty) => {
        if (!alive || qty <= 0) return;
        // opcional: feedback não intrusivo
        console.log(`Mesada automática aplicada para ${qty} criança(s).`);
      })
      .catch(() => {
        /* silencioso */
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/invite" element={<AcceptInvite />} />

      {/* Responsável (protegido) */}
      <Route
        path="/parent"
        element={
          <ProtectedRoute>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/kids"
        element={
          <ProtectedRoute>
            <ParentKids />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/kids/:id"
        element={
          <ProtectedRoute>
            <KidDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/progress"
        element={
          <ProtectedRoute>
            <ParentProgress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/settings"
        element={
          <ProtectedRoute>
            <ParentSettings />
          </ProtectedRoute>
        }
      />

      {/* Criança (protegido) */}
      <Route
        path="/child"
        element={
          <ProtectedRoute>
            <ChildDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/child/learn"
        element={
          <ProtectedRoute>
            <ChildLearn />
          </ProtectedRoute>
        }
      />
      <Route
        path="/child/learn/:slug"
        element={
          <ProtectedRoute>
            <LessonDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/child/rewards"
        element={
          <ProtectedRoute>
            <ChildRewards />
          </ProtectedRoute>
        }
      />
      <Route
        path="/child/settings"
        element={
          <ProtectedRoute>
            <ChildSettings />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

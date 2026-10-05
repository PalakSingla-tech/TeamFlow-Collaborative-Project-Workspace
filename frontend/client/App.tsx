import { createRoot } from "react-dom/client";
import "./global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AuthPage from "@/pages/AuthPage";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/NotFound";
import ProjectBoardPage from "@/pages/ProjectBoardPage";
import ProjectsPage from "@/pages/ProjectsPage";
import UserDashboardPage from "@/pages/UserDashboardPage";
import { RealtimeNotificationProvider } from "@/lib/realtime-notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <RealtimeNotificationProvider>
          <Toaster richColors position="top-right" closeButton />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId"
              element={
                <ProtectedRoute>
                  <ProjectBoardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/dashboard"
              element={
                <ProtectedRoute>
                  <ProjectBoardPage defaultTab="dashboard" />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RealtimeNotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Meetings from "./pages/Meetings";
import Expenses from "./pages/Expenses";
import Sales from "./pages/Sales";
import Library from "./pages/Library";
import Notices from "./pages/Notices";
import CalendarPage from "./pages/CalendarPage";
import TeamManagement from "./pages/TeamManagement";
import Approvals from "./pages/Approvals";
import Manual from "./pages/Manual";
import Surveys from "./pages/Surveys";
import PublicVote from "./pages/PublicVote";
import DesignReviews from "./pages/DesignReviews";
import MyProjects from "./pages/MyProjects";
import MyPosts from "./pages/MyPosts";
import Mentions from "./pages/Mentions";
import Drafts from "./pages/Drafts";
import ProjectFolders from "./pages/ProjectFolders";
import Auth from "./pages/Auth";
import LaunchDashboard from "./pages/LaunchDashboard";
import DailyWorkReport from "./pages/DailyWorkReport";
import Attendance from "./pages/Attendance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/vote/:token" element={<PublicVote />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/products" element={<Products />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/design-reviews" element={<DesignReviews />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/library" element={<Library />} />
                <Route path="/notices" element={<Notices />} />
                <Route path="/notices-board" element={<Notices />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/manual" element={<Manual />} />
                <Route path="/surveys" element={<Surveys />} />
                <Route path="/team" element={<TeamManagement />} />
                <Route path="/my-projects" element={<MyProjects />} />
                <Route path="/my-posts" element={<MyPosts />} />
                <Route path="/mentions" element={<Mentions />} />
                <Route path="/drafts" element={<Drafts />} />
                <Route path="/project-folders" element={<ProjectFolders />} />
                <Route path="/launch" element={<LaunchDashboard />} />
                <Route path="/daily-report" element={<DailyWorkReport />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

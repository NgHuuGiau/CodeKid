import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AuthProvider, PreferencesProvider, useAuth } from "./context";
import Layout from "./Layout";
import { About, Courses, Landing, Leaderboard } from "./pages/Public";
import { AuthPage } from "./pages/Auth";
import {
  ChallengeList,
  Profile,
  RoadmapPage,
  StudentDashboard,
} from "./pages/Student";
import { LessonPage, SubmissionPage } from "./pages/Learning";
import Manage from "./pages/Manage";
import { Button, Card, State } from "./components/ui";
import type { ReactNode } from "react";
import "./styles.css";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
function Guard({
  children,
  staff = false,
}: {
  children: ReactNode;
  staff?: boolean;
}) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading || error)
    return (
      <div className="container page">
        <State loading={loading} error={error} retry={() => void refresh()} />
      </div>
    );
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (staff && !user.roles.some((r) => ["Teacher", "Admin"].includes(r)))
    return (
      <div className="container page">
        <State error="Khu vực này dành cho giáo viên và quản trị viên." />
      </div>
    );
  return children;
}
function RoadmapRoute() {
  const { id } = useParams();
  return <RoadmapPage id={id!} />;
}
function LessonRoute() {
  const { id, mode } = useParams();
  return <LessonPage id={id!} mode={mode} />;
}
function ResultRoute() {
  const { id } = useParams();
  return <SubmissionPage id={id!} />;
}
function NotFound() {
  return (
    <div className="container page">
      <Card className="center-card">
        <h1>Trang này chưa có trên bản đồ.</h1>
        <p>Quay lại hành trình của bạn nhé.</p>
        <Button asChild>
          <Link to="/">Về trang chủ</Link>
        </Button>
      </Card>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <PreferencesProvider>
          <AuthProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Landing />} />
                <Route path="about" element={<About />} />
                <Route path="privacy" element={<About privacy />} />
                <Route path="courses" element={<Courses />} />
                <Route path="languages" element={<Courses languages />} />
                <Route path="courses/:id" element={<RoadmapRoute />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                {(
                  ["login", "register", "forgot", "reset", "verify"] as const
                ).map((m) => (
                  <Route key={m} path={m} element={<AuthPage mode={m} />} />
                ))}
                <Route
                  path="dashboard"
                  element={
                    <Guard>
                      <StudentDashboard />
                    </Guard>
                  }
                />
                <Route
                  path="achievements"
                  element={
                    <Guard>
                      <StudentDashboard badgesOnly />
                    </Guard>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <Guard>
                      <Profile />
                    </Guard>
                  }
                />
                <Route path="settings" element={<Profile settingsOnly />} />
                <Route path="challenges" element={<ChallengeList />} />
                <Route
                  path="lessons/:id"
                  element={
                    <Guard>
                      <LessonRoute />
                    </Guard>
                  }
                />
                <Route
                  path="lessons/:id/practice/:mode"
                  element={
                    <Guard>
                      <LessonRoute />
                    </Guard>
                  }
                />
                <Route
                  path="results/:id"
                  element={
                    <Guard>
                      <ResultRoute />
                    </Guard>
                  }
                />
                <Route
                  path="manage/*"
                  element={
                    <Guard staff>
                      <Manage />
                    </Guard>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AuthProvider>
        </PreferencesProvider>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);

import { Component, Suspense, lazy, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteChangeIndicator } from "@/components/RouteChangeIndicator";
import { GlobalActivityIndicator } from "@/components/GlobalActivityIndicator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/DataContext";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireRole } from "@/components/RequireRole";
import { Loader2 } from "lucide-react";

const CHUNK_RELOAD_STORAGE_KEY = "chunk-load-retry";

const lazyWithRetry = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  moduleKey: string,
) =>
  lazy(async () => {
    try {
      const module = await importFn();
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(`${CHUNK_RELOAD_STORAGE_KEY}:${moduleKey}`);
      }
      return module;
    } catch (error) {
      if (typeof window !== "undefined") {
        const storageKey = `${CHUNK_RELOAD_STORAGE_KEY}:${moduleKey}`;
        const hasReloaded = window.sessionStorage.getItem(storageKey);
        if (!hasReloaded) {
          window.sessionStorage.setItem(storageKey, "true");
          window.location.reload();
        }
      }
      throw error;
    }
  });

const Home = lazyWithRetry(() => import("./pages/Home"), "Home");
const Login = lazyWithRetry(() => import("./pages/Login"), "Login");
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"), "AdminDashboard");
const PlayerDashboard = lazyWithRetry(() => import("./pages/PlayerDashboard"), "PlayerDashboard");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "NotFound");
const MatchCenter = lazyWithRetry(() => import("./pages/MatchCenter"), "MatchCenter");
const LeaderboardsPage = lazyWithRetry(() => import("./pages/LeaderboardsPage"), "LeaderboardsPage");
const MatchPage = lazyWithRetry(() => import("./pages/MatchPage"), "MatchPage");
const PlayerPage = lazyWithRetry(() => import("./pages/PlayerPage"), "PlayerPage");
const TournamentPage = lazyWithRetry(() => import("./pages/TournamentPage"), "TournamentPage");
const VerifyScorelist = lazyWithRetry(() => import("./pages/VerifyScorelist"), "VerifyScorelist");
const ManagementPage = lazyWithRetry(() => import("./pages/ManagementPage"), "ManagementPage");
const AdminBackups = lazyWithRetry(() => import("./pages/AdminBackups"), "AdminBackups");
const AdminManagement = lazyWithRetry(() => import("./pages/AdminManagement"), "AdminManagement");
const AdminScorelistsPage = lazyWithRetry(() => import("./pages/AdminScorelistsPage"), "AdminScorelistsPage");
const LiveMatchPage = lazyWithRetry(() => import("./pages/LiveMatchPage"), "LiveMatchPage");
const SeasonsOverviewPage = lazyWithRetry(() => import("./pages/SeasonsOverviewPage"), "SeasonsOverviewPage");
const TournamentHonorsPage = lazyWithRetry(() => import("./pages/TournamentHonorsPage"), "TournamentHonorsPage");
const NewsRoomPage = lazyWithRetry(() => import("./pages/NewsRoomPage"), "NewsRoomPage");
const DocumentsPortalPage = lazyWithRetry(() => import("./pages/DocumentsPortalPage"), "DocumentsPortalPage");
const AdminWorkQueuePage = lazyWithRetry(() => import("./pages/AdminWorkQueuePage"), "AdminWorkQueuePage");
const TeamsDashboardPage = lazyWithRetry(() => import("./pages/TeamsDashboardPage"), "TeamsDashboardPage");
const VerificationPage = lazyWithRetry(() => import("./pages/VerificationPage"), "VerificationPage");
const FormsPortalPage = lazyWithRetry(() => import("./pages/FormsPortalPage"), "FormsPortalPage");
const AdminOpsCenter = lazyWithRetry(() => import("./pages/AdminOpsCenter"), "AdminOpsCenter");
const SchedulesPage = lazyWithRetry(() => import("./pages/SchedulesPage"), "SchedulesPage");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const RouteLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center px-4">
    <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-card px-6 py-4 text-sm font-semibold text-muted-foreground shadow-sm">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      Loading...
    </div>
  </div>
);

type RouteErrorBoundaryState = {
  hasError: boolean;
};

class RouteErrorBoundary extends Component<{ children: ReactNode }, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error("Route rendering failed", error, errorInfo);
  }

  private handleRetry = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md rounded-2xl border border-destructive/20 bg-card p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-foreground">We couldn't load this page</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A temporary update issue occurred while loading the app. Please retry.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Retry loading
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteChangeIndicator />
            <GlobalActivityIndicator />
            <RouteErrorBoundary>
              <Suspense fallback={<RouteLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin" element={<RequireRole allow={['admin']}><AdminDashboard /></RequireRole>} />
                  <Route path="/player" element={<PlayerDashboard />} />
                  <Route path="/admin/match-center" element={<RequireRole allow={['admin']}><MatchCenter /></RequireRole>} />
                  <Route path="/admin/backups" element={<RequireRole allow={['admin']}><AdminBackups /></RequireRole>} />
                  <Route path="/admin/scorelists" element={<RequireRole allow={['admin']}><AdminScorelistsPage /></RequireRole>} />
                  <Route path="/admin/management" element={<RequireRole allow={['admin']}><AdminManagement /></RequireRole>} />
                  <Route path="/admin/work-queue" element={<RequireRole allow={['admin']}><AdminWorkQueuePage /></RequireRole>} />
                  <Route path="/admin/ops-center" element={<RequireRole allow={['admin', 'management']}><AdminOpsCenter /></RequireRole>} />
                  <Route path="/leaderboards" element={<LeaderboardsPage />} />
                  <Route path="/match/:match_id" element={<MatchPage />} />
                  <Route path="/player/:player_id" element={<PlayerPage />} />
                  <Route path="/tournament/:id" element={<TournamentPage />} />
                  <Route path="/verify-scorelist/:id" element={<VerifyScorelist />} />
                  <Route path="/management" element={<RequireRole allow={['management', 'admin']}><ManagementPage /></RequireRole>} />
                  <Route path="/management/teams-dashboard" element={<RequireRole allow={['team', 'management', 'admin']}><TeamsDashboardPage /></RequireRole>} />
                  <Route path="/live" element={<LiveMatchPage />} />
                  <Route path="/seasons" element={<SeasonsOverviewPage />} />
                  <Route path="/schedules" element={<SchedulesPage />} />
                  <Route path="/hall-of-glory" element={<TournamentHonorsPage />} />
                  <Route path="/news-room" element={<RequireRole allow={['admin', 'management']}><NewsRoomPage /></RequireRole>} />
                  <Route path="/documents-portal" element={<RequireAuth><DocumentsPortalPage /></RequireAuth>} />
                  <Route path="/verify" element={<VerificationPage />} />
                  <Route path="/verify/:type/:id" element={<VerificationPage />} />
                  <Route path="/forms" element={<RequireAuth><FormsPortalPage /></RequireAuth>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </RouteErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

import { Suspense, lazy, type ComponentType } from "react";
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
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/player" element={<PlayerDashboard />} />
                <Route path="/admin/match-center" element={<MatchCenter />} />
                <Route path="/admin/backups" element={<AdminBackups />} />
                <Route path="/admin/scorelists" element={<AdminScorelistsPage />} />
                <Route path="/admin/management" element={<AdminManagement />} />
                <Route path="/admin/work-queue" element={<AdminWorkQueuePage />} />
                <Route path="/leaderboards" element={<LeaderboardsPage />} />
                <Route path="/match/:match_id" element={<MatchPage />} />
                <Route path="/player/:player_id" element={<PlayerPage />} />
                <Route path="/tournament/:id" element={<TournamentPage />} />
                <Route path="/verify-scorelist/:id" element={<VerifyScorelist />} />
                <Route path="/management" element={<ManagementPage />} />
                <Route path="/management/teams-dashboard" element={<RequireAuth><TeamsDashboardPage /></RequireAuth>} />
                <Route path="/live" element={<LiveMatchPage />} />
                <Route path="/seasons" element={<SeasonsOverviewPage />} />
                <Route path="/hall-of-glory" element={<TournamentHonorsPage />} />
                <Route path="/news-room" element={<RequireAuth><NewsRoomPage /></RequireAuth>} />
                <Route path="/documents-portal" element={<RequireAuth><DocumentsPortalPage /></RequireAuth>} />
                <Route path="/verify" element={<VerificationPage />} />
                <Route path="/verify/:type/:id" element={<VerificationPage />} />
                <Route path="/forms" element={<RequireAuth><FormsPortalPage /></RequireAuth>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

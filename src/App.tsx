import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteChangeIndicator } from "@/components/RouteChangeIndicator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/DataContext";
import { RequireAuth } from "@/components/RequireAuth";
import { Loader2 } from "lucide-react";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PlayerDashboard = lazy(() => import("./pages/PlayerDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MatchCenter = lazy(() => import("./pages/MatchCenter"));
const LeaderboardsPage = lazy(() => import("./pages/LeaderboardsPage"));
const MatchPage = lazy(() => import("./pages/MatchPage"));
const PlayerPage = lazy(() => import("./pages/PlayerPage"));
const TournamentPage = lazy(() => import("./pages/TournamentPage"));
const VerifyScorelist = lazy(() => import("./pages/VerifyScorelist"));
const ManagementPage = lazy(() => import("./pages/ManagementPage"));
const AdminBackups = lazy(() => import("./pages/AdminBackups"));
const AdminManagement = lazy(() => import("./pages/AdminManagement"));
const AdminScorelistsPage = lazy(() => import("./pages/AdminScorelistsPage"));
const LiveMatchPage = lazy(() => import("./pages/LiveMatchPage"));
const SeasonsOverviewPage = lazy(() => import("./pages/SeasonsOverviewPage"));
const TournamentHonorsPage = lazy(() => import("./pages/TournamentHonorsPage"));
const NewsRoomPage = lazy(() => import("./pages/NewsRoomPage"));
const DocumentsPortalPage = lazy(() => import("./pages/DocumentsPortalPage"));
const AdminWorkQueuePage = lazy(() => import("./pages/AdminWorkQueuePage"));
const TeamsDashboardPage = lazy(() => import("./pages/TeamsDashboardPage"));
const VerificationPage = lazy(() => import('./pages/VerificationPage'));
const FormsPortalPage = lazy(() => import('./pages/FormsPortalPage'));

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

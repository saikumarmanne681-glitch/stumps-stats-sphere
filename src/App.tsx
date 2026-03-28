import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteChangeIndicator } from "@/components/RouteChangeIndicator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/DataContext";
import { useAuth } from "@/lib/auth";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import PlayerDashboard from "./pages/PlayerDashboard";
import NotFound from "./pages/NotFound";
import MatchCenter from "./pages/MatchCenter";
import LeaderboardsPage from "./pages/LeaderboardsPage";
import MatchPage from "./pages/MatchPage";
import PlayerPage from "./pages/PlayerPage";
import TournamentPage from "./pages/TournamentPage";
import VerifyScorelist from "./pages/VerifyScorelist";
import ManagementPage from "./pages/ManagementPage";
import AdminBackups from "./pages/AdminBackups";
import AdminManagement from "./pages/AdminManagement";
import AdminScorelistsPage from "./pages/AdminScorelistsPage";
import LiveMatchPage from "./pages/LiveMatchPage";
import ElectionsPage from '@/elections/ElectionsPage';
import TournamentsHubPage from '@/tournaments/TournamentsHubPage';
import RegistrationTournamentPage from '@/tournaments/RegistrationTournamentPage';
import SeasonsOverviewPage from './pages/SeasonsOverviewPage';
import TournamentHonorsPage from './pages/TournamentHonorsPage';
import NewsRoomPage from './pages/NewsRoomPage';
import { RequireAuth } from '@/components/RequireAuth';
import DocumentsPortalPage from './pages/DocumentsPortalPage';
import { useEffect, useState } from "react";
import { v2api } from "@/lib/v2api";
import { ClosedAccessScreen } from "@/components/ClosedAccessScreen";

const queryClient = new QueryClient();

const FeatureAccessRoute = ({
  feature,
  title,
  backHref,
  children,
}: {
  feature: 'elections' | 'tournament_registration';
  title: string;
  backHref: string;
  children: JSX.Element;
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    v2api.getBoardConfiguration()
      .then((rows) => {
        if (cancelled) return;
        const config = rows[0];
        if (feature === 'elections') {
          setClosed(!!config?.elections_closed);
          setReason(config?.elections_closed_reason || '');
        } else {
          setClosed(!!config?.tournament_registration_closed);
          setReason(config?.tournament_registration_closed_reason || '');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feature]);

  if (loading) return null;
  if (closed && user?.type !== 'admin') {
    return (
      <ClosedAccessScreen
        title={title}
        reason={reason}
        backHref={backHref}
        homeHref="/"
      />
    );
  }
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteChangeIndicator />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/player" element={<PlayerDashboard />} />
            <Route path="/admin/match-center" element={<MatchCenter />} />
            <Route path="/admin/backups" element={<AdminBackups />} />
            <Route path="/admin/scorelists" element={<AdminScorelistsPage />} />
            <Route path="/admin/management" element={<AdminManagement />} />
            <Route path="/leaderboards" element={<LeaderboardsPage />} />
            <Route path="/match/:match_id" element={<MatchPage />} />
            <Route path="/player/:player_id" element={<PlayerPage />} />
            <Route path="/tournament/:id" element={<TournamentPage />} />
            <Route path="/verify-scorelist/:id" element={<VerifyScorelist />} />
            <Route path="/management" element={<ManagementPage />} />
            <Route path="/elections" element={<RequireAuth><FeatureAccessRoute feature="elections" title="Elections are currently closed" backHref="/"><ElectionsPage /></FeatureAccessRoute></RequireAuth>} />
            <Route path="/tournaments" element={<RequireAuth><TournamentsHubPage /></RequireAuth>} />
            <Route path="/tournaments/registration/:id" element={<RequireAuth><FeatureAccessRoute feature="tournament_registration" title="Tournament registration is currently closed" backHref="/tournaments"><RegistrationTournamentPage /></FeatureAccessRoute></RequireAuth>} />
            <Route path="/live" element={<LiveMatchPage />} />
            <Route path="/seasons" element={<SeasonsOverviewPage />} />
            <Route path="/hall-of-glory" element={<TournamentHonorsPage />} />
            <Route path="/news-room" element={<RequireAuth><NewsRoomPage /></RequireAuth>} />
            <Route path="/documents-portal" element={<RequireAuth><DocumentsPortalPage /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <EnvironmentBadge />
        </BrowserRouter>
      </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

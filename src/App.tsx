import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteChangeIndicator } from "@/components/RouteChangeIndicator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/DataContext";
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
import { RequireAuth } from '@/components/RequireAuth';

const queryClient = new QueryClient();

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
            <Route path="/elections" element={<RequireAuth><ElectionsPage /></RequireAuth>} />
            <Route path="/tournaments" element={<RequireAuth><TournamentsHubPage /></RequireAuth>} />
            <Route path="/tournaments/registration/:id" element={<RequireAuth><RegistrationTournamentPage /></RequireAuth>} />
            <Route path="/live" element={<LiveMatchPage />} />
            <Route path="/seasons" element={<SeasonsOverviewPage />} />
            <Route path="/hall-of-glory" element={<TournamentHonorsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

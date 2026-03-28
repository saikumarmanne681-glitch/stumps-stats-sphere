import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ClipboardList, MapPin } from 'lucide-react';
import { ApprovedSchedulePanel } from '@/schedules/ApprovedSchedulePanel';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tournamentService } from './tournamentService';
import { RegistrationRecord, TournamentRegistryRecord } from './types';
import { useAuth } from '@/lib/auth';
import { normalizeId } from '@/lib/dataUtils';
import { scheduleService } from '@/schedules/scheduleService';
import { v2api } from '@/lib/v2api';
import { ClosedAccessScreen } from '@/components/ClosedAccessScreen';

const RegistrationTournamentPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [registrationClosedReason, setRegistrationClosedReason] = useState('');
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    Promise.all([tournamentService.syncFromBackend(), scheduleService.syncFromBackend(), v2api.getBoardConfiguration()])
      .then(([, , boardRows]) => {
        const config = boardRows[0];
        setRegistrationClosed(!!config?.tournament_registration_closed);
        setRegistrationClosedReason(config?.tournament_registration_closed_reason || '');
      })
      .finally(() => {
        setRefreshKey((value) => value + 1);
        setAccessLoading(false);
      });
  }, []);

  const tournamentId = normalizeId(id);
  const tournaments = useMemo(() => tournamentService.getTournaments(), [refreshKey]);
  const registrations = useMemo(() => tournamentService.getRegistrations(), [refreshKey]);
  const tournament = tournaments.find((item) => normalizeId(item.tournament_id) === tournamentId) as TournamentRegistryRecord | undefined;

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <h1 className="font-display text-3xl font-bold">Registration page not found</h1>
          <Button asChild><Link to="/tournaments">Back to tournament registrations</Link></Button>
        </div>
      </div>
    );
  }

  const tournamentRegistrations = registrations.filter((item) => normalizeId(item.tournament_id) === tournamentId);
  const playerRegistrations = user ? tournamentRegistrations.filter((item) => item.submitted_by === (user.player_id || user.username)) : [];
  const groupedBySeason = tournamentRegistrations.reduce<Record<string, RegistrationRecord[]>>((acc, item) => {
    const key = `${item.season_id || 'NA'}::${item.season_year || 'Open'}`;
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  if (!user) return <Navigate to="/login" replace />;
  if (!accessLoading && registrationClosed && user.type !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <ClosedAccessScreen
            title="Tournament registration is currently closed"
            reason={registrationClosedReason}
            backHref="/tournaments"
            homeHref="/"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tournaments"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <Badge variant="outline">Custom registration page</Badge>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-display text-3xl font-bold">{tournament.name}</h1>
                <p className="text-muted-foreground mt-1">{tournament.format} registration campaign</p>
              </div>
              <Badge variant={tournament.status === 'open' ? 'default' : 'secondary'}>{tournament.status}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-lg border p-3"><Calendar className="h-4 w-4 mb-2 text-primary" />Season year: <strong>{tournament.season_year || 'Not linked'}</strong></div>
              <div className="rounded-lg border p-3"><MapPin className="h-4 w-4 mb-2 text-primary" />Venue: <strong>{tournament.venue || 'TBD'}</strong></div>
              <div className="rounded-lg border p-3"><ClipboardList className="h-4 w-4 mb-2 text-primary" />Deadline: <strong>{tournament.registration_deadline || 'Not set'}</strong></div>
            </div>
            <p className="text-sm text-muted-foreground">{tournament.notes || 'This registration page was created for a tournament that is not yet part of the main tournaments catalogue.'}</p>
          </CardContent>
        </Card>



        <ApprovedSchedulePanel tournamentId={tournament.tournament_id} />

        <Card>
          <CardHeader><CardTitle>{user.type === 'player' ? 'My registration status' : 'Registrations received'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(user.type === 'player' ? Object.entries(groupedBySeason).filter(([, items]) => items.some((item) => item.submitted_by === (user.player_id || user.username))) : Object.entries(groupedBySeason)).map(([key, items]) => {
              const visibleItems = user.type === 'player' ? items.filter((item) => item.submitted_by === (user.player_id || user.username)) : items;
              return (
                <div key={key} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold">Season {visibleItems[0]?.season_year || 'Open'}{visibleItems[0]?.season_id ? ` • ${visibleItems[0].season_id}` : ''}</p>
                    <Badge variant="outline">{visibleItems.length} registration(s)</Badge>
                  </div>
                  {visibleItems.map((registration) => (
                    <div key={registration.registration_id} className="rounded-md border bg-muted/20 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-medium">{registration.team_name}</span>
                        <Badge variant={registration.status === 'approved' ? 'default' : registration.status === 'rejected' ? 'destructive' : 'secondary'}>{registration.status}</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">Contact: {registration.contact_name} · {registration.contact_email}</p>
                      {!!registration.review_notes && <p className="mt-2 text-muted-foreground"><strong>Admin note:</strong> {registration.review_notes}</p>}
                    </div>
                  ))}
                </div>
              );
            })}
            {user.type === 'player' && playerRegistrations.length === 0 && <p className="text-sm text-muted-foreground">You have not submitted a registration for this tournament yet.</p>}
            {user.type !== 'player' && tournamentRegistrations.length === 0 && <p className="text-sm text-muted-foreground">No registrations submitted yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationTournamentPage;

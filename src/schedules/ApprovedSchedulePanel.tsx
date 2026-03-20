import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduleMatch } from './types';
import { scheduleService } from './scheduleService';
import { CalendarDays, Download, ShieldCheck } from 'lucide-react';

export function ApprovedSchedulePanel({ tournamentId, seasonId }: { tournamentId: string; seasonId?: string }) {
  const schedules = scheduleService.getApprovedSchedulesForTournament(tournamentId, seasonId);
  const latest = schedules[0];
  const approvals = latest ? scheduleService.getApprovals().filter((item) => item.schedule_id === latest.schedule_id && item.decision === 'approved') : [];
  const matches: ScheduleMatch[] = latest ? JSON.parse(latest.matches_json) : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="font-display flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Approved schedule</CardTitle>
          <p className="text-sm text-muted-foreground">Only approved schedule versions are visible to members, with season linkage shown when available.</p>
        </div>
        {latest && <Button size="sm" variant="outline" onClick={() => scheduleService.downloadPdf(latest.schedule_id)}><Download className="h-4 w-4" /> Download PDF</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {!latest && <p className="text-sm text-muted-foreground">No approved schedule has been published for this tournament yet.</p>}
        {latest && (
          <>
            <div className="flex gap-2 flex-wrap">
              <Badge>Version {latest.version_number}</Badge>
              <Badge variant="secondary">Approved</Badge>
              <Badge variant="outline"><ShieldCheck className="h-3.5 w-3.5" /> {latest.season_id ? `Season ${latest.season_label || latest.season_id}` : 'No season link'}</Badge>
              <Badge variant="outline">Hash {latest.hash.slice(0, 12)}…</Badge>
            </div>
            <div className="rounded-[1.3rem] border p-4 text-sm space-y-1 bg-white/70">
              <p><strong>Approved by:</strong> {approvals.map((item) => `${item.approver_name} (${item.approver_role})`).join(', ')}</p>
              <p><strong>Timestamp:</strong> {latest.timestamp}</p>
              <p><strong>Change log:</strong> {latest.change_log || 'No change log provided.'}</p>
            </div>
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.match_id} className="rounded-[1.25rem] border p-4 bg-white/70">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold">{match.team_a} vs {match.team_b}</p>
                    <Badge variant="outline">{match.stage}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{match.date} · {match.time} · {match.venue}</p>
                  {match.notes && <p className="mt-2 text-sm">{match.notes}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

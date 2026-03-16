import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/lib/DataContext';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { v2api } from '@/lib/v2api';
import { DigitalScorelist } from '@/lib/v2types';
import { generateMatchScorelist, verifyScorelist, exportScorelistAsJSON } from '@/lib/scorelist';
import { Loader2, FileJson, FileText, Shield, ShieldCheck, ShieldX, Download } from 'lucide-react';

export function AdminScorelists() {
  const { user } = useAuth();
  const { matches, batting, bowling, players, tournaments, seasons } = useData();
  const { toast } = useToast();
  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason?: string } | null>(null);
  const [viewScorelist, setViewScorelist] = useState<DigitalScorelist | null>(null);

  const refresh = async () => {
    const data = await v2api.getScorelists();
    setScorelists(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleGenerate = async () => {
    if (!selectedMatch) return;
    setGenerating(true);
    try {
      const match = matches.find(m => m.match_id === selectedMatch);
      if (!match) { toast({ title: 'Match not found', variant: 'destructive' }); return; }
      const tournament = tournaments.find(t => t.tournament_id === match.tournament_id);
      const season = seasons.find(s => s.season_id === match.season_id);
      const sl = await generateMatchScorelist(match, batting, bowling, players, tournament, season, user?.username || 'admin');
      toast({ title: '✅ Scorelist generated', description: sl.scorelist_id });
      refresh();
    } catch (err) {
      toast({ title: 'Error generating scorelist', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleVerify = async (sl: DigitalScorelist) => {
    const result = await verifyScorelist(sl);
    setVerifyResult(result);
    setViewScorelist(sl);
  };

  const handleDownloadJSON = (sl: DigitalScorelist) => {
    const json = exportScorelistAsJSON(sl);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sl.scorelist_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = (sl: DigitalScorelist) => {
    // Generate a printable HTML and trigger print
    const payload = JSON.parse(sl.payload_json);
    const html = `
      <html><head><title>Scorelist: ${sl.scorelist_id}</title>
      <style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}.header{text-align:center;margin-bottom:20px}.hash{font-size:10px;color:#666;word-break:break-all}</style>
      </head><body>
      <div class="header"><h1>🏏 Digital Scorelist</h1><p>ID: ${sl.scorelist_id}</p><p>Generated: ${sl.generated_at}</p></div>
      ${payload.match ? `<h2>${payload.match.team_a} vs ${payload.match.team_b}</h2><p>Date: ${payload.match.date} | Venue: ${payload.match.venue || 'N/A'}</p><p>Result: ${payload.match.result || 'N/A'}</p>` : ''}
      <h3>Batting</h3><table><tr><th>Player</th><th>Team</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th></tr>
      ${(payload.battingData || []).map((b: any) => `<tr><td>${payload.players?.find((p: any) => p.player_id === b.player_id)?.name || b.player_id}</td><td>${b.team}</td><td>${b.runs}</td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td></tr>`).join('')}
      </table>
      <h3>Bowling</h3><table><tr><th>Player</th><th>Team</th><th>Overs</th><th>Wickets</th><th>Runs</th><th>Economy</th></tr>
      ${(payload.bowlingData || []).map((b: any) => `<tr><td>${payload.players?.find((p: any) => p.player_id === b.player_id)?.name || b.player_id}</td><td>${b.team}</td><td>${b.overs}</td><td>${b.wickets}</td><td>${b.runs_conceded}</td><td>${b.economy}</td></tr>`).join('')}
      </table>
      <div class="hash"><p>Hash: ${sl.hash_digest}</p><p>Signature: ${sl.signature}</p></div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Generator */}
      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Shield className="h-5 w-5" /> Generate Scorelist</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                <SelectTrigger><SelectValue placeholder="Select Match" /></SelectTrigger>
                <SelectContent>
                  {matches.map(m => (
                    <SelectItem key={m.match_id} value={m.match_id}>
                      {m.team_a} vs {m.team_b} ({m.date ? new Date(m.date).toLocaleDateString() : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generating || !selectedMatch}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
              Generate Match Scorelist
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader><CardTitle className="font-display">📋 Generated Scorelists</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Generated By</TableHead>
                <TableHead>Generated At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scorelists.map(sl => {
                const match = matches.find(m => m.match_id === sl.match_id);
                return (
                  <TableRow key={sl.scorelist_id}>
                    <TableCell className="font-mono text-xs max-w-[150px] truncate">{sl.scorelist_id}</TableCell>
                    <TableCell><Badge variant="outline">{sl.scope_type}</Badge></TableCell>
                    <TableCell className="text-sm">{match ? `${match.team_a} vs ${match.team_b}` : sl.match_id}</TableCell>
                    <TableCell className="text-sm">{sl.generated_by}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sl.generated_at}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleVerify(sl)} title="Verify"><ShieldCheck className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadJSON(sl)} title="JSON"><FileJson className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(sl)} title="PDF"><FileText className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {scorelists.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No scorelists generated yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Verify dialog */}
      <Dialog open={!!viewScorelist} onOpenChange={open => { if (!open) { setViewScorelist(null); setVerifyResult(null); } }}>
        <DialogContent>
          {viewScorelist && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  {verifyResult?.valid ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldX className="h-5 w-5 text-destructive" />}
                  Verification Result
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className={`p-4 rounded-lg border ${verifyResult?.valid ? 'bg-green-50 border-green-200' : 'bg-destructive/5 border-destructive/20'}`}>
                  <p className="font-semibold">{verifyResult?.valid ? '✅ Document Verified — Integrity Intact' : '❌ Verification Failed'}</p>
                  {verifyResult?.reason && <p className="text-sm text-destructive mt-1">{verifyResult.reason}</p>}
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><strong>ID:</strong> {viewScorelist.scorelist_id}</p>
                  <p className="break-all"><strong>Hash:</strong> {viewScorelist.hash_digest}</p>
                  <p className="break-all"><strong>Signature:</strong> {viewScorelist.signature}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

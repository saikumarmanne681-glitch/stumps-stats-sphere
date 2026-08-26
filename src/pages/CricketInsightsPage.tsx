import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BarChart3, Crown, GitCompareArrows, MapPin, Swords, Trophy } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/lib/DataContext';
import { mvpRace, playerBadges, playerForm, seasonAwards, venueAndTossSummary } from '@/lib/cricketInsights';
import { formatDateInIST } from '@/lib/time';

type AwardEntry = { playerId: string; name: string; value: number; label: string } | undefined;

export default function CricketInsightsPage() {
  const { players, matches, batting, bowling, seasons } = useData();
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const playerOptions = players.filter((player) => player.status === 'active');
  const selectedFirst = first || playerOptions[0]?.player_id || '';
  const selectedSecond = second || playerOptions[1]?.player_id || '';
  const form = useMemo(() => playerForm(selectedFirst, batting, bowling, matches), [batting, bowling, matches, selectedFirst]);
  const compareForm = useMemo(() => playerForm(selectedSecond, batting, bowling, matches), [batting, bowling, matches, selectedSecond]);
  const firstPlayer = players.find((player) => player.player_id === selectedFirst);
  const secondPlayer = players.find((player) => player.player_id === selectedSecond);
  const race = useMemo(() => mvpRace(players, batting, bowling).slice(0, 10), [batting, bowling, players]);
  const awards = useMemo(() => seasonAwards(players, batting, bowling), [batting, bowling, players]);
  const analytics = useMemo(() => venueAndTossSummary(matches), [matches]);
  const knockout = matches.filter((match) => /final|semi|quarter|playoff/i.test(match.match_stage || '')).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const comparison = [
    { name: firstPlayer?.name || 'Player one', runs: form.reduce((sum, row) => sum + row.runs, 0), wickets: form.reduce((sum, row) => sum + row.wickets, 0) },
    { name: secondPlayer?.name || 'Player two', runs: compareForm.reduce((sum, row) => sum + row.runs, 0), wickets: compareForm.reduce((sum, row) => sum + row.wickets, 0) },
  ];
  const awardEntries: Array<{ label: string; award: AwardEntry }> = [
    { label: 'Best batter', award: awards.batter },
    { label: 'Best bowler', award: awards.bowler },
    { label: 'Emerging player', award: awards.emerging },
  ];
  return <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto space-y-6 px-4 py-7">
    <header className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-accent/15 p-6 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Performance lab</p><h1 className="mt-1 font-display text-3xl font-bold">Cricket Insights</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Compare players, follow form, celebrate milestones and understand the competition through scorecard-backed statistics.</p>
    </header>
    <section className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><GitCompareArrows className="h-5 w-5 text-primary" /> Head-to-head</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">{[[selectedFirst,setFirst,'First player'],[selectedSecond,setSecond,'Second player']].map(([value, setter, label]) => <Select key={String(label)} value={String(value)} onValueChange={setter as (value: string) => void}><SelectTrigger><SelectValue placeholder={String(label)} /></SelectTrigger><SelectContent>{playerOptions.map((player) => <SelectItem key={player.player_id} value={player.player_id}>{player.name}</SelectItem>)}</SelectContent></Select>)}</div>
        <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparison}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="runs" fill="hsl(var(--primary))" radius={[6,6,0,0]} /><Bar dataKey="wickets" fill="hsl(var(--accent))" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div>
        <p className="text-xs text-muted-foreground">Comparison uses each player’s latest ten recorded innings/spells.</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> {firstPlayer?.name || 'Player'} form</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={form}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="runs" stroke="hsl(var(--primary))" strokeWidth={3} /><Line type="monotone" dataKey="rollingAverage" stroke="hsl(var(--accent))" strokeWidth={2} /><Line type="monotone" dataKey="strikeRate" stroke="hsl(var(--chart-3))" strokeWidth={2} /></LineChart></ResponsiveContainer></div><p className="mt-3 text-xs text-muted-foreground">Last 5/10 innings are shown in chronological order; rolling average is based on recorded dismissals.</p></CardContent></Card>
    </section>
    <section className="grid gap-6 lg:grid-cols-3">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-600" /> MVP race</CardTitle></CardHeader><CardContent className="space-y-2">{race.map((item, index) => <Link key={item.playerId} to={`/player/${item.playerId}`} className="flex items-center justify-between rounded-xl border border-primary/10 p-2.5 hover:bg-primary/5"><span><strong className="mr-2 text-primary">{index + 1}</strong>{item.name}<small className="ml-2 text-muted-foreground">{item.label}</small></span><Badge>{item.value} pts</Badge></Link>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-accent" /> Season awards</CardTitle></CardHeader><CardContent className="space-y-3">{awardEntries.map(({ label, award }) => award ? <div key={label} className="rounded-xl bg-muted/60 p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="font-semibold">{award.name}</p><p className="text-sm text-primary">{award.value} {award.label}</p></div> : <p key={label} className="text-sm text-muted-foreground">No eligible {label.toLowerCase()} yet.</p>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Venue & toss</CardTitle></CardHeader><CardContent className="space-y-2">{analytics.venues.slice(0,4).map((venue) => <div key={venue.venue} className="flex justify-between rounded-lg border p-2 text-sm"><span>{venue.venue}</span><strong>{venue.played} matches</strong></div>)}<div className="grid grid-cols-2 gap-2 pt-2 text-center text-sm"><div className="rounded-lg bg-primary/10 p-2"><strong>{analytics.batFirstWins}</strong><br />bat first wins</div><div className="rounded-lg bg-accent/15 p-2"><strong>{analytics.chaseWins}</strong><br />chase wins</div></div></CardContent></Card>
    </section>
    <section className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Knockout bracket</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{knockout.length ? knockout.map((match) => <Link key={match.match_id} to={`/match/${match.match_id}`} className="rounded-xl border border-primary/15 p-3 transition hover:border-primary/40 hover:bg-primary/5"><Badge variant="outline">{match.match_stage || 'Knockout'}</Badge><p className="mt-2 font-semibold">{match.team_a} <span className="text-muted-foreground">vs</span> {match.team_b}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateInIST(match.date)} · {match.result || 'Fixture pending'}</p></Link>) : <p className="text-sm text-muted-foreground">Add a match stage containing Quarter-final, Semi-final, Final or Playoff to populate the bracket.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Swords className="h-5 w-5 text-primary" /> Milestone wall</CardTitle></CardHeader><CardContent className="space-y-3">{[selectedFirst, selectedSecond].filter(Boolean).map((id) => { const player = players.find((row) => row.player_id === id); const badges = playerBadges(id, batting, bowling); return <div key={id}><p className="font-semibold">{player?.name}</p><div className="mt-1 flex flex-wrap gap-2">{badges.length ? badges.map((badge) => <Badge key={badge.id} className={badge.tone === 'gold' ? 'bg-amber-500 hover:bg-amber-500' : ''}>{badge.label} · {badge.detail}</Badge>) : <span className="text-sm text-muted-foreground">No scorecard milestones yet.</span>}</div></div>; })}</CardContent></Card></section>
    <p className="text-xs text-muted-foreground">Awards, points and analytics are computed from the currently loaded scorecards. {seasons.length} season{seasons.length === 1 ? '' : 's'} available.</p>
  </main></div>;
}

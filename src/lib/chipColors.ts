export const matchStageChipClasses: Record<string, string> = {
  final: 'bg-rose-600 text-white border-rose-700',
  'semi final': 'bg-purple-600 text-white border-purple-700',
  'semi final 1': 'bg-purple-600 text-white border-purple-700',
  'semi final 2': 'bg-purple-500 text-white border-purple-700',
  'quarter final': 'bg-indigo-600 text-white border-indigo-700',
  qualifier: 'bg-orange-600 text-white border-orange-700',
  eliminator: 'bg-amber-500 text-black border-amber-600',
  'group stage': 'bg-sky-600 text-white border-sky-700',
  league: 'bg-cyan-600 text-white border-cyan-700',
  'super over': 'bg-red-700 text-white border-red-800',
  'play-off': 'bg-fuchsia-600 text-white border-fuchsia-700',
  friendly: 'bg-emerald-600 text-white border-emerald-700',
};

export function getMatchStageChipClass(stage?: string) {
  const key = String(stage || '').trim().toLowerCase();
  return matchStageChipClasses[key] || 'bg-slate-700 text-white border-slate-800';
}

const palette = [
  'bg-blue-700 text-white border-blue-800',
  'bg-emerald-700 text-white border-emerald-800',
  'bg-violet-700 text-white border-violet-800',
  'bg-amber-500 text-black border-amber-600',
  'bg-pink-700 text-white border-pink-800',
  'bg-teal-700 text-white border-teal-800',
  'bg-orange-700 text-white border-orange-800',
  'bg-lime-600 text-black border-lime-700',
];

export function getStableChipClass(value?: string) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'bg-muted text-foreground border-border';
  const hash = [...text].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

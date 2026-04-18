import { type LogoName } from '@/components/Logo';
import { type LucideIcon, FileText, Newspaper, ShieldCheck, Trophy, Users, Zap } from 'lucide-react';

export interface PageBranding {
  route: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  icon?: LucideIcon;
  departmentId?: string;
  logoName?: LogoName;
}

export const PAGE_BRANDING: Record<string, PageBranding> = {
  '/management': {
    route: '/management',
    title: 'Board Management',
    subtitle: 'Approvals, governance workflows, and internal communication.',
    emoji: '👑',
    departmentId: 'executive_board',
    icon: Users,
    logoName: 'management-hub',
  },
  '/documents-portal': {
    route: '/documents-portal',
    title: 'Official Documents Portal',
    subtitle: 'Secure library for governance records and approved files.',
    emoji: '🛡️',
    departmentId: 'governance',
    icon: FileText,
    logoName: 'documents-vault',
  },
  '/news-room': {
    route: '/news-room',
    title: 'News Room',
    subtitle: 'Official updates and internal bulletins.',
    emoji: '📰',
    departmentId: 'media_community',
    icon: Newspaper,
    logoName: 'news-room-wire',
  },
  '/leaderboards': {
    route: '/leaderboards',
    title: 'Leaderboards',
    subtitle: 'Rankings, stats, and season standings.',
    emoji: '🏆',
    departmentId: 'competition_operations',
    icon: Trophy,
    logoName: 'leaderboards-elite',
  },
  '/admin/match-center': {
    route: '/admin/match-center',
    title: 'Match Center – Live Scoring',
    subtitle: 'Manage live scoring, innings events, and timeline updates.',
    emoji: '🏏',
    departmentId: 'competition_operations',
    icon: Zap,
    logoName: 'match-center-live',
  },
  '/hall-of-glory': {
    route: '/hall-of-glory',
    title: 'Hall of Glory',
    subtitle: 'Tournament champions and milestone clubs from every season.',
    emoji: '🏆',
    departmentId: 'tournament',
    icon: ShieldCheck,
    logoName: 'hall-of-glory',
  },
};

export function resolvePageBranding(route: string): PageBranding | null {
  return PAGE_BRANDING[route] || null;
}

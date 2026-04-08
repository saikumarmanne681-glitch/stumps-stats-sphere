import { cn } from '@/lib/utils';

export type LogoName =
  | 'main-logo'
  | 'cricket-operations'
  | 'player-management'
  | 'match-scoring'
  | 'certificates'
  | 'community'
  | 'admin';

interface LogoProps {
  name: LogoName;
  size?: number;
  className?: string;
  alt?: string;
  lazy?: boolean;
}

const logoSrcByName: Record<LogoName, string> = {
  'main-logo': '/assets/logos/main-logo.svg',
  'cricket-operations': '/assets/logos/cricket-operations.svg',
  'player-management': '/assets/logos/player-management.svg',
  'match-scoring': '/assets/logos/match-scoring.svg',
  certificates: '/assets/logos/certificates.svg',
  community: '/assets/logos/community.svg',
  admin: '/assets/logos/admin.svg',
};

const logoAltByName: Record<LogoName, string> = {
  'main-logo': 'Stumps Stats Sphere logo',
  'cricket-operations': 'Cricket Operations Logo',
  'player-management': 'Player Management Logo',
  'match-scoring': 'Match and Scoring Logo',
  certificates: 'Certificates and Achievements Logo',
  community: 'Community and Communication Logo',
  admin: 'System Administration Logo',
};

export function Logo({ name, size = 24, className, alt, lazy = false }: LogoProps) {
  return (
    <img
      src={logoSrcByName[name]}
      alt={alt || logoAltByName[name]}
      width={size}
      height={size}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      className={cn('shrink-0 object-contain', className)}
    />
  );
}

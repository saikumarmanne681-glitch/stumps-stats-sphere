import { Shield, Lock, Fingerprint, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMemo } from 'react';

// Semi-visible session fingerprint
function getSessionFingerprint() {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const raw = [
    nav?.userAgent || '',
    nav?.language || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen?.width,
    screen?.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

// Data integrity hash for display
export function quickHash(data: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = (hash * 0x01000193) | 0;
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

/** Visible security badge with shield icon */
export function SecurityShieldBadge({ label = 'Secured', variant = 'default' }: { label?: string; variant?: 'default' | 'certified' | 'encrypted' }) {
  const colors = {
    default: 'bg-primary/10 text-primary border-primary/20',
    certified: 'bg-green-500/10 text-green-700 border-green-500/20',
    encrypted: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  };
  return (
    <Badge className={`${colors[variant]} gap-1 text-[10px] font-mono`}>
      <Shield className="h-3 w-3" /> {label}
    </Badge>
  );
}

/** Semi-visible session fingerprint indicator */
export function SessionFingerprint() {
  const fp = useMemo(() => getSessionFingerprint(), []);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/40 font-mono cursor-default select-none hover:text-muted-foreground/70 transition-colors">
          <Fingerprint className="h-3 w-3" />
          {fp}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>Session Fingerprint: {fp}</p>
        <p className="text-muted-foreground">Unique to your device & browser</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** Data integrity indicator */
export function DataIntegrityBadge({ data, label }: { data: string; label?: string }) {
  const hash = useMemo(() => quickHash(data), [data]);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/30 font-mono cursor-default select-none hover:text-muted-foreground/60 transition-colors">
          <Lock className="h-2.5 w-2.5" />
          {hash}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>{label || 'Data Integrity'}: {hash}</p>
        <p className="text-muted-foreground">FNV-1a hash for tamper detection</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** Encrypted data line indicator */
export function EncryptedLine({ lines }: { lines: number }) {
  return (
    <span className="text-[9px] text-muted-foreground/20 font-mono tracking-widest select-none">
      {Array.from({ length: Math.min(lines, 3) }, (_, i) => (
        <span key={i} className="block leading-tight">
          {'█'.repeat(4 + Math.floor(Math.random() * 12))}
          {'░'.repeat(2 + Math.floor(Math.random() * 6))}
          {'▓'.repeat(3 + Math.floor(Math.random() * 4))}
        </span>
      ))}
    </span>
  );
}

/** Page-level security watermark */
export function SecurityWatermark() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
      <div className="absolute -rotate-45 text-muted-foreground/[0.02] font-display text-[120px] font-bold whitespace-nowrap top-1/3 left-1/4 leading-none">
        SECURED PORTAL
      </div>
    </div>
  );
}

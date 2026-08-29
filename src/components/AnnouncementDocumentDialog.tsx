import { BadgeCheck, CalendarDays, FileText, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatSheetDate } from '@/lib/dataUtils';
import { getAnnouncementNumber } from '@/lib/announcements';
import type { Announcement } from '@/lib/types';

interface AnnouncementDocumentDialogProps {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnnouncementDocumentDialog({ announcement, open, onOpenChange }: AnnouncementDocumentDialogProps) {
  if (!announcement) return null;
  const announcementNumber = getAnnouncementNumber(announcement);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1rem)] overflow-y-auto rounded-2xl border-primary/20 p-0 sm:max-w-2xl sm:rounded-3xl">
        <article className="overflow-hidden bg-card">
          <header className="border-b border-primary/15 bg-gradient-to-br from-primary via-primary/90 to-primary/75 p-5 text-primary-foreground sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em]">
                <ShieldCheck className="h-4 w-4 text-accent" /> Official announcement
              </span>
              <span className="rounded-full bg-primary-foreground/15 px-3 py-1.5 font-mono text-xs font-bold tracking-wide">
                {announcementNumber}
              </span>
            </div>
            <DialogHeader className="space-y-3 text-left">
              <DialogTitle className="font-display text-2xl leading-tight text-primary-foreground sm:text-3xl">{announcement.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <CalendarDays className="h-4 w-4" /> Issued {formatSheetDate(announcement.date, 'dd MMMM yyyy', announcement.date)}
              </DialogDescription>
            </DialogHeader>
          </header>
          <div className="p-5 sm:p-8">
            <div className="rounded-2xl border border-primary/10 bg-muted/30 p-4 sm:p-6">
              <p className="whitespace-pre-wrap break-words font-body text-sm leading-7 text-foreground sm:text-base">{announcement.message}</p>
            </div>
            <footer className="mt-6 flex flex-col gap-3 border-t border-primary/10 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> Retain this reference for official communication.</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary"><BadgeCheck className="h-4 w-4" /> Issued by club administration</span>
            </footer>
          </div>
        </article>
      </DialogContent>
    </Dialog>
  );
}

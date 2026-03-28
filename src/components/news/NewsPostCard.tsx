import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { NewsRoomPost } from '@/lib/v2types';
import { CalendarClock, Megaphone } from 'lucide-react';

type NewsPostCardProps = {
  post: NewsRoomPost;
  publishedLabel: string;
  featured?: boolean;
};

const audienceLabel: Record<'all' | 'players' | 'management', string> = {
  all: 'All Users',
  players: 'Players',
  management: 'Management',
};

const getInitials = (name?: string) => {
  if (!name) return 'NA';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'NA';
};

export const NewsPostCard = ({ post, publishedLabel, featured = false }: NewsPostCardProps) => {
  const audience = (post.audience || 'all') as 'all' | 'players' | 'management';

  return (
    <Card className={cn('border-border/60 shadow-sm transition-colors hover:border-primary/40', featured && 'border-primary/30 bg-primary/5')}>
      <CardContent className={cn('space-y-4 p-5 md:p-6', featured && 'md:p-7')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant={featured ? 'default' : 'outline'} className="gap-1">
            <Megaphone className="h-3 w-3" />
            {featured ? 'Featured' : 'Update'}
          </Badge>
          <Badge variant="secondary">{audienceLabel[audience]}</Badge>
        </div>

        <div className="space-y-2">
          <h3 className={cn('font-display text-xl leading-tight text-foreground', featured && 'text-2xl md:text-3xl')}>
            {post.title}
          </h3>
          <p className={cn('whitespace-pre-wrap text-sm text-foreground/90 md:text-base', featured ? 'max-w-3xl leading-7' : 'max-w-2xl leading-6')}>
            {post.body}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs font-semibold">{getInitials(post.posted_by_name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground/80">{post.posted_by_name || 'Unknown author'}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {publishedLabel}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

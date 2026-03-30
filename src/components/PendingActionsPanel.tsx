import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface PendingActionItem {
  id: string;
  label: string;
  description: string;
  count: number;
  to: string;
}

export function PendingActionsPanel({ title, items }: { title: string; items: PendingActionItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{item.label}</h3>
                <Badge variant={item.count > 0 ? 'destructive' : 'secondary'}>{item.count}</Badge>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{item.description}</p>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to={item.to}>Open</Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

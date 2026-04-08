import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepartmentActivity } from "@/lib/v2types";

interface DepartmentActivityFeedProps {
  activity: DepartmentActivity[];
}

export function DepartmentActivityFeed({ activity }: DepartmentActivityFeedProps) {
  const [visible, setVisible] = useState(10);
  const sorted = useMemo(
    () => [...activity].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 50),
    [activity],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.slice(0, visible).map((item) => (
          <div key={item.id} className="rounded-lg border p-3">
            <p className="text-sm font-medium">{item.description}</p>
            <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
        {visible < sorted.length && (
          <Button variant="outline" onClick={() => setVisible((prev) => Math.min(prev + 10, sorted.length))}>
            Load more
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

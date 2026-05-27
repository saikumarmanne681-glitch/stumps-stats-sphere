import { useMemo, useState } from 'react';
import { MAJOR_UPDATE_CATALOG, type MajorUpdateArea } from '@/lib/majorUpdateCatalog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

const AREA_ORDER: MajorUpdateArea[] = [
  'A. Critical Fixes & Stability',
  'B. Certificates',
  'C. Scorelists & Scoring',
  'D. Player & Team Experience',
  'E. Tournaments & Seasons',
  'H. Public-facing Site',
  'M. Admin Power Tools',
];

const MajorUpdatesPage = () => {
  const [done, setDone] = useState<Record<number, boolean>>({});

  const grouped = useMemo(() => AREA_ORDER.map((area) => ({
    area,
    items: MAJOR_UPDATE_CATALOG.filter((item) => item.area === area),
  })), []);

  const total = MAJOR_UPDATE_CATALOG.length;
  const completed = Object.values(done).filter(Boolean).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="container py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Major Update Catalog (A+B+C+D+E+H+M)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{completed}/{total} completed</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {grouped.map((group) => (
        <Card key={group.area}>
          <CardHeader><CardTitle className="text-base">{group.area}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {group.items.map((item) => (
              <label key={item.id} className="flex gap-3 items-start text-sm">
                <Checkbox checked={Boolean(done[item.id])} onCheckedChange={(checked) => setDone((prev) => ({ ...prev, [item.id]: Boolean(checked) }))} />
                <span><span className="font-semibold mr-2">#{item.id}</span>{item.title}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MajorUpdatesPage;

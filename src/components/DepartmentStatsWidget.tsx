import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepartmentWidget } from "@/lib/departmentManagement";

interface DepartmentStatsWidgetProps {
  widget: DepartmentWidget;
}

export function DepartmentStatsWidget({ widget }: DepartmentStatsWidgetProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-lg" aria-hidden>{widget.icon}</span>
          <span>{widget.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-primary">{widget.value}</p>
      </CardContent>
    </Card>
  );
}

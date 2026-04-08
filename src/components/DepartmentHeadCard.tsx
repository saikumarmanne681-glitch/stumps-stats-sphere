import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepartmentDefinition } from "@/lib/departmentManagement";

interface DepartmentHeadCardProps {
  department: DepartmentDefinition;
}

export function DepartmentHeadCard({ department }: DepartmentHeadCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Head of Department</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xl font-semibold">{department.headName}</p>
        <p className="text-muted-foreground">{department.headRole}</p>
        <p className="text-muted-foreground">Since {new Date(department.assignedDate).toLocaleDateString()}</p>
      </CardContent>
    </Card>
  );
}

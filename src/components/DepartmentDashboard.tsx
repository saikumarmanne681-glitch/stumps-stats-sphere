import type { ReactNode } from "react";

interface DepartmentDashboardProps {
  children: ReactNode;
}

export function DepartmentDashboard({ children }: DepartmentDashboardProps) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">{children}</div>;
}

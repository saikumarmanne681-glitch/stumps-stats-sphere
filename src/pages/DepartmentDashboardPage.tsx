import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { DepartmentDashboard } from "@/components/DepartmentDashboard";
import { DepartmentHeadCard } from "@/components/DepartmentHeadCard";
import { DepartmentStatsWidget } from "@/components/DepartmentStatsWidget";
import { DepartmentActivityFeed } from "@/components/DepartmentActivityFeed";
import { DepartmentNotifications } from "@/components/DepartmentNotifications";
import { DepartmentTeamTable } from "@/components/DepartmentTeamTable";
import {
  addDepartmentActivity,
  addDepartmentAuditLog,
  addDepartmentMember,
  addDepartmentNotification,
  DEPARTMENTS,
  deleteDepartmentMember,
  getDefaultWidgets,
  getDepartmentActivity,
  getDepartmentAuditLogs,
  getDepartmentBySlug,
  getDepartmentMembers,
  getDepartmentNotifications,
  updateDepartmentMember,
} from "@/lib/departmentManagement";
import type { DepartmentMember, DepartmentRole } from "@/lib/v2types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DepartmentDashboardPage = () => {
  const { department: departmentSlug } = useParams();
  const { user, isAdmin, isManagement } = useAuth();
  const department = getDepartmentBySlug(departmentSlug);

  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const canManage = useMemo(() => {
    if (!department) return false;
    if (isAdmin) return true;
    const currentUser = user?.management_id || user?.username || "";
    return members.some((m) => m.department_id === department.id && m.user_id === currentUser && m.role === "Head");
  }, [department, isAdmin, members, user]);

  useEffect(() => {
    if (!department) return;
    const load = async () => {
      const [membersData, activityData, notificationData, auditData] = await Promise.all([
        getDepartmentMembers(department.id),
        getDepartmentActivity(department.id),
        getDepartmentNotifications(department.id),
        getDepartmentAuditLogs(department.id),
      ]);
      setMembers(membersData);
      setActivity(activityData);
      setNotifications(notificationData);
      setAuditLogs(auditData);
    };
    load();
  }, [department]);

  if (!department) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader><CardTitle>Department not found</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Requested route does not match one of the supported departments.</p>
              <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
                {DEPARTMENTS.map((item) => <li key={item.id}>{item.slug}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const actor = user?.management_id || user?.username || "system";

  const addMember = async (member: DepartmentMember) => {
    await addDepartmentMember(member);
    await addDepartmentActivity({
      id: `DA_${Date.now()}`,
      department_id: department.id,
      user_id: actor,
      action_type: "member_added",
      description: `${actor} added ${member.member_name} to ${department.name}`,
      created_at: new Date().toISOString(),
    });
    await addDepartmentAuditLog({
      id: `AL_${Date.now()}`,
      department_id: department.id,
      user_id: actor,
      action: "ADD_MEMBER",
      target: member.user_id,
      timestamp: new Date().toISOString(),
    });
    await addDepartmentNotification({
      id: `DN_${Date.now()}`,
      department_id: department.id,
      title: "Department team update",
      message: `${member.member_name} was added to team members`,
      created_at: new Date().toISOString(),
      is_read: false,
    });
    setMembers((prev) => [member, ...prev]);
  };

  const removeMember = async (id: string) => {
    await deleteDepartmentMember(id);
    setMembers((prev) => prev.filter((item) => item.id !== id));
  };

  const updateRole = async (member: DepartmentMember, role: DepartmentRole) => {
    const updated = { ...member, role };
    await updateDepartmentMember(updated);
    setMembers((prev) => prev.map((item) => (item.id === member.id ? updated : item)));
  };

  const widgets = getDefaultWidgets(department.slug);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto space-y-6 px-4 py-6">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-4xl" aria-hidden>{department.logo}</p>
              <h1 className="text-2xl font-bold">{department.name} Department</h1>
              <p className="text-sm text-muted-foreground">{department.description}</p>
            </div>
            <DepartmentNotifications notifications={notifications} />
          </div>
        </div>

        <DepartmentDashboard>
          <div className="lg:col-span-4">
            <DepartmentHeadCard department={department} />
          </div>
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {widgets.map((widget) => <DepartmentStatsWidget key={widget.id} widget={widget} />)}
            </div>
          </div>

          <div className="lg:col-span-7">
            <DepartmentActivityFeed activity={activity} />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <Card>
              <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button disabled={isManagement && !canManage}>Create update</Button>
                <Button variant="outline" disabled={isManagement && !canManage}>Post announcement</Button>
                <Button variant="outline" disabled={isManagement && !canManage}>Assign task</Button>
                <Button variant="outline">View reports</Button>
              </CardContent>
            </Card>

            {(isAdmin || canManage) && (
              <Card>
                <CardHeader><CardTitle>Department Audit Logs</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {auditLogs.slice(0, 8).map((log: any) => (
                    <div key={log.id} className="rounded-lg border p-2 text-xs">
                      <p className="font-semibold">{log.action}</p>
                      <p className="text-muted-foreground">Target: {log.target}</p>
                      <p className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                  {auditLogs.length === 0 && <p className="text-sm text-muted-foreground">No logs available.</p>}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-12">
            <DepartmentTeamTable
              departmentId={department.id}
              members={members}
              canManage={isAdmin || canManage}
              actorName={actor}
              onAddMember={addMember}
              onDeleteMember={removeMember}
              onRoleChange={updateRole}
            />
          </div>
        </DepartmentDashboard>
      </div>
    </div>
  );
};

export default DepartmentDashboardPage;

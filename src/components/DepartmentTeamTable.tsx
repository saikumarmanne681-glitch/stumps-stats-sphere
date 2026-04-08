import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEPARTMENT_ROLES, buildDepartmentMember } from "@/lib/departmentManagement";
import type { DepartmentMember, DepartmentRole } from "@/lib/v2types";
import { useState } from "react";

interface DepartmentTeamTableProps {
  departmentId: string;
  members: DepartmentMember[];
  canManage: boolean;
  actorName: string;
  onAddMember: (member: DepartmentMember) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
  onRoleChange: (member: DepartmentMember, role: DepartmentRole) => Promise<void>;
}

export function DepartmentTeamTable({
  departmentId,
  members,
  canManage,
  actorName,
  onAddMember,
  onDeleteMember,
  onRoleChange,
}: DepartmentTeamTableProps) {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<DepartmentRole>("Member");

  const handleAdd = async () => {
    if (!name.trim() || !userId.trim()) return;
    await onAddMember(buildDepartmentMember({ departmentId, name, userId, role, addedBy: actorName }));
    setName("");
    setUserId("");
    setRole("Member");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Team Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Member name" />
            <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="User id" />
            <Select value={role} onValueChange={(value) => setRole(value as DepartmentRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_ROLES.map((departmentRole) => (
                  <SelectItem key={departmentRole} value={departmentRole}>{departmentRole}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd}>Add member</Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added date</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.member_name || member.user_id}</TableCell>
                  <TableCell>{member.user_id}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select value={member.role} onValueChange={(value) => onRoleChange(member, value as DepartmentRole)}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENT_ROLES.map((departmentRole) => (
                            <SelectItem key={departmentRole} value={departmentRole}>{departmentRole}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : member.role}
                  </TableCell>
                  <TableCell>{new Date(member.added_date).toLocaleDateString()}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => onDeleteMember(member.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

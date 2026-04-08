import { v2api } from "@/lib/v2api";
import { type DepartmentActivity, type DepartmentAuditLog, type DepartmentMember, type DepartmentNotification, type DepartmentRole } from "@/lib/v2types";

export interface DepartmentDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string;
  headName: string;
  headRole: string;
  assignedDate: string;
}

export interface DepartmentWidget {
  id: string;
  title: string;
  value: string;
  icon: string;
}

export const DEPARTMENTS: DepartmentDefinition[] = [
  {
    id: "DEP_CRICKET_OPERATIONS",
    slug: "cricket-operations",
    name: "Cricket Operations",
    description: "Responsible for managing teams, seasons, tournaments and grounds.",
    logo: "🏏",
    headName: "John Smith",
    headRole: "President",
    assignedDate: "2026-01-01",
  },
  {
    id: "DEP_PLAYER_MANAGEMENT",
    slug: "player-management",
    name: "Player Management",
    description: "Oversees player registrations, profiles, performance pathways and transitions.",
    logo: "🧢",
    headName: "Mike Johnson",
    headRole: "Player Manager",
    assignedDate: "2026-01-10",
  },
  {
    id: "DEP_MATCH_SCORING",
    slug: "match-scoring",
    name: "Match & Scoring",
    description: "Handles fixtures, live scoring operations, score validation and archival.",
    logo: "📊",
    headName: "Sarah Wilson",
    headRole: "Match Secretary",
    assignedDate: "2026-01-15",
  },
  {
    id: "DEP_CERTIFICATES_ACHIEVEMENTS",
    slug: "certificates-achievements",
    name: "Certificates & Achievements",
    description: "Manages certificates, awards approvals and achievement records.",
    logo: "🏅",
    headName: "Emily Parker",
    headRole: "Certificates Lead",
    assignedDate: "2026-01-20",
  },
  {
    id: "DEP_COMMUNITY_COMMUNICATION",
    slug: "community-communication",
    name: "Community & Communication",
    description: "Coordinates announcements, events and engagement with members.",
    logo: "📣",
    headName: "Olivia Brown",
    headRole: "Communications Head",
    assignedDate: "2026-02-01",
  },
  {
    id: "DEP_SYSTEM_ADMINISTRATION",
    slug: "system-administration",
    name: "System Administration",
    description: "Maintains users, platform reliability, access controls and diagnostics.",
    logo: "🛡️",
    headName: "David Clark",
    headRole: "System Administrator",
    assignedDate: "2026-01-05",
  },
];

const defaultWidgetsByDepartment: Record<string, DepartmentWidget[]> = {
  "cricket-operations": [
    { id: "w1", title: "Total Teams", value: "18", icon: "👥" },
    { id: "w2", title: "Active Tournaments", value: "4", icon: "🏆" },
    { id: "w3", title: "Current Season", value: "2026", icon: "📅" },
    { id: "w4", title: "Upcoming Matches", value: "11", icon: "📌" },
  ],
  "player-management": [
    { id: "w1", title: "Total Players", value: "264", icon: "👤" },
    { id: "w2", title: "Active Players", value: "227", icon: "✅" },
    { id: "w3", title: "Top Batsman", value: "Rahul S.", icon: "🏏" },
    { id: "w4", title: "Top Bowler", value: "Arjun P.", icon: "🎯" },
  ],
  "match-scoring": [
    { id: "w1", title: "Live Matches", value: "2", icon: "🟢" },
    { id: "w2", title: "Upcoming Matches", value: "15", icon: "⏭️" },
    { id: "w3", title: "Completed Matches", value: "102", icon: "✔️" },
    { id: "w4", title: "Pending Verifications", value: "6", icon: "🧾" },
  ],
  "certificates-achievements": [
    { id: "w1", title: "Total Certificates", value: "432", icon: "📄" },
    { id: "w2", title: "Recent Awards", value: "19", icon: "🎖️" },
    { id: "w3", title: "Pending Approvals", value: "7", icon: "⏳" },
    { id: "w4", title: "Issued This Month", value: "34", icon: "🗂️" },
  ],
  "community-communication": [
    { id: "w1", title: "Announcements", value: "14", icon: "📣" },
    { id: "w2", title: "Events", value: "9", icon: "🗓️" },
    { id: "w3", title: "Messages", value: "57", icon: "💬" },
    { id: "w4", title: "Open Campaigns", value: "3", icon: "📢" },
  ],
  "system-administration": [
    { id: "w1", title: "Users", value: "391", icon: "🧑‍💻" },
    { id: "w2", title: "Support Tickets", value: "21", icon: "🎫" },
    { id: "w3", title: "System Logs", value: "1.2k", icon: "🧠" },
    { id: "w4", title: "Critical Alerts", value: "2", icon: "🚨" },
  ],
};

export const getDepartmentBySlug = (slug?: string) => DEPARTMENTS.find((department) => department.slug === slug);
export const getDefaultWidgets = (slug: string) => defaultWidgetsByDepartment[slug] || [];

const parseList = <T extends Record<string, unknown>>(rows: T[]) => (Array.isArray(rows) ? rows : []);

export async function getDepartmentMembers(departmentId: string) {
  const rows = await v2api.getCustomSheet<DepartmentMember>("DEPARTMENT_MEMBERS");
  return parseList(rows).filter((row) => row.department_id === departmentId);
}

export async function getDepartmentActivity(departmentId: string) {
  const rows = await v2api.getCustomSheet<DepartmentActivity>("DEPARTMENT_ACTIVITY");
  return parseList(rows)
    .filter((row) => row.department_id === departmentId)
    .sort((a, b) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0))
    .slice(0, 50);
}

export async function getDepartmentAuditLogs(departmentId: string) {
  const rows = await v2api.getCustomSheet<DepartmentAuditLog>("DEPARTMENT_AUDIT_LOGS");
  return parseList(rows)
    .filter((row) => row.department_id === departmentId)
    .sort((a, b) => +new Date(b.timestamp || 0) - +new Date(a.timestamp || 0));
}

export async function getDepartmentNotifications(departmentId: string) {
  const rows = await v2api.getCustomSheet<DepartmentNotification>("DEPARTMENT_NOTIFICATIONS");
  return parseList(rows)
    .filter((row) => row.department_id === departmentId)
    .sort((a, b) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0));
}

export async function addDepartmentMember(member: DepartmentMember) {
  return v2api.addCustomSheetRow("DEPARTMENT_MEMBERS", member);
}

export async function updateDepartmentMember(member: DepartmentMember) {
  return v2api.updateCustomSheetRow("DEPARTMENT_MEMBERS", member);
}

export async function deleteDepartmentMember(id: string) {
  return v2api.deleteCustomSheetRow("DEPARTMENT_MEMBERS", { id });
}

export async function addDepartmentActivity(entry: DepartmentActivity) {
  return v2api.addCustomSheetRow("DEPARTMENT_ACTIVITY", entry);
}

export async function addDepartmentAuditLog(entry: DepartmentAuditLog) {
  return v2api.addCustomSheetRow("DEPARTMENT_AUDIT_LOGS", entry);
}

export async function addDepartmentNotification(notification: DepartmentNotification) {
  return v2api.addCustomSheetRow("DEPARTMENT_NOTIFICATIONS", notification);
}

export const DEPARTMENT_ROLES: DepartmentRole[] = ["Head", "Coordinator", "Member"];

export const buildDepartmentMember = (input: {
  departmentId: string;
  userId: string;
  name: string;
  role: DepartmentRole;
  addedBy: string;
}): DepartmentMember => ({
  id: `DM_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  department_id: input.departmentId,
  user_id: input.userId,
  member_name: input.name,
  role: input.role,
  added_by: input.addedBy,
  added_date: new Date().toISOString(),
});

import { AuthUser } from '@/lib/types';

const MANAGEMENT_DESIGNATIONS = {
  PRESIDENT: 'President',
  VICE_PRESIDENT: 'Vice President',
  SECRETARY: 'Secretary',
  TREASURER: 'Treasurer',
  TOURNAMENT_DIRECTOR: 'Tournament Director',
  ELECTION_OFFICER: 'Election Officer',
} as const;

export const scheduleApproverRoles = [
  MANAGEMENT_DESIGNATIONS.PRESIDENT,
  MANAGEMENT_DESIGNATIONS.VICE_PRESIDENT,
  MANAGEMENT_DESIGNATIONS.SECRETARY,
  MANAGEMENT_DESIGNATIONS.TREASURER,
] as const;

export function isAuthenticated(user: AuthUser | null | undefined) {
  return !!user;
}

export function getActorId(user: AuthUser | null | undefined) {
  if (!user) return 'guest';
  if (user.type === 'admin') return 'admin';
  return user.player_id || user.management_id || user.username;
}

export function getActorName(user: AuthUser | null | undefined) {
  return user?.name || user?.username || 'Unknown User';
}

export function isAdminOrDesignation(user: AuthUser | null | undefined, designation: string) {
  return user?.type === 'admin' || (user?.type === 'management' && user.designation === designation);
}

export function canManageElections(user: AuthUser | null | undefined) {
  return isAdminOrDesignation(user, MANAGEMENT_DESIGNATIONS.ELECTION_OFFICER);
}

export function canVoteInElection(user: AuthUser | null | undefined) {
  if (!user) return false;
  if (user.type === 'management' && user.designation === MANAGEMENT_DESIGNATIONS.ELECTION_OFFICER) return false;
  return true;
}

export function canContestElection(user: AuthUser | null | undefined) {
  return canVoteInElection(user);
}

export function canManageTournament(user: AuthUser | null | undefined) {
  return isAdminOrDesignation(user, MANAGEMENT_DESIGNATIONS.TOURNAMENT_DIRECTOR);
}

export function canApproveTournamentRegistration(user: AuthUser | null | undefined) {
  return user?.type === 'management' && user.designation === MANAGEMENT_DESIGNATIONS.TOURNAMENT_DIRECTOR;
}

export function canApproveSchedule(user: AuthUser | null | undefined) {
  return user?.type === 'management' && !!user.designation && scheduleApproverRoles.includes(user.designation as (typeof scheduleApproverRoles)[number]);
}

export function isScheduleApproverRole(designation?: string) {
  return !!designation && scheduleApproverRoles.includes(designation as (typeof scheduleApproverRoles)[number]);
}

export const managementDesignations = MANAGEMENT_DESIGNATIONS;

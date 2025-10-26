/**
 * Centralized permissions helper
 * Security: Uses user_memberships.role as single source of truth for authorization
 * ui_preference is ONLY used for UI hints, never for authorization
 */

export const isAdminRole = (role?: string) =>
  role === 'family_admin' || role === 'disabled_person';

export function canEditSection(params: {
  hasMembership: boolean;
  membershipRole?: string;
  uiPreferenceRole?: string; // UI-only hint, NOT for authorization
  sectionAllowsCarer: boolean; // true for tasks, notes, schedule (requests handled specially)
}): boolean {
  const { hasMembership, membershipRole, uiPreferenceRole, sectionAllowsCarer } = params;
  
  if (hasMembership) {
    // User has membership - membership role controls permissions
    if (isAdminRole(membershipRole)) return true;
    if (membershipRole === 'carer') return sectionAllowsCarer;
    return false; // family_viewer
  } else {
    // Unconnected user - only admin-like ui_preference may edit (for pre-setup)
    return isAdminRole(uiPreferenceRole);
  }
}

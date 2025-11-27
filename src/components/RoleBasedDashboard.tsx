
import React from 'react';
import { CarerDashboard } from './CarerDashboard';
import { FamilyDashboard } from './FamilyDashboard';
import { DisabledPersonDashboard } from './DisabledPersonDashboard';

interface RoleBasedDashboardProps {
  user: any;
  currentFamily: any | null;
  onSignOut: () => void;
  userRole?: string | null;
  userName?: string;
  profilePictureUrl?: string;
  careRecipientPictureUrl?: string;
  currentFamilyId?: string;
  onProfileUpdate?: (newRole?: string) => void;
  onFamilySelected?: (familyId: string) => void;
}

export const RoleBasedDashboard = ({ user, currentFamily, onSignOut, userRole: propUserRole, userName, profilePictureUrl, careRecipientPictureUrl, currentFamilyId, onProfileUpdate, onFamilySelected }: RoleBasedDashboardProps) => {
  // If no family, use role from props (from profile), otherwise from membership
  const userRole = currentFamily?.role || propUserRole || 'carer';
  const familyName = currentFamily?.families?.name || currentFamily?.families?.id || userName || 'Your Dashboard';
  const familyId = currentFamily?.family_id;

  const commonProps = {
    onSignOut,
    familyId: familyId, // Pass undefined if no family, not empty string
    familyName,
    userRole,
    profilePictureUrl,
    careRecipientPictureUrl,
    currentFamilyId: currentFamilyId || familyId, // Pass current family ID for role updates
    onBack: () => {}, // Add empty onBack function for now
    onProfileUpdate,
    onFamilySelected
  };

  switch (userRole) {
    case 'carer':
      return <CarerDashboard {...commonProps} careRecipientNameHint={familyName} />;
    
    case 'family_admin':
    case 'family_viewer':
    case 'manager':
      return <FamilyDashboard {...commonProps} userRole={userRole} />;
    
    case 'disabled_person':
      return <DisabledPersonDashboard {...commonProps} />;
    
    default:
      return <CarerDashboard {...commonProps} />;
  }
};

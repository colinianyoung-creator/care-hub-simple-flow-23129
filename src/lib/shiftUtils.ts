/**
 * Shared utility functions for shift type handling across all calendar views
 * This ensures consistent colors and labels throughout the application
 */

export type ShiftType = 
  | 'basic' 
  | 'cover' 
  | 'sickness' 
  | 'annual_leave' 
  | 'public_holiday' 
  | 'training' 
  | 'other';

/**
 * Get Tailwind CSS classes for shift type colors
 * @param shiftType - The type of shift (basic, cover, sickness, etc.)
 * @param isLeaveRequest - Whether this is a leave request (optional, for backward compatibility)
 * @returns Tailwind CSS class string for background and text color
 */
export const getShiftTypeColor = (shiftType: string, isLeaveRequest?: boolean): string => {
  // Leave requests use their shift_type to determine color
  if (isLeaveRequest) {
    shiftType = shiftType || 'other';
  }

  switch (shiftType) {
    case 'cover':
      return 'bg-cyan-500 text-white';
    case 'sickness':
    case 'sick_leave':
      return 'bg-red-500 text-white';
    case 'annual_leave':
    case 'holiday':
      return 'bg-yellow-500 text-white';
    case 'public_holiday':
      return 'bg-purple-500 text-white';
    case 'training':
      return 'bg-green-500 text-white';
    case 'other':
      return 'bg-orange-500 text-white';
    case 'basic':
    default:
      return 'bg-blue-500 text-white';
  }
};

/**
 * Get human-readable label for shift type
 * @param shiftType - The type of shift
 * @returns Display label for the shift type
 */
export const getShiftTypeLabel = (shiftType: string): string => {
  switch (shiftType) {
    case 'cover':
      return 'Cover';
    case 'sickness':
    case 'sick_leave':
      return 'Sickness';
    case 'annual_leave':
    case 'holiday':
      return 'Annual Leave';
    case 'public_holiday':
      return 'Public Holiday';
    case 'training':
      return 'Training';
    case 'other':
      return 'Other';
    case 'basic':
    default:
      return 'Basic';
  }
};

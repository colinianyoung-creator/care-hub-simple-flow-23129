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

export type AttendanceMode = 'none' | 'confirm_only' | 'actuals';

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

/**
 * Get attendance mode label
 */
export const getAttendanceModeLabel = (mode: AttendanceMode): string => {
  switch (mode) {
    case 'none':
      return 'No Clock-in';
    case 'confirm_only':
      return 'Confirm Attendance';
    case 'actuals':
      return 'Actual Hours';
    default:
      return 'Unknown';
  }
};

/**
 * Get pay source based on attendance mode
 */
export const getPaySource = (mode: AttendanceMode): 'scheduled' | 'actual' => {
  return mode === 'actuals' ? 'actual' : 'scheduled';
};

/**
 * Check if clock-in is required for an attendance mode
 */
export const isClockInRequired = (mode: AttendanceMode): boolean => {
  return mode !== 'none';
};

/**
 * Calculate payable hours based on attendance mode
 * @param mode - The attendance mode
 * @param scheduledHours - Hours from shift_instance schedule
 * @param actualHours - Hours from time_entry (if exists)
 * @param hasTimeEntry - Whether a time_entry exists
 * @returns Object with payable hours and any exceptions
 */
export const calculatePayableHours = (
  mode: AttendanceMode,
  scheduledHours: number,
  actualHours: number | null,
  hasTimeEntry: boolean
): { hours: number; exception?: string } => {
  switch (mode) {
    case 'none':
      // Pay from scheduled time, no time_entry needed
      return { hours: scheduledHours };
      
    case 'confirm_only':
      // Pay from scheduled time, but flag if no time_entry
      if (!hasTimeEntry) {
        return { hours: scheduledHours, exception: 'missing_clock_in' };
      }
      return { hours: scheduledHours };
      
    case 'actuals':
      // Pay from time_entry only
      if (!hasTimeEntry || actualHours === null) {
        return { hours: 0, exception: 'missing_clock_in_blocks_pay' };
      }
      return { hours: actualHours };
      
    default:
      return { hours: scheduledHours };
  }
};

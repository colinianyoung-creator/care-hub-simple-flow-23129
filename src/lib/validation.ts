/**
 * Form validation schemas using Zod
 * Provides comprehensive input validation for all forms
 */
import { z } from 'zod';

// ==========================================
// Text Field Validators
// ==========================================

export const titleSchema = z.string()
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be less than 200 characters');

export const descriptionSchema = z.string()
  .trim()
  .max(2000, 'Description must be less than 2000 characters')
  .optional();

export const contentSchema = z.string()
  .trim()
  .min(1, 'Content is required')
  .max(5000, 'Content must be less than 5000 characters');

export const notesSchema = z.string()
  .trim()
  .max(500, 'Notes must be less than 500 characters')
  .optional();

// ==========================================
// Date and Time Validators
// ==========================================

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Invalid date');

export const timeSchema = z.string()
  .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)');

// Validate that end time is after start time
export const timeRangeSchema = z.object({
  start_time: timeSchema,
  end_time: timeSchema
}).refine((data) => {
  const start = new Date(`2000-01-01T${data.start_time}`);
  const end = new Date(`2000-01-01T${data.end_time}`);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
});

// ==========================================
// Number Validators
// ==========================================

export const hoursSchema = z.number()
  .min(0.25, 'Hours must be at least 0.25 (15 minutes)')
  .max(24, 'Hours cannot exceed 24')
  .multipleOf(0.25, 'Hours must be in 15-minute increments');

export const amountSchema = z.number()
  .min(0, 'Amount must be positive')
  .max(999999.99, 'Amount is too large');

// ==========================================
// Shift & Absence Forms
// ==========================================

export const shiftAbsenceSchema = z.object({
  type: z.enum([
    'shift_basic',
    'shift_cover',
    'sickness',
    'annual_leave',
    'public_holiday'
  ], { errorMap: () => ({ message: 'Invalid entry type' }) }),
  date: dateSchema,
  hours: hoursSchema,
  notes: notesSchema
});

export const shiftAssignmentSchema = z.object({
  carer_id: z.string().uuid('Invalid carer selection'),
  day_of_week: z.number().int().min(0).max(6, 'Invalid day of week'),
  start_time: timeSchema,
  end_time: timeSchema,
  notes: notesSchema
}).refine((data) => {
  const start = new Date(`2000-01-01T${data.start_time}`);
  const end = new Date(`2000-01-01T${data.end_time}`);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
});

// ==========================================
// Care Notes & Tasks
// ==========================================

export const careNoteSchema = z.object({
  title: titleSchema,
  content: contentSchema,
  category: z.string().max(50, 'Category must be less than 50 characters').optional()
});

export const taskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  due_date: dateSchema.optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigned_to: z.string().uuid('Invalid user selection').optional()
});

// ==========================================
// Appointments
// ==========================================

export const appointmentSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  appointment_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Invalid date and time'),
  location: z.string().max(200, 'Location must be less than 200 characters').optional()
});

// ==========================================
// Medications
// ==========================================

export const medicationSchema = z.object({
  name: z.string().trim().min(1, 'Medication name is required').max(200),
  dosage: z.string().max(100, 'Dosage must be less than 100 characters').optional(),
  frequency: z.string().max(100, 'Frequency must be less than 100 characters').optional(),
  instructions: descriptionSchema,
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional()
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['end_date']
});

// ==========================================
// Diet & Money Records
// ==========================================

export const dietEntrySchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(500),
  meal_type: z.string().max(50).optional(),
  entry_date: dateSchema,
  notes: notesSchema
});

export const moneyRecordSchema = z.object({
  type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Invalid transaction type' }) }),
  amount: amountSchema,
  category: z.string().max(50, 'Category must be less than 50 characters').optional(),
  description: z.string().trim().min(1, 'Description is required').max(500),
  transaction_date: dateSchema
});

// ==========================================
// Profile Updates
// ==========================================

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  phone: z.string().max(20, 'Phone must be less than 20 characters').optional(),
  contact_email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  contact_phone: z.string().max(20, 'Phone must be less than 20 characters').optional(),
  care_recipient_name: z.string().max(100, 'Name must be less than 100 characters').optional()
});

// ==========================================
// Body Map Injury Logs
// ==========================================

export const bodyLogSchema = z.object({
  body_location: z.string().trim().min(1, 'Body location is required').max(100),
  body_region_code: z.string().trim().min(1, 'Region code is required').max(50),
  view_type: z.enum(['front', 'back'], { errorMap: () => ({ message: 'Invalid view type' }) }),
  description: z.string()
    .trim()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters'),
  type_severity: z.string().trim().min(1, 'Type/Severity is required').max(100),
  incident_datetime: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Valid date/time is required')
});

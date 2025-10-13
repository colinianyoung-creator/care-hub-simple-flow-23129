export function formatShiftType(type: string): string {
  if (!type) return 'Basic';
  
  // Convert snake_case to Title Case
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
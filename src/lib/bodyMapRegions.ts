/**
 * Body map regions data for front and back views
 * Each region has coordinates for rendering and interaction
 */

export interface BodyRegion {
  id: string;
  label: string;
  cx?: number; // Circle center X
  cy?: number; // Circle center Y
  r?: number;  // Circle radius
  x?: number;  // Rectangle X
  y?: number;  // Rectangle Y
  width?: number;
  height?: number;
  path?: string; // SVG path for complex shapes
}

// Front view body regions (viewBox: 0 0 300 600)
export const frontRegions: BodyRegion[] = [
  // Head
  { id: 'head', label: 'Head/Face', cx: 150, cy: 40, r: 30 },
  { id: 'neck', label: 'Neck', x: 135, y: 70, width: 30, height: 25 },
  
  // Shoulders
  { id: 'left_shoulder', label: 'Left Shoulder', cx: 110, cy: 105, r: 20 },
  { id: 'right_shoulder', label: 'Right Shoulder', cx: 190, cy: 105, r: 20 },
  
  // Chest and Abdomen
  { id: 'chest', label: 'Chest', x: 120, y: 95, width: 60, height: 60 },
  { id: 'abdomen', label: 'Abdomen', x: 125, y: 155, width: 50, height: 60 },
  
  // Arms - Left
  { id: 'left_upper_arm', label: 'Left Upper Arm', x: 85, y: 115, width: 20, height: 60 },
  { id: 'left_elbow', label: 'Left Elbow', cx: 95, cy: 185, r: 12 },
  { id: 'left_forearm', label: 'Left Forearm', x: 85, y: 195, width: 20, height: 60 },
  { id: 'left_wrist', label: 'Left Wrist', cx: 95, cy: 265, r: 10 },
  { id: 'left_hand', label: 'Left Hand', x: 85, y: 275, width: 20, height: 30 },
  
  // Arms - Right
  { id: 'right_upper_arm', label: 'Right Upper Arm', x: 195, y: 115, width: 20, height: 60 },
  { id: 'right_elbow', label: 'Right Elbow', cx: 205, cy: 185, r: 12 },
  { id: 'right_forearm', label: 'Right Forearm', x: 195, y: 195, width: 20, height: 60 },
  { id: 'right_wrist', label: 'Right Wrist', cx: 205, cy: 265, r: 10 },
  { id: 'right_hand', label: 'Right Hand', x: 195, y: 275, width: 20, height: 30 },
  
  // Hips
  { id: 'left_hip', label: 'Left Hip', cx: 135, cy: 225, r: 15 },
  { id: 'right_hip', label: 'Right Hip', cx: 165, cy: 225, r: 15 },
  
  // Legs - Left
  { id: 'left_thigh', label: 'Left Thigh', x: 120, y: 240, width: 25, height: 80 },
  { id: 'left_knee', label: 'Left Knee', cx: 132, cy: 330, r: 15 },
  { id: 'left_shin', label: 'Left Shin', x: 120, y: 345, width: 25, height: 90 },
  { id: 'left_ankle', label: 'Left Ankle', cx: 132, cy: 445, r: 10 },
  { id: 'left_foot', label: 'Left Foot', x: 115, y: 455, width: 35, height: 25 },
  
  // Legs - Right
  { id: 'right_thigh', label: 'Right Thigh', x: 155, y: 240, width: 25, height: 80 },
  { id: 'right_knee', label: 'Right Knee', cx: 168, cy: 330, r: 15 },
  { id: 'right_shin', label: 'Right Shin', x: 155, y: 345, width: 25, height: 90 },
  { id: 'right_ankle', label: 'Right Ankle', cx: 168, cy: 445, r: 10 },
  { id: 'right_foot', label: 'Right Foot', x: 150, y: 455, width: 35, height: 25 },
];

// Back view body regions (viewBox: 0 0 300 600)
export const backRegions: BodyRegion[] = [
  // Head
  { id: 'back_of_head', label: 'Back of Head', cx: 150, cy: 40, r: 30 },
  { id: 'neck_back', label: 'Neck (back)', x: 135, y: 70, width: 30, height: 25 },
  
  // Shoulders
  { id: 'left_shoulder_back', label: 'Left Shoulder (back)', cx: 110, cy: 105, r: 20 },
  { id: 'right_shoulder_back', label: 'Right Shoulder (back)', cx: 190, cy: 105, r: 20 },
  
  // Back
  { id: 'upper_back', label: 'Upper Back', x: 120, y: 95, width: 60, height: 60 },
  { id: 'lower_back', label: 'Lower Back', x: 125, y: 155, width: 50, height: 50 },
  { id: 'buttocks', label: 'Buttocks', x: 125, y: 205, width: 50, height: 35 },
  
  // Shoulder Blades
  { id: 'left_shoulder_blade', label: 'Left Shoulder Blade', cx: 125, cy: 120, r: 18 },
  { id: 'right_shoulder_blade', label: 'Right Shoulder Blade', cx: 175, cy: 120, r: 18 },
  
  // Arms - Left (back)
  { id: 'left_upper_arm_back', label: 'Left Upper Arm (back)', x: 85, y: 115, width: 20, height: 60 },
  { id: 'left_elbow_back', label: 'Left Elbow (back)', cx: 95, cy: 185, r: 12 },
  { id: 'left_forearm_back', label: 'Left Forearm (back)', x: 85, y: 195, width: 20, height: 60 },
  
  // Arms - Right (back)
  { id: 'right_upper_arm_back', label: 'Right Upper Arm (back)', x: 195, y: 115, width: 20, height: 60 },
  { id: 'right_elbow_back', label: 'Right Elbow (back)', cx: 205, cy: 185, r: 12 },
  { id: 'right_forearm_back', label: 'Right Forearm (back)', x: 195, y: 195, width: 20, height: 60 },
  
  // Legs - Left (back)
  { id: 'left_thigh_back', label: 'Left Thigh (back)', x: 120, y: 240, width: 25, height: 80 },
  { id: 'left_knee_back', label: 'Left Knee (back)', cx: 132, cy: 330, r: 15 },
  { id: 'left_calf', label: 'Left Calf', x: 120, y: 345, width: 25, height: 90 },
  { id: 'left_ankle_back', label: 'Left Ankle (back)', cx: 132, cy: 445, r: 10 },
  { id: 'left_heel', label: 'Left Heel', x: 115, y: 455, width: 35, height: 25 },
  
  // Legs - Right (back)
  { id: 'right_thigh_back', label: 'Right Thigh (back)', x: 155, y: 240, width: 25, height: 80 },
  { id: 'right_knee_back', label: 'Right Knee (back)', cx: 168, cy: 330, r: 15 },
  { id: 'right_calf', label: 'Right Calf', x: 155, y: 345, width: 25, height: 90 },
  { id: 'right_ankle_back', label: 'Right Ankle (back)', cx: 168, cy: 445, r: 10 },
  { id: 'right_heel', label: 'Right Heel', x: 150, y: 455, width: 35, height: 25 },
];

export const getSeverityColor = (severity: string): string => {
  const severityLower = severity.toLowerCase();
  
  // Severe (red)
  if (
    severityLower.includes('severe') ||
    severityLower.includes('stage 3') ||
    severityLower.includes('stage 4') ||
    severityLower.includes('fracture') ||
    severityLower.includes('3rd degree')
  ) {
    return 'hsl(var(--destructive))';
  }
  
  // Moderate (orange)
  if (
    severityLower.includes('moderate') ||
    severityLower.includes('stage 2') ||
    severityLower.includes('2nd degree')
  ) {
    return 'hsl(24 95% 53%)'; // orange-500
  }
  
  // Minor (yellow)
  return 'hsl(48 96% 53%)'; // yellow-500
};

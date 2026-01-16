// Comprehensive in-app instruction system
// All content uses i18n translation keys for multi-language support

export interface ModalInstruction {
  titleKey: string;
  textKey: string;
  imageDescription: string;
}

export interface WalkthroughStep {
  step: number;
  elementSelector: string;
  elementLabel: string;
  textKey: string;
  imageDescription: string;
}

export interface TooltipHint {
  elementSelector: string;
  elementLabel: string;
  textKey: string;
}

export interface SectionInstructions {
  modal: ModalInstruction[];
  walkthrough: WalkthroughStep[];
  tooltips: TooltipHint[];
}

export type InstructionSection = 
  | 'scheduling'
  | 'tasks' 
  | 'notes' 
  | 'diet' 
  | 'money'
  | 'keyInformation'
  | 'medications' 
  | 'appointments' 
  | 'aiReports'
  | 'timePayroll'
  | 'installApp';

export const instructions: Record<InstructionSection, SectionInstructions> = {
  scheduling: {
    modal: [
      {
        titleKey: 'instructions.scheduling.modal.welcome.title',
        textKey: 'instructions.scheduling.modal.welcome.text',
        imageDescription: 'Calendar view showing a week of shifts with different carers colour-coded'
      },
      {
        titleKey: 'instructions.scheduling.modal.viewModes.title',
        textKey: 'instructions.scheduling.modal.viewModes.text',
        imageDescription: 'Toggle buttons showing Week, Month, and List view options'
      },
      {
        titleKey: 'instructions.scheduling.modal.addShift.title',
        textKey: 'instructions.scheduling.modal.addShift.text',
        imageDescription: 'Shift creation form with date, start time, end time, and carer selection fields'
      },
      {
        titleKey: 'instructions.scheduling.modal.clockInOut.title',
        textKey: 'instructions.scheduling.modal.clockInOut.text',
        imageDescription: 'Clock In/Out button with timestamp display and GPS icon indicator'
      },
      {
        titleKey: 'instructions.scheduling.modal.requests.title',
        textKey: 'instructions.scheduling.modal.requests.text',
        imageDescription: 'Request cards showing pending shift change requests with approve/deny buttons'
      },
      {
        titleKey: 'instructions.scheduling.modal.export.title',
        textKey: 'instructions.scheduling.modal.export.text',
        imageDescription: 'Export button with CSV file icon and date range selector'
      }
    ],
    walkthrough: [
      {
        step: 1,
        elementSelector: '[data-walkthrough="schedule-calendar"]',
        elementLabel: 'Calendar',
        textKey: 'instructions.scheduling.walkthrough.step1',
        imageDescription: 'Calendar grid'
      },
      {
        step: 2,
        elementSelector: '[data-walkthrough="schedule-view-toggle"]',
        elementLabel: 'View toggle',
        textKey: 'instructions.scheduling.walkthrough.step2',
        imageDescription: 'Toggle buttons'
      },
      {
        step: 3,
        elementSelector: '[data-walkthrough="add-shift-button"]',
        elementLabel: 'Add Shift button',
        textKey: 'instructions.scheduling.walkthrough.step3',
        imageDescription: 'Plus icon'
      },
      {
        step: 4,
        elementSelector: '[data-walkthrough="clock-in-button"]',
        elementLabel: 'Clock In button',
        textKey: 'instructions.scheduling.walkthrough.step4',
        imageDescription: 'Clock icon'
      },
      {
        step: 5,
        elementSelector: '[data-walkthrough="scheduling-requests-tab"]',
        elementLabel: 'Requests tab',
        textKey: 'instructions.scheduling.walkthrough.step5',
        imageDescription: 'Request icon'
      },
      {
        step: 6,
        elementSelector: '[data-walkthrough="export-timesheet-button"]',
        elementLabel: 'Export button',
        textKey: 'instructions.scheduling.walkthrough.step6',
        imageDescription: 'Download icon'
      }
    ],
    tooltips: [
      {
        elementSelector: '[data-walkthrough="scheduling-overview-tab"]',
        elementLabel: 'Overview tab',
        textKey: 'instructions.scheduling.tooltip.overviewTab'
      },
      {
        elementSelector: '[data-walkthrough="scheduling-schedule-tab"]',
        elementLabel: 'Schedule tab',
        textKey: 'instructions.scheduling.tooltip.scheduleTab'
      },
      {
        elementSelector: '[data-walkthrough="scheduling-requests-tab"]',
        elementLabel: 'Requests tab',
        textKey: 'instructions.scheduling.tooltip.requestsTab'
      },
      {
        elementSelector: '[data-walkthrough="scheduling-leave-tab"]',
        elementLabel: 'Leave tab',
        textKey: 'instructions.scheduling.tooltip.leaveTab'
      },
      {
        elementSelector: '[data-walkthrough="clock-in-button"]',
        elementLabel: 'Clock In button',
        textKey: 'instructions.scheduling.tooltip.clockIn'
      }
    ]
  },

  tasks: {
    modal: [
      {
        titleKey: 'instructions.tasks.modal.welcome.title',
        textKey: 'instructions.tasks.modal.welcome.text',
        imageDescription: 'Dashboard view with Tasks section highlighted, showing active and completed task tabs'
      },
      {
        titleKey: 'instructions.tasks.modal.addTask.title',
        textKey: 'instructions.tasks.modal.addTask.text',
        imageDescription: 'Screenshot showing the Add Task button and the task creation form with title, description, and due date fields'
      },
      {
        titleKey: 'instructions.tasks.modal.recurring.title',
        textKey: 'instructions.tasks.modal.recurring.text',
        imageDescription: 'Diagram showing recurring task options: daily, weekly, and monthly cycles with arrows indicating auto-creation'
      },
      {
        titleKey: 'instructions.tasks.modal.complete.title',
        textKey: 'instructions.tasks.modal.complete.text',
        imageDescription: 'Animation of a checkmark appearing on a task card, moving it to the Done tab'
      },
      {
        titleKey: 'instructions.tasks.modal.assign.title',
        textKey: 'instructions.tasks.modal.assign.text',
        imageDescription: 'Dropdown menu showing team member avatars and names for task assignment'
      }
    ],
    walkthrough: [
      {
        step: 1,
        elementSelector: '[data-walkthrough="add-task-button"]',
        elementLabel: 'Add Task button',
        textKey: 'instructions.tasks.walkthrough.step1',
        imageDescription: 'Plus icon'
      },
      {
        step: 2,
        elementSelector: '[data-walkthrough="task-title-input"]',
        elementLabel: 'Task title field',
        textKey: 'instructions.tasks.walkthrough.step2',
        imageDescription: 'Text cursor in input field'
      },
      {
        step: 3,
        elementSelector: '[data-walkthrough="task-due-date"]',
        elementLabel: 'Due date picker',
        textKey: 'instructions.tasks.walkthrough.step3',
        imageDescription: 'Calendar icon with date'
      },
      {
        step: 4,
        elementSelector: '[data-walkthrough="task-recurring-toggle"]',
        elementLabel: 'Recurring toggle',
        textKey: 'instructions.tasks.walkthrough.step4',
        imageDescription: 'Repeat/cycle icon'
      },
      {
        step: 5,
        elementSelector: '[data-walkthrough="task-save-button"]',
        elementLabel: 'Save button',
        textKey: 'instructions.tasks.walkthrough.step5',
        imageDescription: 'Checkmark icon'
      },
      {
        step: 6,
        elementSelector: '[data-walkthrough="tasks-done-tab"]',
        elementLabel: 'Done tab',
        textKey: 'instructions.tasks.walkthrough.step6',
        imageDescription: 'Archive/completed icon'
      }
    ],
    tooltips: [
      {
        elementSelector: '[data-walkthrough="add-task-button"]',
        elementLabel: 'Add Task button',
        textKey: 'instructions.tasks.tooltip.addTask'
      },
      {
        elementSelector: '[data-walkthrough="tasks-active-tab"]',
        elementLabel: 'Active tab',
        textKey: 'instructions.tasks.tooltip.activeTab'
      },
      {
        elementSelector: '[data-walkthrough="tasks-done-tab"]',
        elementLabel: 'Done tab',
        textKey: 'instructions.tasks.tooltip.doneTab'
      },
      {
        elementSelector: '[data-walkthrough="task-recurring-toggle"]',
        elementLabel: 'Recurring checkbox',
        textKey: 'instructions.tasks.tooltip.recurring'
      },
      {
        elementSelector: '[data-walkthrough="task-assign-dropdown"]',
        elementLabel: 'Assign dropdown',
        textKey: 'instructions.tasks.tooltip.assign'
      }
    ]
  },

  notes: {
    modal: [
      {
        titleKey: 'instructions.notes.modal.welcome.title',
        textKey: 'instructions.notes.modal.welcome.text',
        imageDescription: 'Notes section with Today\'s Notes tab active, showing recent care notes with mood and activity tags'
      },
      {
        titleKey: 'instructions.notes.modal.addNote.title',
        textKey: 'instructions.notes.modal.addNote.text',
        imageDescription: 'Care note form with activity description, wellbeing trackers, and quick tags visible'
      },
      {
        titleKey: 'instructions.notes.modal.quickTags.title',
        textKey: 'instructions.notes.modal.quickTags.text',
        imageDescription: 'Colourful tag badges: Personal Care (blue), Meal Prep (green), Medication (purple), Outing (orange)'
      },
      {
        titleKey: 'instructions.notes.modal.wellbeing.title',
        textKey: 'instructions.notes.modal.wellbeing.text',
        imageDescription: 'Three tracker icons: mood emoji selector, eating/drinking status, bathroom usage indicator'
      },
      {
        titleKey: 'instructions.notes.modal.bodyMap.title',
        textKey: 'instructions.notes.modal.bodyMap.text',
        imageDescription: 'Human body outline with clickable regions highlighted, showing front and back views'
      },
      {
        titleKey: 'instructions.notes.modal.archive.title',
        textKey: 'instructions.notes.modal.archive.text',
        imageDescription: 'Calendar view with highlighted dates showing past notes, with date picker for navigation'
      }
    ],
    walkthrough: [
      {
        step: 1,
        elementSelector: '[data-walkthrough="add-note-button"]',
        elementLabel: 'Add Daily Note button',
        textKey: 'instructions.notes.walkthrough.step1',
        imageDescription: 'Plus icon with note'
      },
      {
        step: 2,
        elementSelector: '[data-walkthrough="note-activity-textarea"]',
        elementLabel: 'Activity textarea',
        textKey: 'instructions.notes.walkthrough.step2',
        imageDescription: 'Text entry area'
      },
      {
        step: 3,
        elementSelector: '[data-walkthrough="note-quick-tags"]',
        elementLabel: 'Quick Tags',
        textKey: 'instructions.notes.walkthrough.step3',
        imageDescription: 'Clickable tag badges'
      },
      {
        step: 4,
        elementSelector: '[data-walkthrough="note-mood-selector"]',
        elementLabel: 'Mood selector',
        textKey: 'instructions.notes.walkthrough.step4',
        imageDescription: 'Emoji faces for mood'
      },
      {
        step: 5,
        elementSelector: '[data-walkthrough="notes-bodymap-tab"]',
        elementLabel: 'Body Map tab',
        textKey: 'instructions.notes.walkthrough.step5',
        imageDescription: 'Body outline icon'
      },
      {
        step: 6,
        elementSelector: '[data-walkthrough="notes-archive-tab"]',
        elementLabel: 'Archive tab',
        textKey: 'instructions.notes.walkthrough.step6',
        imageDescription: 'Archive/folder icon'
      }
    ],
    tooltips: [
      {
        elementSelector: '[data-walkthrough="notes-today-tab"]',
        elementLabel: 'Today\'s Notes tab',
        textKey: 'instructions.notes.tooltip.todayTab'
      },
      {
        elementSelector: '[data-walkthrough="notes-bodymap-tab"]',
        elementLabel: 'Body Map tab',
        textKey: 'instructions.notes.tooltip.bodyMapTab'
      },
      {
        elementSelector: '[data-walkthrough="notes-archive-tab"]',
        elementLabel: 'Archive tab',
        textKey: 'instructions.notes.tooltip.archiveTab'
      },
      {
        elementSelector: '[data-walkthrough="note-quick-tags"]',
        elementLabel: 'Quick Tags',
        textKey: 'instructions.notes.tooltip.quickTags'
      },
      {
        elementSelector: '[data-walkthrough="note-incident-checkbox"]',
        elementLabel: 'Incident checkbox',
        textKey: 'instructions.notes.tooltip.incident'
      }
    ]
  },

  diet: {
    modal: [
      {
        titleKey: 'instructions.diet.modal.welcome.title',
        textKey: 'instructions.diet.modal.welcome.text',
        imageDescription: 'Diet section with meal type tabs: Breakfast, Lunch, Dinner, Snacks, Drinks'
      },
      {
        titleKey: 'instructions.diet.modal.mealTypes.title',
        textKey: 'instructions.diet.modal.mealTypes.text',
        imageDescription: 'Five tab icons representing each meal type with corresponding food/drink icons'
      },
      {
        titleKey: 'instructions.diet.modal.addEntry.title',
        textKey: 'instructions.diet.modal.addEntry.text',
        imageDescription: 'Entry form showing description field and portion left dropdown'
      },
      {
        titleKey: 'instructions.diet.modal.photos.title',
        textKey: 'instructions.diet.modal.photos.text',
        imageDescription: 'Camera icon and upload button with a sample meal photo thumbnail'
      },
      {
        titleKey: 'instructions.diet.modal.archive.title',
        textKey: 'instructions.diet.modal.archive.text',
        imageDescription: 'Archive tab showing historical diet entries grouped by date'
      }
    ],
    walkthrough: [
      {
        step: 1,
        elementSelector: '[data-walkthrough="diet-meal-tabs"]',
        elementLabel: 'Meal type tabs',
        textKey: 'instructions.diet.walkthrough.step1',
        imageDescription: 'Tab selector'
      },
      {
        step: 2,
        elementSelector: '[data-walkthrough="add-diet-entry-button"]',
        elementLabel: 'Add Entry button',
        textKey: 'instructions.diet.walkthrough.step2',
        imageDescription: 'Plus icon'
      },
      {
        step: 3,
        elementSelector: '[data-walkthrough="diet-description-field"]',
        elementLabel: 'Description field',
        textKey: 'instructions.diet.walkthrough.step3',
        imageDescription: 'Text entry'
      },
      {
        step: 4,
        elementSelector: '[data-walkthrough="diet-portion-selector"]',
        elementLabel: 'Portion selector',
        textKey: 'instructions.diet.walkthrough.step4',
        imageDescription: 'Dropdown menu'
      },
      {
        step: 5,
        elementSelector: '[data-walkthrough="diet-photo-upload"]',
        elementLabel: 'Photo upload',
        textKey: 'instructions.diet.walkthrough.step5',
        imageDescription: 'Camera icon'
      },
      {
        step: 6,
        elementSelector: '[data-walkthrough="diet-save-button"]',
        elementLabel: 'Save button',
        textKey: 'instructions.diet.walkthrough.step6',
        imageDescription: 'Checkmark'
      }
    ],
    tooltips: [
      {
        elementSelector: '[data-walkthrough="diet-breakfast-tab"]',
        elementLabel: 'Breakfast tab',
        textKey: 'instructions.diet.tooltip.breakfast'
      },
      {
        elementSelector: '[data-walkthrough="diet-portion-selector"]',
        elementLabel: 'Portion dropdown',
        textKey: 'instructions.diet.tooltip.portion'
      },
      {
        elementSelector: '[data-walkthrough="diet-photo-upload"]',
        elementLabel: 'Photo button',
        textKey: 'instructions.diet.tooltip.photo'
      },
      {
        elementSelector: '[data-walkthrough="diet-archive-tab"]',
        elementLabel: 'Archive tab',
        textKey: 'instructions.diet.tooltip.archiveTab'
      }
    ]
  },

  money: {
    modal: [
      {
        titleKey: 'instructions.money.modal.welcome.title',
        textKey: 'instructions.money.modal.welcome.text',
        imageDescription: 'Money tracking section showing income and expense summary with recent transactions'
      },
      {
        titleKey: 'instructions.money.modal.addEntry.title',
        textKey: 'instructions.money.modal.addEntry.text',
        imageDescription: 'Form showing amount, description, category selector, and income/expense toggle'
      },
      {
        titleKey: 'instructions.money.modal.categories.title',
        textKey: 'instructions.money.modal.categories.text',
        imageDescription: 'Category icons: Groceries, Transport, Medical, Activities, and more'
      },
      {
        titleKey: 'instructions.money.modal.receipts.title',
        textKey: 'instructions.money.modal.receipts.text',
        imageDescription: 'Camera icon with receipt photo upload and thumbnail preview'
      },
      {
        titleKey: 'instructions.money.modal.archive.title',
        textKey: 'instructions.money.modal.archive.text',
        imageDescription: 'Archive view showing transactions grouped by month with totals'
      }
    ],
    walkthrough: [],
    tooltips: []
  },

  keyInformation: {
    modal: [
      {
        titleKey: 'instructions.keyInformation.modal.welcome.title',
        textKey: 'instructions.keyInformation.modal.welcome.text',
        imageDescription: 'Key information dashboard showing emergency contacts and important details'
      },
      {
        titleKey: 'instructions.keyInformation.modal.contacts.title',
        textKey: 'instructions.keyInformation.modal.contacts.text',
        imageDescription: 'Contact cards with phone icons, names, and quick-dial buttons'
      },
      {
        titleKey: 'instructions.keyInformation.modal.riskAssessments.title',
        textKey: 'instructions.keyInformation.modal.riskAssessments.text',
        imageDescription: 'Risk assessment cards with severity indicators and mitigation strategies'
      },
      {
        titleKey: 'instructions.keyInformation.modal.medicalInfo.title',
        textKey: 'instructions.keyInformation.modal.medicalInfo.text',
        imageDescription: 'Medical history section with conditions, allergies, and GP details'
      },
      {
        titleKey: 'instructions.keyInformation.modal.documents.title',
        textKey: 'instructions.keyInformation.modal.documents.text',
        imageDescription: 'Document icons showing care plans, house rules, and important files'
      }
    ],
    walkthrough: [],
    tooltips: []
  },

  medications: {
    modal: [
      {
        titleKey: 'instructions.medications.modal.welcome.title',
        textKey: 'instructions.medications.modal.welcome.text',
        imageDescription: 'Medication Administration Record dashboard showing medication list and dose tracker'
      },
      {
        titleKey: 'instructions.medications.modal.addMed.title',
        textKey: 'instructions.medications.modal.addMed.text',
        imageDescription: 'Medication form with name, dosage, frequency, and time slot fields'
      },
      {
        titleKey: 'instructions.medications.modal.frequency.title',
        textKey: 'instructions.medications.modal.frequency.text',
        imageDescription: 'Diagram showing 1x, 2x, 3x, 4x daily frequency options with clock icons'
      },
      {
        titleKey: 'instructions.medications.modal.markDose.title',
        textKey: 'instructions.medications.modal.markDose.text',
        imageDescription: 'Dose card with check button, showing given/missed/refused status options'
      },
      {
        titleKey: 'instructions.medications.modal.history.title',
        textKey: 'instructions.medications.modal.history.text',
        imageDescription: 'Calendar view showing medication administration history with status indicators'
      }
    ],
    walkthrough: [
      {
        step: 1,
        elementSelector: '[data-walkthrough="add-medication-button"]',
        elementLabel: 'Add Medication button',
        textKey: 'instructions.medications.walkthrough.step1',
        imageDescription: 'Plus icon'
      },
      {
        step: 2,
        elementSelector: '[data-walkthrough="medication-name-field"]',
        elementLabel: 'Name field',
        textKey: 'instructions.medications.walkthrough.step2',
        imageDescription: 'Text entry'
      },
      {
        step: 3,
        elementSelector: '[data-walkthrough="medication-dosage-field"]',
        elementLabel: 'Dosage field',
        textKey: 'instructions.medications.walkthrough.step3',
        imageDescription: 'Dosage info'
      },
      {
        step: 4,
        elementSelector: '[data-walkthrough="medication-frequency-selector"]',
        elementLabel: 'Frequency selector',
        textKey: 'instructions.medications.walkthrough.step4',
        imageDescription: 'Dropdown'
      },
      {
        step: 5,
        elementSelector: '[data-walkthrough="medication-time-slots"]',
        elementLabel: 'Time slots',
        textKey: 'instructions.medications.walkthrough.step5',
        imageDescription: 'Clock icons'
      },
      {
        step: 6,
        elementSelector: '[data-walkthrough="dose-mark-taken-button"]',
        elementLabel: 'Mark as taken',
        textKey: 'instructions.medications.walkthrough.step6',
        imageDescription: 'Checkmark'
      }
    ],
    tooltips: [
      {
        elementSelector: '[data-walkthrough="medications-list-tab"]',
        elementLabel: 'Medications tab',
        textKey: 'instructions.medications.tooltip.medsTab'
      },
      {
        elementSelector: '[data-walkthrough="medications-mar-tab"]',
        elementLabel: 'MAR tab',
        textKey: 'instructions.medications.tooltip.marTab'
      },
      {
        elementSelector: '[data-walkthrough="dose-card"]',
        elementLabel: 'Dose card',
        textKey: 'instructions.medications.tooltip.doseCard'
      },
      {
        elementSelector: '[data-walkthrough="dose-mark-taken-button"]',
        elementLabel: 'Mark taken button',
        textKey: 'instructions.medications.tooltip.markTaken'
      }
    ]
  },

  appointments: {
    modal: [
      {
        titleKey: 'instructions.appointments.modal.welcome.title',
        textKey: 'instructions.appointments.modal.welcome.text',
        imageDescription: 'Appointments list showing upcoming events with date, time, and location badges'
      },
      {
        titleKey: 'instructions.appointments.modal.addAppt.title',
        textKey: 'instructions.appointments.modal.addAppt.text',
        imageDescription: 'Appointment form with title, description, date, time, and location fields'
      },
      {
        titleKey: 'instructions.appointments.modal.dateTime.title',
        textKey: 'instructions.appointments.modal.dateTime.text',
        imageDescription: 'Calendar date picker and time selector showing available time slots'
      },
      {
        titleKey: 'instructions.appointments.modal.location.title',
        textKey: 'instructions.appointments.modal.location.text',
        imageDescription: 'Map pin icon with text field for entering appointment location'
      },
      {
        titleKey: 'instructions.appointments.modal.status.title',
        textKey: 'instructions.appointments.modal.status.text',
        imageDescription: 'Status badges: Today (amber), Upcoming (green), Past (grey)'
      }
    ],
    walkthrough: [
      {
        step: 1,
        elementSelector: '[data-walkthrough="add-appointment-button"]',
        elementLabel: 'Add Appointment button',
        textKey: 'instructions.appointments.walkthrough.step1',
        imageDescription: 'Plus icon'
      },
      {
        step: 2,
        elementSelector: '[data-walkthrough="appointment-title-field"]',
        elementLabel: 'Title field',
        textKey: 'instructions.appointments.walkthrough.step2',
        imageDescription: 'Text entry'
      },
      {
        step: 3,
        elementSelector: '[data-walkthrough="appointment-date-picker"]',
        elementLabel: 'Date picker',
        textKey: 'instructions.appointments.walkthrough.step3',
        imageDescription: 'Calendar'
      },
      {
        step: 4,
        elementSelector: '[data-walkthrough="appointment-time-picker"]',
        elementLabel: 'Time picker',
        textKey: 'instructions.appointments.walkthrough.step4',
        imageDescription: 'Clock'
      },
      {
        step: 5,
        elementSelector: '[data-walkthrough="appointment-location-field"]',
        elementLabel: 'Location field',
        textKey: 'instructions.appointments.walkthrough.step5',
        imageDescription: 'Map pin'
      },
      {
        step: 6,
        elementSelector: '[data-walkthrough="appointment-save-button"]',
        elementLabel: 'Save button',
        textKey: 'instructions.appointments.walkthrough.step6',
        imageDescription: 'Checkmark'
      }
    ],
    tooltips: [
      {
        elementSelector: '[data-walkthrough="appointments-upcoming-tab"]',
        elementLabel: 'Upcoming tab',
        textKey: 'instructions.appointments.tooltip.upcomingTab'
      },
      {
        elementSelector: '[data-walkthrough="appointments-archive-tab"]',
        elementLabel: 'Past tab',
        textKey: 'instructions.appointments.tooltip.pastTab'
      },
      {
        elementSelector: '[data-walkthrough="appointment-status-badge"]',
        elementLabel: 'Status badge',
        textKey: 'instructions.appointments.tooltip.status'
      }
    ]
  },

  aiReports: {
    modal: [
      {
        titleKey: 'instructions.aiReports.modal.welcome.title',
        textKey: 'instructions.aiReports.modal.welcome.text',
        imageDescription: 'AI Reports section showing generated summaries with insights and highlights'
      },
      {
        titleKey: 'instructions.aiReports.modal.generate.title',
        textKey: 'instructions.aiReports.modal.generate.text',
        imageDescription: 'Generate button with AI sparkle icon and loading animation'
      },
      {
        titleKey: 'instructions.aiReports.modal.dateRange.title',
        textKey: 'instructions.aiReports.modal.dateRange.text',
        imageDescription: 'Date range selector showing week, month, and custom options'
      },
      {
        titleKey: 'instructions.aiReports.modal.export.title',
        textKey: 'instructions.aiReports.modal.export.text',
        imageDescription: 'Export and share options with download and print icons'
      }
    ],
    walkthrough: [],
    tooltips: []
  },

  timePayroll: {
    modal: [
      {
        titleKey: 'instructions.timePayroll.modal.welcome.title',
        textKey: 'instructions.timePayroll.modal.welcome.text',
        imageDescription: 'Time tracking dashboard showing weekly summary card and calendar view'
      },
      {
        titleKey: 'instructions.timePayroll.modal.weeklyHours.title',
        textKey: 'instructions.timePayroll.modal.weeklyHours.text',
        imageDescription: 'Summary card displaying total hours logged with progress indicator'
      },
      {
        titleKey: 'instructions.timePayroll.modal.calendarView.title',
        textKey: 'instructions.timePayroll.modal.calendarView.text',
        imageDescription: 'Calendar with time entries shown as coloured blocks, with hours visible'
      },
      {
        titleKey: 'instructions.timePayroll.modal.export.title',
        textKey: 'instructions.timePayroll.modal.export.text',
        imageDescription: 'Export button with date range picker and CSV download icon'
      }
    ],
    walkthrough: [
      {
        step: 1,
        elementSelector: '[data-walkthrough="weekly-hours-card"]',
        elementLabel: 'Weekly hours card',
        textKey: 'instructions.timePayroll.walkthrough.step1',
        imageDescription: 'Summary'
      },
      {
        step: 2,
        elementSelector: '[data-walkthrough="time-calendar"]',
        elementLabel: 'Calendar',
        textKey: 'instructions.timePayroll.walkthrough.step2',
        imageDescription: 'Calendar'
      },
      {
        step: 3,
        elementSelector: '[data-walkthrough="time-entry"]',
        elementLabel: 'Time entry',
        textKey: 'instructions.timePayroll.walkthrough.step3',
        imageDescription: 'Entry card'
      },
      {
        step: 4,
        elementSelector: '[data-walkthrough="export-payroll-button"]',
        elementLabel: 'Export button',
        textKey: 'instructions.timePayroll.walkthrough.step4',
        imageDescription: 'Download'
      }
    ],
    tooltips: [
      {
        elementSelector: '[data-walkthrough="weekly-hours-card"]',
        elementLabel: 'Weekly hours',
        textKey: 'instructions.timePayroll.tooltip.weeklyHours'
      },
      {
        elementSelector: '[data-walkthrough="export-payroll-button"]',
        elementLabel: 'Export button',
        textKey: 'instructions.timePayroll.tooltip.export'
      }
    ]
  },

  installApp: {
    modal: [
      {
        titleKey: 'instructions.installApp.modal.welcome.title',
        textKey: 'instructions.installApp.modal.welcome.text',
        imageDescription: 'App icon being added to phone home screen with sparkle effect'
      },
      {
        titleKey: 'instructions.installApp.modal.benefits.title',
        textKey: 'instructions.installApp.modal.benefits.text',
        imageDescription: 'Icons showing fast loading, offline access, and notifications benefits'
      },
      {
        titleKey: 'instructions.installApp.modal.android.title',
        textKey: 'instructions.installApp.modal.android.text',
        imageDescription: 'Chrome browser showing install banner with Add to Home Screen option'
      },
      {
        titleKey: 'instructions.installApp.modal.ios.title',
        textKey: 'instructions.installApp.modal.ios.text',
        imageDescription: 'Safari share menu highlighting Add to Home Screen option'
      }
    ],
    walkthrough: [],
    tooltips: []
  }
};

// Helper function to get all sections
export const getAllSections = (): InstructionSection[] => {
  return Object.keys(instructions) as InstructionSection[];
};

// Helper to get section display name translation key
export const getSectionDisplayNameKey = (section: InstructionSection): string => {
  const displayNames: Record<InstructionSection, string> = {
    scheduling: 'sections.scheduling',
    tasks: 'sections.tasks',
    notes: 'sections.notes',
    diet: 'sections.diet',
    money: 'sections.money',
    keyInformation: 'sections.keyInfo',
    medications: 'sections.medications',
    appointments: 'sections.appointments',
    aiReports: 'sections.aiReports',
    timePayroll: 'sections.timePayroll',
    installApp: 'menu.installApp'
  };
  return displayNames[section];
};

import { useTasksForDate, type TaskWithMaster } from './use-tasks';

// Re-export the enhanced interface
export type CalendarTask = TaskWithMaster;

// Hook to fetch calendar tasks for a specific date
export function useCalendarTasks(selectedDate: Date = new Date()) {
  console.log('📅 useCalendarTasks called with date:', selectedDate.toISOString());
  return useTasksForDate(selectedDate);
}

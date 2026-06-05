export type HabitType = 'BUILDING' | 'BREAKING';
export type LogStatus = 'COMPLETED' | 'RELAPSED';

export interface User {
  id: number;
  email: string;
  timezone: string;
}

export interface Habit {
  id: number;
  name: string;
  type: HabitType;
  streak: number;
  longest_streak: number;
  streak_start_date: string | null;
  created_at: string;
  marked_today: boolean;
}

export interface HabitLog {
  logged_date: string;
  status: LogStatus;
}

export interface HabitWithLogs {
  id: number;
  name: string;
  type: HabitType;
  streak_start_date: string | null;
  created_at: string;
  logs: HabitLog[];
}

export interface GoalHabit {
  id: number;
  name: string;
  type: HabitType;
  streak: number;
}

export interface Goal {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  habits: GoalHabit[];
}

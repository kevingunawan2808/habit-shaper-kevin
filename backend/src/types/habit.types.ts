export enum HabitType {
  BUILDING = 'BUILDING',
  BREAKING = 'BREAKING',
}

export enum LogStatus {
  COMPLETED = 'COMPLETED',
  RELAPSED = 'RELAPSED',
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  timezone: string;
  created_at: Date;
}

export interface Habit {
  id: number;
  user_id: number;
  name: string;
  type: HabitType;
  streak_start_date: string | null;
  created_at: Date;
}

export interface HabitLog {
  id: number;
  habit_id: number;
  logged_date: string;
  status: LogStatus;
  created_at: Date;
}

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: Date;
}

export interface GoalHabit {
  goal_id: number;
  habit_id: number;
  created_at: Date;
}

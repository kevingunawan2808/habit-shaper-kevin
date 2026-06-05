import { Pool, RowDataPacket } from 'mysql2/promise';
import { HabitType } from '../types/habit.types';
import { getLocalDateString, dateDiffInDays, addDaysToDateString } from '../utils/timezone.utils';

export class StreakService {
  constructor(private pool: Pool) {}

  async calculateStreak(
    habitId: number,
    timezone: string,
    habitType: HabitType,
    streakStartDate: string | null
  ): Promise<number> {
    if (habitType === HabitType.BREAKING) {
      return this.calculateBreakingStreak(streakStartDate, timezone);
    }
    return this.calculateBuildingStreak(habitId, timezone, streakStartDate);
  }

  async calculateLongestStreak(
    habitId: number,
    timezone: string,
    habitType: HabitType,
    streakStartDate: string | null,
    createdAt: unknown
  ): Promise<number> {
    if (habitType === HabitType.BUILDING) {
      return this.calculateLongestBuildingStreak(habitId);
    }
    return this.calculateLongestBreakingStreak(habitId, timezone, streakStartDate, createdAt);
  }

  private toDateStr(val: unknown): string {
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return String(val).slice(0, 10);
  }

  private calculateBreakingStreak(streakStartDate: string | null, timezone: string): number {
    if (!streakStartDate) return 0;
    const today = getLocalDateString(timezone);
    return Math.max(0, dateDiffInDays(this.toDateStr(streakStartDate), today));
  }

  private async calculateBuildingStreak(
    habitId: number,
    timezone: string,
    streakStartDate: string | null
  ): Promise<number> {
    if (!streakStartDate) return 0;

    const today = getLocalDateString(timezone);
    const yesterday = addDaysToDateString(today, -1);

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT logged_date FROM habit_logs
       WHERE habit_id = ? AND status = 'COMPLETED'
       ORDER BY logged_date DESC
       LIMIT 1`,
      [habitId]
    );

    if (rows.length === 0) return 0;

    const latestLog = this.toDateStr(rows[0].logged_date);
    if (latestLog !== today && latestLog !== yesterday) return 0;

    return dateDiffInDays(this.toDateStr(streakStartDate), latestLog) + 1;
  }

  private async calculateLongestBuildingStreak(habitId: number): Promise<number> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT logged_date FROM habit_logs
       WHERE habit_id = ? AND status = 'COMPLETED'
       ORDER BY logged_date ASC`,
      [habitId]
    );

    if (rows.length === 0) return 0;

    const dates = rows.map(r => this.toDateStr(r.logged_date));
    let max = 1, current = 1;

    for (let i = 1; i < dates.length; i++) {
      if (dateDiffInDays(dates[i - 1], dates[i]) === 1) {
        current++;
        if (current > max) max = current;
      } else {
        current = 1;
      }
    }

    return max;
  }

  private async calculateLongestBreakingStreak(
    habitId: number,
    timezone: string,
    streakStartDate: string | null,
    createdAt: unknown
  ): Promise<number> {
    const today = getLocalDateString(timezone);
    const createdDate = this.toDateStr(createdAt);

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT logged_date FROM habit_logs
       WHERE habit_id = ? AND status = 'RELAPSED'
       ORDER BY logged_date ASC`,
      [habitId]
    );

    const relapses = rows.map(r => this.toDateStr(r.logged_date));

    if (relapses.length === 0) {
      // Never relapsed — longest = from creation to today
      return Math.max(0, dateDiffInDays(createdDate, today));
    }

    let max = 0;

    // Period from creation to first relapse
    max = Math.max(max, dateDiffInDays(createdDate, relapses[0]));

    // Gaps between consecutive relapses (days between them, excluding the relapse days)
    for (let i = 1; i < relapses.length; i++) {
      max = Math.max(max, dateDiffInDays(relapses[i - 1], relapses[i]) - 1);
    }

    // Current clean period
    if (streakStartDate) {
      max = Math.max(max, Math.max(0, dateDiffInDays(this.toDateStr(streakStartDate), today)));
    }

    return max;
  }
}

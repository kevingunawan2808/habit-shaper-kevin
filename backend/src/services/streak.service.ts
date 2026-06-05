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
    return this.calculateBuildingStreak(habitId, timezone);
  }

  private calculateBreakingStreak(streakStartDate: string | null, timezone: string): number {
    if (!streakStartDate) return 0;
    const today = getLocalDateString(timezone);
    return Math.max(0, dateDiffInDays(streakStartDate, today));
  }

  private async calculateBuildingStreak(habitId: number, timezone: string): Promise<number> {
    // Streak counts consecutive COMPLETED days backward from yesterday
    const yesterday = addDaysToDateString(getLocalDateString(timezone), -1);

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT logged_date FROM habit_logs
       WHERE habit_id = ? AND status = 'COMPLETED'
       ORDER BY logged_date DESC`,
      [habitId]
    );

    if (rows.length === 0) return 0;

    let streak = 0;
    let expected = yesterday;

    for (const row of rows) {
      // mysql2 returns DATE columns as strings or Date objects depending on config
      const loggedDate =
        row.logged_date instanceof Date
          ? row.logged_date.toISOString().slice(0, 10)
          : String(row.logged_date).slice(0, 10);

      if (loggedDate === expected) {
        streak++;
        expected = addDaysToDateString(expected, -1);
      } else if (loggedDate < expected) {
        break;
      }
      // loggedDate > expected means today's log; skip and keep looking
    }

    return streak;
  }
}

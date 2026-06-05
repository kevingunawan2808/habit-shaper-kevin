import { Pool, RowDataPacket } from 'mysql2/promise';
import { LogStatus, HabitType } from '../types/habit.types';
import { getLocalDateString, addDaysToDateString, dateDiffInDays } from '../utils/timezone.utils';

function toDateStr(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

interface HabitRow {
  type: HabitType;
  timezone: string;
  streak_start_date: unknown;
  current_streak: number;
  longest_streak: number;
  last_log: unknown;
}

export class HabitMarkingService {
  constructor(private pool: Pool) {}

  async markHabit(habitId: number, userId: number, status: LogStatus): Promise<void> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT h.type, h.streak_start_date, h.current_streak, h.longest_streak, h.last_log, u.timezone
       FROM habits h JOIN users u ON u.id = h.user_id
       WHERE h.id = ? AND h.user_id = ?`,
      [habitId, userId]
    );

    if (rows.length === 0) throw new Error('Habit not found');

    const habit = rows[0] as HabitRow;

    if (habit.type === HabitType.BUILDING && status !== LogStatus.COMPLETED) {
      throw new Error('Building habits can only be marked COMPLETED');
    }
    if (habit.type === HabitType.BREAKING && status !== LogStatus.RELAPSED) {
      throw new Error('Breaking habits can only be marked RELAPSED');
    }

    const today = getLocalDateString(habit.timezone);
    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO habit_logs (habit_id, logged_date, status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [habitId, today, status]
      );

      if (status === LogStatus.COMPLETED) {
        const yesterday = addDaysToDateString(today, -1);
        const lastLog = habit.last_log ? toDateStr(habit.last_log) : null;

        let newStreak: number;
        if (lastLog === today) {
          newStreak = habit.current_streak; // re-mark same day, no change
        } else if (lastLog === yesterday) {
          newStreak = habit.current_streak + 1; // continuing streak
        } else {
          newStreak = 1; // new streak
        }

        const newLongest = Math.max(habit.longest_streak, newStreak);

        await conn.query(
          `UPDATE habits SET current_streak = ?, longest_streak = ?, last_log = ? WHERE id = ?`,
          [newStreak, newLongest, today, habitId]
        );
      } else {
        // RELAPSED — save longest clean period before reset
        const streakStart = habit.streak_start_date ? toDateStr(habit.streak_start_date) : today;
        const currentClean = Math.max(0, dateDiffInDays(streakStart, today));
        const newLongest = Math.max(habit.longest_streak, currentClean);
        const tomorrow = addDaysToDateString(today, 1);

        await conn.query(
          `UPDATE habits SET streak_start_date = ?, longest_streak = ?, last_log = ? WHERE id = ?`,
          [tomorrow, newLongest, today, habitId]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async unmarkHabit(habitId: number, userId: number): Promise<void> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT h.type, h.current_streak, h.last_log, u.timezone
       FROM habits h JOIN users u ON u.id = h.user_id
       WHERE h.id = ? AND h.user_id = ?`,
      [habitId, userId]
    );

    if (rows.length === 0) throw new Error('Habit not found');

    const habit = rows[0];
    const today = getLocalDateString(habit.timezone);

    await this.pool.query(
      `DELETE FROM habit_logs WHERE habit_id = ? AND logged_date = ?`,
      [habitId, today]
    );

    if (habit.type === HabitType.BUILDING) {
      const lastLog = habit.last_log ? toDateStr(habit.last_log) : null;
      if (lastLog === today) {
        const prevStreak = Math.max(0, habit.current_streak - 1);
        const yesterday = addDaysToDateString(today, -1);
        const prevLastLog = prevStreak > 0 ? yesterday : null;
        await this.pool.query(
          `UPDATE habits SET current_streak = ?, last_log = ? WHERE id = ?`,
          [prevStreak, prevLastLog, habitId]
        );
      }
    }
  }
}

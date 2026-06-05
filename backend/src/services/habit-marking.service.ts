import { Pool, RowDataPacket } from 'mysql2/promise';
import { LogStatus, HabitType, Habit } from '../types/habit.types';
import { getLocalDateString, addDaysToDateString } from '../utils/timezone.utils';

interface HabitWithTimezone extends Habit {
  timezone: string;
}

export class HabitMarkingService {
  constructor(private pool: Pool) {}

  async markHabit(habitId: number, userId: number, status: LogStatus): Promise<void> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT h.*, u.timezone FROM habits h
       JOIN users u ON u.id = h.user_id
       WHERE h.id = ? AND h.user_id = ?`,
      [habitId, userId]
    );

    if (rows.length === 0) throw new Error('Habit not found');

    const habit = rows[0] as HabitWithTimezone;

    if (habit.type === HabitType.BUILDING && status !== LogStatus.COMPLETED) {
      throw new Error('Building habits can only be marked COMPLETED');
    }
    if (habit.type === HabitType.BREAKING && status !== LogStatus.RELAPSED) {
      throw new Error('Breaking habits can only be marked RELAPSED');
    }

    const loggedDate = getLocalDateString(habit.timezone);
    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO habit_logs (habit_id, logged_date, status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [habitId, loggedDate, status]
      );

      if (status === LogStatus.RELAPSED) {
        // Streak restarts the day after the relapse
        const tomorrow = addDaysToDateString(loggedDate, 1);
        await conn.query(
          `UPDATE habits SET streak_start_date = ? WHERE id = ?`,
          [tomorrow, habitId]
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
      `SELECT h.*, u.timezone FROM habits h
       JOIN users u ON u.id = h.user_id
       WHERE h.id = ? AND h.user_id = ?`,
      [habitId, userId]
    );

    if (rows.length === 0) throw new Error('Habit not found');

    const habit = rows[0] as HabitWithTimezone;
    const loggedDate = getLocalDateString(habit.timezone);

    await this.pool.query(
      `DELETE FROM habit_logs WHERE habit_id = ? AND logged_date = ?`,
      [habitId, loggedDate]
    );
  }
}

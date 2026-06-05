import { Request, Response } from 'express';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { HabitType, LogStatus } from '../types/habit.types';
import { HabitMarkingService } from '../services/habit-marking.service';
import { StreakService } from '../services/streak.service';
import { getLocalDateString } from '../utils/timezone.utils';

export class HabitsController {
  private markingService: HabitMarkingService;
  private streakService: StreakService;

  constructor(private pool: Pool) {
    this.markingService = new HabitMarkingService(pool);
    this.streakService = new StreakService(pool);
  }

  async getHabits(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const [habits] = await this.pool.query<RowDataPacket[]>(
      `SELECT h.*, u.timezone FROM habits h
       JOIN users u ON u.id = h.user_id
       WHERE h.user_id = ?
       ORDER BY h.created_at ASC`,
      [userId]
    );

    const habitsWithStreak = await Promise.all(
      habits.map(async (habit) => {
        const streak = await this.streakService.calculateStreak(
          habit.id,
          habit.timezone,
          habit.type as HabitType,
          habit.streak_start_date
        );
        const { timezone: _tz, ...rest } = habit;
        return { ...rest, streak };
      })
    );

    res.json({ success: true, data: habitsWithStreak });
  }

  async createHabit(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { name, type } = req.body;

    if (!name || !type) {
      res.status(400).json({ success: false, message: 'Name and type are required' });
      return;
    }

    if (!Object.values(HabitType).includes(type)) {
      res.status(400).json({ success: false, message: 'Type must be BUILDING or BREAKING' });
      return;
    }

    let streakStartDate: string | null = null;

    if (type === HabitType.BREAKING) {
      const [userRows] = await this.pool.query<RowDataPacket[]>(
        'SELECT timezone FROM users WHERE id = ?',
        [userId]
      );
      const timezone = (userRows[0]?.timezone as string) || 'UTC';
      streakStartDate = getLocalDateString(timezone);
    }

    const [result] = await this.pool.query<ResultSetHeader>(
      'INSERT INTO habits (user_id, name, type, streak_start_date) VALUES (?, ?, ?, ?)',
      [userId, name, type, streakStartDate]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId, name, type, streak_start_date: streakStartDate, streak: 0 },
    });
  }

  async markHabit(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const habitId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!status || !Object.values(LogStatus).includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be COMPLETED or RELAPSED' });
      return;
    }

    try {
      await this.markingService.markHabit(habitId, userId, status as LogStatus);
      res.json({ success: true, data: { message: 'Habit marked successfully' } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (message === 'Habit not found') {
        res.status(404).json({ success: false, message });
      } else if (message.includes('can only be marked')) {
        res.status(400).json({ success: false, message });
      } else {
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  }

  async unmarkHabit(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const habitId = parseInt(req.params.id, 10);

    try {
      await this.markingService.unmarkHabit(habitId, userId);
      res.json({ success: true, data: { message: 'Mark removed' } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      if (message === 'Habit not found') {
        res.status(404).json({ success: false, message });
      } else {
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  }

  async getWeeklyHabits(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      return;
    }

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT h.id, h.name, h.type, h.streak_start_date, h.created_at,
         hl.logged_date, hl.status AS log_status
       FROM habits h
       LEFT JOIN habit_logs hl ON hl.habit_id = h.id
         AND hl.logged_date BETWEEN ? AND ?
       WHERE h.user_id = ?
       ORDER BY h.created_at ASC, hl.logged_date ASC`,
      [startDate, endDate, userId]
    );

    const habitMap = new Map<number, {
      id: number; name: string; type: string;
      streak_start_date: string | null; created_at: string;
      logs: { logged_date: string; status: string }[];
    }>();

    for (const row of rows) {
      if (!habitMap.has(row.id)) {
        habitMap.set(row.id, {
          id: row.id, name: row.name, type: row.type,
          streak_start_date: row.streak_start_date,
          created_at: row.created_at instanceof Date
            ? row.created_at.toISOString()
            : String(row.created_at),
          logs: [],
        });
      }
      if (row.logged_date) {
        const logDate = row.logged_date instanceof Date
          ? row.logged_date.toISOString().slice(0, 10)
          : String(row.logged_date).slice(0, 10);
        habitMap.get(row.id)!.logs.push({ logged_date: logDate, status: row.log_status });
      }
    }

    res.json({ success: true, data: Array.from(habitMap.values()) });
  }

  async deleteHabit(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const habitId = parseInt(req.params.id, 10);

    const [result] = await this.pool.query<ResultSetHeader>(
      'DELETE FROM habits WHERE id = ? AND user_id = ?',
      [habitId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Habit not found' });
      return;
    }

    res.json({ success: true, data: { message: 'Habit deleted' } });
  }
}

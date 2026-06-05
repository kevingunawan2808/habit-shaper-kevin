import { Request, Response } from 'express';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getLocalDateString, addDaysToDateString, dateDiffInDays } from '../utils/timezone.utils';

function toDateStr(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function parseId(val: string): number | null {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

export class GoalsController {
  constructor(private pool: Pool) {}

  async getGoals(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const [userRows] = await this.pool.query<RowDataPacket[]>(
        'SELECT timezone FROM users WHERE id = ?',
        [userId]
      );
      const timezone = (userRows[0]?.timezone as string) || 'UTC';
      const today = getLocalDateString(timezone);
      const yesterday = addDaysToDateString(today, -1);

      const [goals] = await this.pool.query<RowDataPacket[]>(
        `SELECT g.id, g.name, g.description, g.start_date, g.end_date, g.created_at,
           JSON_ARRAYAGG(
             IF(gh.habit_id IS NOT NULL,
               JSON_OBJECT(
                 'id', h.id, 'name', h.name, 'type', h.type,
                 'current_streak', h.current_streak,
                 'longest_streak', h.longest_streak,
                 'last_log', h.last_log,
                 'streak_start_date', h.streak_start_date
               ),
               NULL)
           ) AS habits
         FROM goals g
         LEFT JOIN goal_habits gh ON gh.goal_id = g.id
         LEFT JOIN habits h ON h.id = gh.habit_id
         WHERE g.user_id = ?
         GROUP BY g.id
         ORDER BY g.created_at ASC`,
        [userId]
      );

      const data = goals.map((g) => ({
        ...g,
        start_date: g.start_date ? toDateStr(g.start_date) : null,
        end_date: g.end_date ? toDateStr(g.end_date) : null,
        habits: ((g.habits as unknown[]) || []).filter(Boolean).map((h: unknown) => {
          const habit = h as {
            id: number; name: string; type: string;
            current_streak: number; longest_streak: number;
            last_log: unknown; streak_start_date: unknown;
          };
          let streak: number;
          if (habit.type === 'BUILDING') {
            const lastLog = habit.last_log ? toDateStr(habit.last_log) : null;
            streak = (lastLog === today || lastLog === yesterday) ? habit.current_streak : 0;
          } else {
            const streakStart = habit.streak_start_date ? toDateStr(habit.streak_start_date) : today;
            streak = Math.max(0, dateDiffInDays(streakStart, today));
          }
          return { id: habit.id, name: habit.name, type: habit.type, streak };
        }),
      }));

      res.json({ success: true, data });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async createGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { name, description, start_date, end_date } = req.body;

      if (!name) {
        res.status(400).json({ success: false, message: 'Name is required' });
        return;
      }

      if (start_date && !isValidDate(start_date)) {
        res.status(400).json({ success: false, message: 'start_date must be in YYYY-MM-DD format' });
        return;
      }

      if (end_date && !isValidDate(end_date)) {
        res.status(400).json({ success: false, message: 'end_date must be in YYYY-MM-DD format' });
        return;
      }

      if (start_date && end_date && start_date >= end_date) {
        res.status(400).json({ success: false, message: 'End date must be after start date' });
        return;
      }

      const [result] = await this.pool.query<ResultSetHeader>(
        'INSERT INTO goals (user_id, name, description, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
        [userId, name, description ?? null, start_date ?? null, end_date ?? null]
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.insertId, name,
          description: description ?? null,
          start_date: start_date ?? null,
          end_date: end_date ?? null,
          habits: [],
        },
      });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async updateGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const goalId = parseId(req.params.id);

      if (!goalId) {
        res.status(400).json({ success: false, message: 'Invalid goal ID' });
        return;
      }

      const { name, description, start_date, end_date } = req.body;

      if (!name) {
        res.status(400).json({ success: false, message: 'Name is required' });
        return;
      }

      if (start_date && !isValidDate(start_date)) {
        res.status(400).json({ success: false, message: 'start_date must be in YYYY-MM-DD format' });
        return;
      }

      if (end_date && !isValidDate(end_date)) {
        res.status(400).json({ success: false, message: 'end_date must be in YYYY-MM-DD format' });
        return;
      }

      if (start_date && end_date && start_date >= end_date) {
        res.status(400).json({ success: false, message: 'End date must be after start date' });
        return;
      }

      const [result] = await this.pool.query<ResultSetHeader>(
        'UPDATE goals SET name = ?, description = ?, start_date = ?, end_date = ? WHERE id = ? AND user_id = ?',
        [name, description ?? null, start_date ?? null, end_date ?? null, goalId, userId]
      );

      if (result.affectedRows === 0) {
        res.status(404).json({ success: false, message: 'Goal not found' });
        return;
      }

      res.json({ success: true, data: { id: goalId, name, description: description ?? null, start_date: start_date ?? null, end_date: end_date ?? null } });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async linkHabit(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const goalId = parseId(req.params.goalId);
      const habitId = parseId(req.params.habitId);

      if (!goalId || !habitId) {
        res.status(400).json({ success: false, message: 'Invalid goal or habit ID' });
        return;
      }

      const [[goalRow], [habitRow]] = await Promise.all([
        this.pool.query<RowDataPacket[]>('SELECT id FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]),
        this.pool.query<RowDataPacket[]>('SELECT id FROM habits WHERE id = ? AND user_id = ?', [habitId, userId]),
      ]);

      if (goalRow.length === 0) {
        res.status(404).json({ success: false, message: 'Goal not found' });
        return;
      }
      if (habitRow.length === 0) {
        res.status(404).json({ success: false, message: 'Habit not found' });
        return;
      }

      await this.pool.query(
        'INSERT IGNORE INTO goal_habits (goal_id, habit_id) VALUES (?, ?)',
        [goalId, habitId]
      );

      res.json({ success: true, data: { message: 'Habit linked to goal' } });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async unlinkHabit(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const goalId = parseId(req.params.goalId);
      const habitId = parseId(req.params.habitId);

      if (!goalId || !habitId) {
        res.status(400).json({ success: false, message: 'Invalid goal or habit ID' });
        return;
      }

      await this.pool.query(
        `DELETE gh FROM goal_habits gh
         JOIN goals g ON g.id = gh.goal_id
         WHERE gh.goal_id = ? AND gh.habit_id = ? AND g.user_id = ?`,
        [goalId, habitId, userId]
      );

      res.json({ success: true, data: { message: 'Habit unlinked from goal' } });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async deleteGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const goalId = parseId(req.params.id);

      if (!goalId) {
        res.status(400).json({ success: false, message: 'Invalid goal ID' });
        return;
      }

      const [result] = await this.pool.query<ResultSetHeader>(
        'DELETE FROM goals WHERE id = ? AND user_id = ?',
        [goalId, userId]
      );

      if (result.affectedRows === 0) {
        res.status(404).json({ success: false, message: 'Goal not found' });
        return;
      }

      res.json({ success: true, data: { message: 'Goal deleted' } });
    } catch {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

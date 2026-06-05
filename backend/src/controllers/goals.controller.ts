import { Request, Response } from 'express';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getLocalDateString, addDaysToDateString, dateDiffInDays } from '../utils/timezone.utils';

function toDateStr(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

export class GoalsController {
  constructor(private pool: Pool) {}

  async getGoals(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const [userRows] = await this.pool.query<RowDataPacket[]>(
      'SELECT timezone FROM users WHERE id = ?',
      [userId]
    );
    const timezone = (userRows[0]?.timezone as string) || 'UTC';
    const today = getLocalDateString(timezone);
    const yesterday = addDaysToDateString(today, -1);

    const [goals] = await this.pool.query<RowDataPacket[]>(
      `SELECT g.id, g.name, g.description, g.created_at,
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
  }

  async createGoal(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Name is required' });
      return;
    }

    const [result] = await this.pool.query<ResultSetHeader>(
      'INSERT INTO goals (user_id, name, description) VALUES (?, ?, ?)',
      [userId, name, description ?? null]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId, name, description: description ?? null, habits: [] },
    });
  }

  async linkHabit(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const goalId = parseInt(req.params.goalId, 10);
    const habitId = parseInt(req.params.habitId, 10);

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
  }

  async unlinkHabit(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const goalId = parseInt(req.params.goalId, 10);
    const habitId = parseInt(req.params.habitId, 10);

    await this.pool.query(
      `DELETE gh FROM goal_habits gh
       JOIN goals g ON g.id = gh.goal_id
       WHERE gh.goal_id = ? AND gh.habit_id = ? AND g.user_id = ?`,
      [goalId, habitId, userId]
    );

    res.json({ success: true, data: { message: 'Habit unlinked from goal' } });
  }

  async deleteGoal(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const goalId = parseInt(req.params.id, 10);

    const [result] = await this.pool.query<ResultSetHeader>(
      'DELETE FROM goals WHERE id = ? AND user_id = ?',
      [goalId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }

    res.json({ success: true, data: { message: 'Goal deleted' } });
  }
}

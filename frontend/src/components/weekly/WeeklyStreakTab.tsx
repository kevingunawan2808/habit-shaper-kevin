import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { HabitWithLogs } from '../../types';

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type CellValue = '✅' | '❌' | '—';

function cellValue(habit: HabitWithLogs, dateStr: string, today: string): CellValue {
  if (dateStr > today) return '—';

  const log = habit.logs.find(l => String(l.logged_date).slice(0, 10) === dateStr);

  if (habit.type === 'BREAKING') {
    return log?.status === 'RELAPSED' ? '❌' : '✅';
  }

  if (!log) {
    const habitCreated = toDateStr(new Date(habit.created_at));
    if (dateStr < habitCreated) return '—';
  }

  return log?.status === 'COMPLETED' ? '✅' : '❌';
}

function missedSummary(habit: HabitWithLogs, weekDates: string[], today: string): { missed: number; evaluable: number } {
  let evaluable = 0;
  let missed = 0;
  for (const d of weekDates) {
    const val = cellValue(habit, d, today);
    if (val === '—') continue;
    evaluable++;
    if (val === '❌') missed++;
  }
  return { missed, evaluable };
}

function cellClass(val: CellValue): string {
  if (val === '✅') return 'text-sage';
  if (val === '❌') return 'text-terracotta';
  return 'text-charcoal/20';
}

export default function WeeklyStreakTab() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = toDateStr(new Date());
  const startStr = toDateStr(weekStart);
  const endStr = toDateStr(addDays(weekStart, 6));
  const weekDates = Array.from({ length: 7 }, (_, i) => toDateStr(addDays(weekStart, i)));

  useEffect(() => {
    setLoading(true);
    setError('');
    api.habits.weekly(startStr, endStr)
      .then(setHabits)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [startStr, endStr]);

  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div>
      <h2 className="text-lg font-semibold text-deep-teal mb-4">Weekly Streak</h2>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setWeekStart(prev => addDays(prev, -7))}
          className="px-2 py-1 text-charcoal/40 hover:text-charcoal text-lg"
        >
          ◄
        </button>
        <span className="text-sm font-medium text-charcoal min-w-[200px] text-center">{weekLabel}</span>
        <button
          onClick={() => setWeekStart(prev => addDays(prev, 7))}
          className="px-2 py-1 text-charcoal/40 hover:text-charcoal text-lg"
        >
          ►
        </button>
      </div>

      {error && <p className="text-terracotta text-sm mb-3">{error}</p>}
      {loading && <p className="text-charcoal/50">Loading...</p>}

      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-cream-dark rounded-lg">
            <thead>
              <tr className="bg-cream-dark text-xs font-semibold text-deep-teal uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Habit</th>
                {DAY_LABELS.map((d, i) => {
                  const ds = toDateStr(addDays(weekStart, i));
                  return (
                    <th
                      key={d}
                      className={`px-3 py-3 text-center ${ds === today ? 'bg-amber-gold/10 text-amber-gold-dark' : ''}`}
                    >
                      {d}
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-center">Missed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {habits.map(habit => {
                const { missed, evaluable } = missedSummary(habit, weekDates, today);
                return (
                  <tr key={habit.id} className="hover:bg-cream/50">
                    <td className="px-4 py-3 text-sm font-medium text-deep-teal">{habit.name}</td>
                    {weekDates.map((ds, i) => {
                      const val = cellValue(habit, ds, today);
                      return (
                        <td
                          key={i}
                          className={`px-3 py-3 text-center text-base ${cellClass(val)} ${ds === today ? 'bg-amber-gold/5' : ''}`}
                        >
                          {val}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-semibold ${missed === 0 ? 'text-sage' : 'text-terracotta'}`}>
                        {missed}/{evaluable}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {habits.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-charcoal/40">
                    No habits found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

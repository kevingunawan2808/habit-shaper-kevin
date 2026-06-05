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

export default function WeeklyStreakTab() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = toDateStr(new Date());
  const startStr = toDateStr(weekStart);
  const endStr = toDateStr(addDays(weekStart, 6));

  useEffect(() => {
    setLoading(true);
    setError('');
    api.habits.weekly(startStr, endStr)
      .then(setHabits)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [startStr, endStr]);

  function cellValue(habit: HabitWithLogs, dateStr: string): CellValue {
    if (dateStr > today) return '—';

    // Normalise log dates before comparing (backend may return Date objects or strings)
    const log = habit.logs.find(l => String(l.logged_date).slice(0, 10) === dateStr);

    if (habit.type === 'BREAKING') {
      // Clean by default — absence of a relapse log means ✅ for any past day
      return log?.status === 'RELAPSED' ? '❌' : '✅';
    }

    // BUILDING: hide days before the habit was created
    if (!log) {
      const habitCreated = toDateStr(new Date(habit.created_at));
      if (dateStr < habitCreated) return '—';
    }

    return log?.status === 'COMPLETED' ? '✅' : '❌';
  }

  function cellClass(val: CellValue): string {
    if (val === '✅') return 'text-green-500';
    if (val === '❌') return 'text-red-500';
    return 'text-gray-300';
  }

  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Streak</h2>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setWeekStart(prev => addDays(prev, -7))}
          className="px-2 py-1 text-gray-500 hover:text-gray-900 text-lg"
        >
          ◄
        </button>
        <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">{weekLabel}</span>
        <button
          onClick={() => setWeekStart(prev => addDays(prev, 7))}
          className="px-2 py-1 text-gray-500 hover:text-gray-900 text-lg"
        >
          ►
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {loading && <p className="text-gray-500">Loading...</p>}

      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3 text-left">Habit</th>
                {DAY_LABELS.map((d, i) => {
                  const ds = toDateStr(addDays(weekStart, i));
                  return (
                    <th
                      key={d}
                      className={`px-3 py-3 text-center ${ds === today ? 'bg-blue-50 text-blue-600' : ''}`}
                    >
                      {d}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {habits.map(habit => (
                <tr key={habit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{habit.name}</td>
                  {Array.from({ length: 7 }, (_, i) => {
                    const ds = toDateStr(addDays(weekStart, i));
                    const val = cellValue(habit, ds);
                    return (
                      <td key={i} className={`px-3 py-3 text-center text-base ${cellClass(val)} ${ds === today ? 'bg-blue-50' : ''}`}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {habits.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
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

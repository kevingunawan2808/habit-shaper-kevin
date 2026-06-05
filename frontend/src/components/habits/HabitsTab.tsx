import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Habit } from '../../types';
import AddHabitModal from './AddHabitModal';

export default function HabitsTab() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [marking, setMarking] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => { loadHabits(); }, []);

  async function loadHabits() {
    try {
      setHabits(await api.habits.list());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  }

  async function doMark(id: number, status: 'COMPLETED' | 'RELAPSED') {
    setMarking(id);
    setConfirmId(null);
    try {
      await api.habits.mark(id, status);
      await loadHabits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark habit');
    } finally {
      setMarking(null);
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Habits</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded"
        >
          + Add Habit
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Habit Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Current Streak</th>
              <th className="px-4 py-3">Longest Streak</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {habits.map((habit, i) => (
              <tr key={habit.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{habit.name}</td>
                <td className="px-4 py-3">
                  {habit.type === 'BUILDING' ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">BUILD</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">BREAK</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{habit.streak} days</td>
                <td className="px-4 py-3 text-sm text-gray-700">{habit.longest_streak} days</td>
                <td className="px-4 py-3">
                  {habit.type === 'BUILDING' ? (
                    habit.marked_today ? (
                      <span className="text-xs text-green-600 font-medium">✓ Done</span>
                    ) : (
                      <button
                        onClick={() => doMark(habit.id, 'COMPLETED')}
                        disabled={marking === habit.id}
                        className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded"
                      >
                        {marking === habit.id ? '...' : 'Complete'}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setConfirmId(habit.id)}
                      disabled={marking === habit.id}
                      className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded"
                    >
                      {marking === habit.id ? '...' : 'Relapse'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {habits.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No habits yet. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Relapse confirmation dialog */}
      {confirmId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Relapse</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure? This resets your streak.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmId(null)} className="text-sm text-gray-600 hover:underline">
                Cancel
              </button>
              <button
                onClick={() => doMark(confirmId, 'RELAPSED')}
                className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded"
              >
                Yes, relapsed
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddHabitModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); loadHabits(); }}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Habit } from '../../types';
import AddHabitModal from './AddHabitModal';

const PRAISE = [
  '🎉 Crushed it!',
  '🔥 On fire!',
  '⭐ Nailed it!',
  '💪 Beast mode!',
  '🚀 Keep soaring!',
  '✨ Brilliant!',
  '🏆 Champion!',
  '😤 Unstoppable!',
];

const MOTIVATION = [
  "💪 Rise again!",
  "🌅 Tomorrow's a new day",
  "❤️ You've got this",
  "🔄 Reset & rebuild",
  "🌱 Setbacks build strength",
  "🧠 Awareness is progress",
  "🕊️ Be kind to yourself",
];

function pickMessage(list: string[], id: number) {
  return list[id % list.length];
}

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

  if (loading) return <p className="text-charcoal/50">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-deep-teal">Habits</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-deep-teal hover:bg-deep-teal-dark text-cream text-sm px-3 py-1.5 rounded transition-colors"
        >
          + Add Habit
        </button>
      </div>

      {error && <p className="text-terracotta text-sm mb-3">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-cream-dark rounded-lg">
          <thead>
            <tr className="bg-cream-dark text-left text-xs font-semibold text-deep-teal uppercase tracking-wider">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Habit</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Current Streak</th>
              <th className="px-4 py-3">Longest Streak</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-dark">
            {habits.map((habit, i) => (
              <tr key={habit.id} className="hover:bg-cream/50">
                <td className="px-4 py-3 text-sm text-charcoal/50">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-deep-teal">{habit.name}</td>
                <td className="px-4 py-3">
                  {habit.type === 'BUILDING' ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-sage/20 text-sage-dark">BUILD</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-terracotta/20 text-terracotta-dark">BREAK</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-amber-gold">{habit.streak} days</td>
                <td className="px-4 py-3 text-sm font-semibold text-charcoal">{habit.longest_streak} days</td>
                <td className="px-4 py-3">
                  {habit.type === 'BUILDING' ? (
                    habit.marked_today ? (
                      <span className="text-sm font-semibold text-sage">{pickMessage(PRAISE, habit.id)}</span>
                    ) : (
                      <button
                        onClick={() => doMark(habit.id, 'COMPLETED')}
                        disabled={marking === habit.id}
                        className="bg-sage hover:bg-sage-dark disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition-colors"
                      >
                        {marking === habit.id ? '...' : 'Complete'}
                      </button>
                    )
                  ) : (
                    habit.marked_today ? (
                      <span className="text-sm font-semibold text-terracotta">{pickMessage(MOTIVATION, habit.id)}</span>
                    ) : (
                      <button
                        onClick={() => setConfirmId(habit.id)}
                        disabled={marking === habit.id}
                        className="bg-terracotta hover:bg-terracotta-dark disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition-colors"
                      >
                        {marking === habit.id ? '...' : 'Relapse'}
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
            {habits.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-charcoal/40">
                  No habits yet. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmId !== null && (
        <div className="fixed inset-0 bg-charcoal/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 border border-cream-dark">
            <p className="text-3xl mb-3">😔</p>
            <h3 className="text-lg font-semibold text-deep-teal mb-1">It happens to everyone</h3>
            <p className="text-sm text-charcoal/60 mb-4">
              Acknowledging a slip is already a sign of strength. Your streak will reset — but your commitment doesn't have to.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmId(null)} className="text-sm text-charcoal/60 hover:text-charcoal">
                Actually, I'm okay
              </button>
              <button
                onClick={() => doMark(confirmId, 'RELAPSED')}
                className="bg-terracotta hover:bg-terracotta-dark text-white text-sm px-4 py-2 rounded transition-colors"
              >
                Record relapse
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

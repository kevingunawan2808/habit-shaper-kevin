import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Goal } from '../../types';
import AddGoalModal from './AddGoalModal';
import LinkHabitModal from './LinkHabitModal';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function goalPeriod(goal: Goal): { percent: number; label: string; color: string } | null {
  if (!goal.start_date || !goal.end_date) return null;
  const start = new Date(goal.start_date).getTime();
  const end = new Date(goal.end_date).getTime();
  const now = new Date(todayStr()).getTime();
  const total = end - start;
  const elapsed = now - start;
  const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const daysLeft = Math.ceil((end - now) / 86400000);

  let label: string;
  if (daysLeft < 0) label = `Ended ${Math.abs(daysLeft)}d ago`;
  else if (daysLeft === 0) label = 'Ends today';
  else label = `${daysLeft}d left`;

  const color = percent >= 90 ? 'bg-red-500' : percent >= 60 ? 'bg-amber-400' : 'bg-blue-500';
  return { percent, label, color };
}

export default function GoalsTab() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [linkingGoalId, setLinkingGoalId] = useState<number | null>(null);

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    try {
      setGoals(await api.goals.list());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }

  function toggleGoal(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Goals</h2>
        <button
          onClick={() => setShowAddGoal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded"
        >
          + Add Goal
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="space-y-3">
        {goals.map(goal => (
          <div key={goal.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGoal(goal.id)}
              className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-gray-50"
            >
              <span className="text-gray-500 text-xs">{expanded.has(goal.id) ? '▼' : '▶'}</span>
              <span className="font-medium text-gray-900">{goal.name}</span>
              {goal.description && (
                <span className="text-sm text-gray-400 truncate">{goal.description}</span>
              )}
              <span className="ml-auto text-xs text-gray-400">{goal.habits.length} habit{goal.habits.length !== 1 ? 's' : ''}</span>
            </button>

            {(() => {
              const period = goalPeriod(goal);
              if (!period) return null;
              return (
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{goal.start_date} → {goal.end_date}</span>
                    <span className={period.percent >= 90 ? 'text-red-500 font-medium' : period.percent >= 60 ? 'text-amber-500 font-medium' : ''}>{period.label}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${period.color} h-2 rounded-full transition-all`}
                      style={{ width: `${period.percent}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {expanded.has(goal.id) && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="overflow-x-auto mt-3">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                        <th className="pb-2 pr-4">#</th>
                        <th className="pb-2 pr-4">Habit Name</th>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2">Current Streak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {goal.habits.map((habit, i) => (
                        <tr key={habit.id}>
                          <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                          <td className="py-2 pr-4 font-medium text-gray-900">{habit.name}</td>
                          <td className="py-2 pr-4">
                            {habit.type === 'BUILDING' ? (
                              <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">BUILD</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">BREAK</span>
                            )}
                          </td>
                          <td className="py-2 text-gray-700">{habit.streak} days</td>
                        </tr>
                      ))}
                      {goal.habits.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-gray-400">
                            No habits linked yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => setLinkingGoalId(goal.id)}
                  className="mt-3 text-sm text-blue-500 hover:underline"
                >
                  + Link Habit
                </button>
              </div>
            )}
          </div>
        ))}

        {goals.length === 0 && (
          <p className="text-center text-gray-400 py-8">No goals yet. Add one to get started.</p>
        )}
      </div>

      {showAddGoal && (
        <AddGoalModal
          onClose={() => setShowAddGoal(false)}
          onCreated={() => { setShowAddGoal(false); loadGoals(); }}
        />
      )}

      {linkingGoalId !== null && (
        <LinkHabitModal
          goalId={linkingGoalId}
          linkedHabitIds={goals.find(g => g.id === linkingGoalId)?.habits.map(h => h.id) ?? []}
          onClose={() => setLinkingGoalId(null)}
          onLinked={() => { setLinkingGoalId(null); loadGoals(); }}
        />
      )}
    </div>
  );
}

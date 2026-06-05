import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Goal } from '../../types';
import AddGoalModal from './AddGoalModal';
import EditGoalModal from './EditGoalModal';
import LinkHabitModal from './LinkHabitModal';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function goalPeriod(goal: Goal): { percent: number; label: string; color: string; isEnded: boolean } | null {
  if (!goal.start_date || !goal.end_date) return null;
  const start = new Date(goal.start_date).getTime();
  const end = new Date(goal.end_date).getTime();
  const now = new Date(todayStr()).getTime();
  const total = end - start;
  const elapsed = now - start;
  const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const daysLeft = Math.ceil((end - now) / 86400000);
  const isEnded = daysLeft < 0;

  let label: string;
  if (isEnded) label = `Ended ${Math.abs(daysLeft)}d ago`;
  else if (daysLeft === 0) label = 'Ends today';
  else label = `${daysLeft}d left`;

  const color = isEnded ? 'bg-green-500' : percent >= 90 ? 'bg-red-500' : percent >= 60 ? 'bg-amber-400' : 'bg-blue-500';
  return { percent, label, color, isEnded };
}

export default function GoalsTab() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  async function doDelete(id: number) {
    setDeleting(true);
    try {
      await api.goals.delete(id);
      setDeletingGoalId(null);
      await loadGoals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    } finally {
      setDeleting(false);
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
            <div className="flex items-center hover:bg-gray-50">
              <button
                onClick={() => toggleGoal(goal.id)}
                className="flex-1 text-left px-4 py-3 flex items-center gap-2 min-w-0"
              >
                <span className="text-gray-500 text-xs shrink-0">{expanded.has(goal.id) ? '▼' : '▶'}</span>
                <span className="font-medium text-gray-900 truncate">{goal.name}</span>
                {goal.description && (
                  <span className="text-sm text-gray-400 truncate hidden sm:block">{goal.description}</span>
                )}
              </button>
              <div className="flex items-center gap-1 px-3 shrink-0">
                <span className="text-xs text-gray-400 mr-2">{goal.habits.length} habit{goal.habits.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => setEditingGoal(goal)}
                  className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingGoalId(goal.id)}
                  className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {(() => {
              const period = goalPeriod(goal);
              if (!period) return null;
              return (
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{goal.start_date} → {goal.end_date}</span>
                    <span className={period.isEnded ? 'text-green-600 font-medium' : period.percent >= 90 ? 'text-red-500 font-medium' : period.percent >= 60 ? 'text-amber-500 font-medium' : ''}>{period.label}</span>
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

      {/* Delete confirmation */}
      {deletingGoalId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Goal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure? This will remove the goal and all its habit links. Habits themselves won't be deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeletingGoalId(null)} className="text-sm text-gray-600 hover:underline">
                Cancel
              </button>
              <button
                onClick={() => doDelete(deletingGoalId)}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddGoal && (
        <AddGoalModal
          onClose={() => setShowAddGoal(false)}
          onCreated={() => { setShowAddGoal(false); loadGoals(); }}
        />
      )}

      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onUpdated={() => { setEditingGoal(null); loadGoals(); }}
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

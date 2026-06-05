import { useState, useEffect } from 'react';
import Modal from '../Modal';
import { api } from '../../api/client';
import type { Habit } from '../../types';

interface Props {
  goalId: number;
  linkedHabitIds: number[];
  onClose: () => void;
  onLinked: () => void;
}

export default function LinkHabitModal({ goalId, linkedHabitIds, onClose, onLinked }: Props) {
  const [available, setAvailable] = useState<Habit[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.habits.list()
      .then(all => setAvailable(all.filter(h => !linkedHabitIds.includes(h.id))))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load habits'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) { setError('Please select a habit'); return; }
    setLoading(true);
    try {
      await api.goals.linkHabit(goalId, selectedId as number);
      onLinked();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to link habit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Link Habit to Goal" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Habit</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(Number(e.target.value))}
            className="w-full border border-cream-dark rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-teal"
          >
            <option value="">Select a habit...</option>
            {available.map(h => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.type === 'BUILDING' ? 'Build' : 'Break'})
              </option>
            ))}
          </select>
          {available.length === 0 && !error && (
            <p className="text-sm text-charcoal/40 mt-1">All habits are already linked.</p>
          )}
        </div>
        {error && <p className="text-terracotta text-sm">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="text-sm text-charcoal/60 hover:text-charcoal">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedId}
            className="bg-deep-teal hover:bg-deep-teal-dark disabled:opacity-50 text-cream text-sm px-4 py-2 rounded transition-colors"
          >
            {loading ? 'Linking...' : 'Link Habit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

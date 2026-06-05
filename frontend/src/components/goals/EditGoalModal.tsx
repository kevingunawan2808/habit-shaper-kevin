import { useState } from 'react';
import Modal from '../Modal';
import { api } from '../../api/client';
import type { Goal } from '../../types';

interface Props {
  goal: Goal;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditGoalModal({ goal, onClose, onUpdated }: Props) {
  const [name, setName] = useState(goal.name);
  const [description, setDescription] = useState(goal.description ?? '');
  const [hasPeriod, setHasPeriod] = useState(!!(goal.start_date && goal.end_date));
  const [startDate, setStartDate] = useState(goal.start_date ?? '');
  const [endDate, setEndDate] = useState(goal.end_date ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (hasPeriod && !endDate) { setError('End date is required for a timed goal'); return; }
    if (hasPeriod && startDate && endDate <= startDate) { setError('End date must be after start date'); return; }

    setLoading(true);
    try {
      await api.goals.update(goal.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        start_date: hasPeriod && startDate ? startDate : undefined,
        end_date: hasPeriod && endDate ? endDate : undefined,
      });
      onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Edit Goal" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="edit-has-period"
            type="checkbox"
            checked={hasPeriod}
            onChange={e => setHasPeriod(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          <label htmlFor="edit-has-period" className="text-sm font-medium text-gray-700 cursor-pointer">
            Set a time period
          </label>
        </div>

        {hasPeriod && (
          <div className="grid grid-cols-2 gap-3 pl-6 border-l-2 border-blue-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="text-sm text-gray-600 hover:underline">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

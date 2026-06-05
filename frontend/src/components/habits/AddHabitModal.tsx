import { useState } from 'react';
import Modal from '../Modal';
import { api } from '../../api/client';
import type { HabitType } from '../../types';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddHabitModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<HabitType>('BUILDING');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    try {
      await api.habits.create({ name: name.trim(), type });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create habit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add Habit" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Exercise daily"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as HabitType)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BUILDING">Building — habit to establish</option>
            <option value="BREAKING">Breaking — habit to stop</option>
          </select>
        </div>
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
            {loading ? 'Adding...' : 'Add Habit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

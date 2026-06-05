import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import HabitsTab from './habits/HabitsTab';
import GoalsTab from './goals/GoalsTab';
import WeeklyStreakTab from './weekly/WeeklyStreakTab';

type Tab = 'habits' | 'goals' | 'weekly';

const TAB_LABELS: Record<Tab, string> = {
  habits: 'Habits',
  goals: 'Goals',
  weekly: 'Weekly Streak',
};

export default function Layout() {
  const [tab, setTab] = useState<Tab>('habits');
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🏋️ Habit Shaper</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button onClick={logout} className="text-sm text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 flex justify-center gap-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      <main className="p-6 max-w-5xl mx-auto">
        {tab === 'habits' && <HabitsTab />}
        {tab === 'goals' && <GoalsTab />}
        {tab === 'weekly' && <WeeklyStreakTab />}
      </main>
    </div>
  );
}

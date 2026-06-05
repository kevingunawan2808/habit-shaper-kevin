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
    <div className="min-h-screen bg-cream">
      <header className="bg-deep-teal px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-cream">🏋️ Habit Shaper</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-cream/70">{user?.email}</span>
          <button onClick={logout} className="text-sm text-cream/70 hover:text-cream transition-colors">
            Logout
          </button>
        </div>
      </header>

      <nav className="bg-deep-teal-dark flex justify-center gap-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 px-5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-amber-gold text-amber-gold'
                : 'border-transparent text-cream/60 hover:text-cream'
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

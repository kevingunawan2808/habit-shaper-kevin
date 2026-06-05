import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onGoLogin: () => void;
}

export default function RegisterPage({ onGoLogin }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-cream-dark p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-deep-teal mb-1">Habit Shaper</h1>
        <p className="text-sm text-charcoal/60 mb-6">Create your account</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-cream-dark rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-cream-dark rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full border border-cream-dark rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-teal"
            />
          </div>
          {error && <p className="text-terracotta text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-deep-teal hover:bg-deep-teal-dark disabled:opacity-50 text-cream py-2 rounded text-sm font-medium transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-charcoal/60">
          Already have an account?{' '}
          <button onClick={onGoLogin} className="text-deep-teal hover:underline font-medium">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

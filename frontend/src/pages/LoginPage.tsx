import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onGoRegister: () => void;
}

export default function LoginPage({ onGoRegister }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-cream-dark p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-deep-teal mb-1">Habit Shaper</h1>
        <p className="text-sm text-charcoal/60 mb-6">Sign in to your account</p>
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
          {error && <p className="text-terracotta text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-deep-teal hover:bg-deep-teal-dark disabled:opacity-50 text-cream py-2 rounded text-sm font-medium transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-charcoal/60">
          Don't have an account?{' '}
          <button onClick={onGoRegister} className="text-deep-teal hover:underline font-medium">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

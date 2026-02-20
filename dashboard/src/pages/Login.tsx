import { useState } from 'react';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../api';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { username, password });
      onLogin(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-genesis-dark flex items-center justify-center p-4">
      {/* Matrix rain background effect */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="matrix-rain" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 mb-4">
            <Shield className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-orbitron font-bold text-cyan-400 tracking-wider">
            GENESIS
          </h1>
          <p className="text-cyan-600 font-mono text-sm mt-2">
            SOVEREIGN SECURITY PLATFORM v2.0
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="bg-genesis-darker rounded-xl border border-cyan-500/30 p-8">
          <h2 className="text-xl font-rajdhani font-semibold text-white mb-6 text-center">
            SECURE ACCESS
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-cyan-400 text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-genesis-dark border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-cyan-400 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-genesis-dark border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors font-mono pr-12"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-600 hover:text-cyan-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg font-rajdhani font-semibold hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AUTHENTICATING...
              </>
            ) : (
              'ACCESS SYSTEM'
            )}
          </button>

          <p className="text-center text-cyan-700 text-xs mt-6">
            Demo: admin / genesis2024
          </p>
        </form>
      </div>
    </div>
  );
}

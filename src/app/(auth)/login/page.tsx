'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#030712]">
      {/* ── Animated Background Orbs ─────────────────── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1929] via-[#030712] to-[#0a0118]" />

        {/* Orb 1 — Blue */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)',
            animationDuration: '8s',
          }}
        />

        {/* Orb 2 — Indigo */}
        <div
          className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)',
            animationDuration: '10s',
            animationDelay: '2s',
          }}
        />

        {/* Orb 3 — Cyan */}
        <div
          className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full opacity-10 blur-3xl animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.5) 0%, transparent 70%)',
            animationDuration: '12s',
            animationDelay: '4s',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* ── Login Card ───────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-card/50 backdrop-blur-xl border border-border/30 rounded-2xl shadow-2xl shadow-black/40 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
              <Zap className="w-7 h-7 text-blue-400" />
              <div className="absolute inset-0 rounded-2xl bg-blue-500/5 blur-md" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight drop-shadow-[0_0_15px_rgba(59,130,246,0.25)]">
              BotAtlas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automation Intelligence Platform
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground/80"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@botatlas.com"
                required
                autoComplete="email"
                className="h-11 px-4 rounded-lg bg-background/50 border border-border/50 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground/80"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 px-4 pr-11 rounded-lg bg-background/50 border border-border/50 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <p className="text-xs text-muted-foreground/60 text-center">
              Demo Credentials
            </p>
            <div className="flex justify-center gap-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@botatlas.com');
                  setPassword('admin123');
                }}
                className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
              >
                Admin
              </button>
              <span className="text-border/50">|</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('reviewer@botatlas.com');
                  setPassword('review123');
                }}
                className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
              >
                Reviewer
              </button>
              <span className="text-border/50">|</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('viewer@botatlas.com');
                  setPassword('view123');
                }}
                className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
              >
                Viewer
              </button>
            </div>
          </div>
        </div>

        {/* Subtle glow below card */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-blue-500/10 blur-2xl rounded-full" />
      </div>
    </div>
  );
}

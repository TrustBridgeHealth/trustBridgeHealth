// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({
        email,
        password,
        totpCode: totpCode || undefined,
      });

      // Redirect based on role
      if (response.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (response.user.role === 'PROVIDER') {
        router.push('/provider');
      } else {
        router.push('/patient');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      if (errorMessage.includes('2FA') || errorMessage.includes('TOTP')) {
        setNeedsTotp(true);
        setError('Please enter your 2FA code');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center' }}>
          TrustBridge Health
        </h1>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', textAlign: 'center', color: '#6b7280' }}>
          Sign In
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1.125rem',
                }}
                disabled={loading}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {needsTotp && (
            <div className="form-group">
              <label className="form-label" htmlFor="totpCode">
                2FA Code
              </label>
              <input
                id="totpCode"
                type="text"
                className="form-input"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                disabled={loading}
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.5rem' }}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#2563eb', textDecoration: 'underline' }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

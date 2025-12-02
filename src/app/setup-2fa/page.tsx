// src/app/setup-2fa/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enrollTotp, verifyTotp } from '@/lib/api-client';

export default function Setup2FAPage() {
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'enroll' | 'verify'>('enroll');

  useEffect(() => {
    // Enroll in 2FA on mount
    enrollTotp()
      .then((response) => {
        setQrCodeUrl(response.qrCodeUrl);
        setSecret(response.secret);
        setBackupCodes(response.backupCodes);
        setStep('verify');
      })
      .catch((err) => {
        setError(err.message || 'Failed to enroll in 2FA');
      });
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await verifyTotp(totpCode);
      setSuccess('2FA enabled successfully!');
      setTimeout(() => {
        router.push('/patient');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center' }}>
          Setup Two-Factor Authentication
        </h1>

        {step === 'enroll' && (
          <div style={{ textAlign: 'center' }}>
            <div>Loading QR code...</div>
          </div>
        )}

        {step === 'verify' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {qrCodeUrl && (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <img src={qrCodeUrl} alt="QR Code" style={{ maxWidth: '100%', border: '1px solid #d1d5db', borderRadius: '8px' }} />
                </div>
              )}
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                2. Or enter this secret manually: <code style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{secret}</code>
              </p>
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                3. Enter the 6-digit code from your app to verify:
              </p>
            </div>

            <form onSubmit={handleVerify}>
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
                  required
                  disabled={loading}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={loading || totpCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
              </button>
            </form>

            {backupCodes.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '6px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>⚠️ Save these backup codes:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontFamily: 'monospace' }}>
                  {backupCodes.map((code, i) => (
                    <div key={i} style={{ padding: '0.25rem', background: 'white', borderRadius: '4px', textAlign: 'center' }}>
                      {code}
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#92400e' }}>
                  Store these in a safe place. You can use them to access your account if you lose your device.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}




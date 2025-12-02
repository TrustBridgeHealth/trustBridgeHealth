// src/components/ShareFileModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { shareFile, getAdminUsers, AdminUser } from '@/lib/api-client';

interface ShareFileModalProps {
  fileId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Provider {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function ShareFileModal({ fileId, onClose, onSuccess }: ShareFileModalProps) {
  const [users, setUsers] = useState<Provider[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try to get providers first (for patients)
      try {
        const response = await fetch('/api/users/providers', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data.providers || []);
          setLoading(false);
          return;
        }
      } catch (err) {
        // Fall through to admin users endpoint
      }

      // Fallback to admin users endpoint (for admins)
      try {
        const response = await getAdminUsers({ pageSize: 100, role: 'PROVIDER' });
        setUsers(response.data.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
        })));
      } catch (err: any) {
        // If that fails, try getting all users
        const response = await getAdminUsers({ pageSize: 100 });
        // Filter to only providers
        const providers = response.data.filter(u => u.role === 'PROVIDER');
        setUsers(providers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
        })));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedUserId) {
      setError('Please select a provider');
      return;
    }

    try {
      setSharing(true);
      setError('');
      setSuccess('');
      
      await shareFile({
        fileId,
        granteeId: selectedUserId,
        canDownload: true,
      });
      
      setSuccess('File shared successfully!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to share file');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Share File with Provider</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading providers...</p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="user">
                Select Provider
              </label>
              <select
                id="user"
                className="form-input"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={sharing}
              >
                <option value="">-- Select a provider --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} {user.name && `(${user.email})`}
                  </option>
                ))}
              </select>
              {users.length === 0 && !loading && (
                <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  No providers available. Please contact an administrator.
                </p>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={sharing}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleShare}
                disabled={!selectedUserId || sharing || users.length === 0}
              >
                {sharing ? (
                  <>
                    <span className="spinner" style={{ width: '14px', height: '14px', marginRight: '0.5rem' }}></span>
                    Sharing...
                  </>
                ) : (
                  'Share'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

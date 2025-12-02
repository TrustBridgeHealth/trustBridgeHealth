// src/app/provider/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout, listFiles } from '@/lib/api-client';
import FileList from '@/components/FileList';

export default function ProviderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [loadingShared, setLoadingShared] = useState(true);
  const [fileStats, setFileStats] = useState({ total: 0, totalSize: 0 });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadSharedFiles();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser.role !== 'PROVIDER') {
        router.push('/');
        return;
      }
      setUser(currentUser);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadSharedFiles = async () => {
    try {
      setLoadingShared(true);
      // Get all files (backend should filter to only shared files)
      const allFiles = await listFiles();
      setSharedFiles(allFiles.files);
      
      const totalSize = allFiles.files.reduce((sum, f) => sum + f.size, 0);
      setFileStats({
        total: allFiles.files.length,
        totalSize,
      });
    } catch (err) {
      console.error('Failed to load shared files:', err);
    } finally {
      setLoadingShared(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(0, 0, 0, 0.1)', padding: '1rem 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TrustBridge Health
            </h1>
            <span style={{ padding: '0.25rem 0.75rem', background: '#d1fae5', color: '#065f46', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
              Provider Portal
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600' }}>
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'D'}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{user?.name || 'Provider'}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user?.email}</div>
              </div>
            </div>
            {!user?.twoFactorEnabled && (
              <a
                href="/setup-2fa"
                style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '0.875rem', padding: '0.5rem' }}
              >
                Setup 2FA
              </a>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="container" style={{ padding: '2rem 0' }}>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 grid-cols-sm-2" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <h3>Shared Files</h3>
            <div className="stat-value">{fileStats.total}</div>
            <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>Files shared with you</p>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <h3>Total Size</h3>
            <div className="stat-value">{(fileStats.totalSize / 1024 / 1024).toFixed(2)} MB</div>
            <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>Downloaded files</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Welcome, {user?.name || 'Provider'}!</h2>
          <p style={{ opacity: 0.9 }}>View and download medical files shared by your patients.</p>
        </div>

        {loadingShared ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading shared files...</p>
          </div>
        ) : (
          <FileList showShareButton={false} />
        )}
      </main>
    </div>
  );
}

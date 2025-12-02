// src/app/patient/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout, listFiles } from '@/lib/api-client';
import FileUpload from '@/components/FileUpload';
import FileList from '@/components/FileList';
import ShareFileModal from '@/components/ShareFileModal';

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareModalFileId, setShareModalFileId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fileStats, setFileStats] = useState({ total: 0, totalSize: 0 });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadFileStats();
    }
  }, [user, refreshKey]);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser.role !== 'PATIENT') {
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

  const loadFileStats = async () => {
    try {
      const response = await listFiles();
      const totalSize = response.files.reduce((sum, f) => sum + f.size, 0);
      setFileStats({
        total: response.files.length,
        totalSize,
      });
    } catch (err) {
      console.error('Failed to load file stats:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleShare = (fileId: string) => {
    setShareModalFileId(fileId);
  };

  const handleUploadComplete = () => {
    setRefreshKey((k) => k + 1);
    loadFileStats();
  };

  const handleFileDelete = () => {
    setRefreshKey((k) => k + 1);
    loadFileStats();
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
            <span style={{ padding: '0.25rem 0.75rem', background: '#f3f4f6', color: '#374151', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
              Patient Portal
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600' }}>
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'P'}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{user?.name || 'Patient'}</div>
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
            <h3>Total Files</h3>
            <div className="stat-value">{fileStats.total}</div>
            <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>Files uploaded</p>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <h3>Storage Used</h3>
            <div className="stat-value">{(fileStats.totalSize / 1024 / 1024).toFixed(2)} MB</div>
            <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>Total size</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Welcome back, {user?.name || 'Patient'}!</h2>
          <p style={{ opacity: 0.9 }}>Upload and securely share your medical files with healthcare providers.</p>
        </div>

        <FileUpload onUploadComplete={handleUploadComplete} />
        <FileList key={refreshKey} onShare={handleShare} onDelete={handleFileDelete} showShareButton={true} />
      </main>

      {shareModalFileId && (
        <ShareFileModal
          fileId={shareModalFileId}
          onClose={() => setShareModalFileId(null)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

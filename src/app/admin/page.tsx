// src/app/admin/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout, getAdminUsers, promoteUser, demoteUser, AdminUser, AdminUsersQuery, getAuditLogs, AuditLog } from '@/lib/api-client';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PATIENT' | 'PROVIDER' | 'ADMIN'>('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [stats, setStats] = useState({ total: 0, admins: 0, providers: 0, patients: 0 });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  const checkAuth = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      setUser(currentUser);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadStats = useCallback(async () => {
    try {
      const [all, admins, providers, patients] = await Promise.all([
        getAdminUsers({ pageSize: 1 }),
        getAdminUsers({ role: 'ADMIN', pageSize: 1 }),
        getAdminUsers({ role: 'PROVIDER', pageSize: 1 }),
        getAdminUsers({ role: 'PATIENT', pageSize: 1 }),
      ]);
      setStats({
        total: all.total,
        admins: admins.total,
        providers: providers.total,
        patients: patients.total,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      setError('');
      const query: AdminUsersQuery = {
        page,
        pageSize: 20,
        q: searchQuery || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        sort: 'createdAt',
        order: 'desc',
      };
      const response = await getAdminUsers(query);
      setUsers(response.data);
      setTotalPages(response.totalPages);
      setTotalUsers(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [page, roleFilter, searchQuery]);

  const loadAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      setAuditError('');
      const response = await getAuditLogs(auditPage, 20);
      setAuditLogs(response.logs);
      setAuditTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setAuditError(err.message || 'Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      loadUsers();
      loadStats();
    }
  }, [user, loadUsers, loadStats]);

  useEffect(() => {
    if (user && activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [user, activeTab, loadAuditLogs]);

  const summarizeAuditLog = (log: AuditLog) => {
    if (log.metadata && Object.keys(log.metadata).length) {
      return JSON.stringify(log.metadata);
    }
    if (log.fileId) {
      return `file=${log.fileId}`;
    }
    if (log.shareId) {
      return `share=${log.shareId}`;
    }
    if (log.subjectUserId) {
      return `user=${log.subjectUserId}`;
    }
    return '—';
  };

  const formatActor = (log: AuditLog) => {
    if (log.actorName) return log.actorName;
    if (log.actorEmail) return log.actorEmail;
    return log.actorId || 'System';
  };

  const handlePromote = async (userId: string) => {
    try {
      setError('');
      setSuccess('');
      await promoteUser(userId);
      setSuccess('User promoted to admin successfully');
      loadUsers();
      loadStats();
    } catch (err: any) {
      setError(err.message || 'Failed to promote user');
    }
  };

  const handleDemote = async (userId: string) => {
    if (!confirm('Are you sure you want to demote this user? This action cannot be undone.')) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      await demoteUser(userId);
      setSuccess('User demoted successfully');
      loadUsers();
      loadStats();
    } catch (err: any) {
      setError(err.message || 'Failed to demote user');
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
            <span style={{ padding: '0.25rem 0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
              Admin Portal
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600' }}>
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{user?.name || 'Admin'}</div>
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
        <div className="grid grid-cols-1 grid-cols-sm-2 grid-cols-lg-4" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <h3>Total Users</h3>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <h3>Admins</h3>
            <div className="stat-value">{stats.admins}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <h3>Providers</h3>
            <div className="stat-value">{stats.providers}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <h3>Patients</h3>
            <div className="stat-value">{stats.patients}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'users' ? '#2563eb' : '#6b7280',
              cursor: 'pointer',
              fontWeight: activeTab === 'users' ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            Users ({totalUsers})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'audit' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'audit' ? '#2563eb' : '#6b7280',
              cursor: 'pointer',
              fontWeight: activeTab === 'audit' ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            Audit Logs
          </button>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="success-message" style={{ marginBottom: '1rem' }}>{success}</div>}

        {activeTab === 'users' && (
          <div className="card">
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  style={{ flex: '1', minWidth: '200px' }}
                />
                <select
                  className="form-input"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as any);
                    setPage(1);
                  }}
                  style={{ minWidth: '150px' }}
                >
                  <option value="ALL">All Roles</option>
                  <option value="PATIENT">Patient</option>
                  <option value="PROVIDER">Provider</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
                <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No users found</p>
                <p style={{ color: '#6b7280' }}>Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th className="hide-mobile">Created</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: '500' }}>{u.name || '-'}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`badge badge-${u.role.toLowerCase()}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="hide-mobile" style={{ color: '#6b7280' }}>
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {u.role === 'PROVIDER' ? (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handlePromote(u.id)}
                              >
                                Promote to Admin
                              </button>
                            ) : u.role === 'ADMIN' && u.id !== user?.id ? (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDemote(u.id)}
                              >
                                Demote to Provider
                              </button>
                            ) : (
                              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                {u.id === user?.id ? 'Current user' : 'No actions'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="card">
            {auditError && <div className="error-message" style={{ marginBottom: '1rem' }}>{auditError}</div>}
            {auditLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
                <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading audit logs...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="empty-state">
                <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No audit records yet</p>
                <p style={{ color: '#6b7280' }}>System activity will appear here automatically.</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ minWidth: '180px' }}>Timestamp</th>
                        <th>Action</th>
                        <th>Actor</th>
                        <th className="hide-mobile">Target</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                          <td>
                            <span className="badge badge-secondary">{log.action}</span>
                          </td>
                          <td>{formatActor(log)}</td>
                          <td className="hide-mobile">{log.target}</td>
                          <td style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                            {summarizeAuditLog(log)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {auditTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      disabled={auditPage === 1}
                    >
                      Previous
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                      Page {auditPage} of {auditTotalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                      disabled={auditPage === auditTotalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

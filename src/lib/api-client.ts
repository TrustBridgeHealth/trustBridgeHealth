// src/lib/api-client.ts
// API client functions for frontend

const API_BASE = '/api';

interface ApiResponse<T> {
data?: T;
error?: string;
message?: string;
}

/**
* Get authentication token from cookie or localStorage
*/
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Try to get from localStorage first (for client-side)
  const token = localStorage.getItem('auth_token');
  if (token) return token;

  // Token should be in httpOnly cookie, but we can't access it from JS
  // The backend will read it from the cookie automatically
  return null;
}

/**
 * Set authentication token
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

/**
 * Clear authentication token
 */
export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  // Use the Headers class so we can safely call .set(...)
  const headers = new Headers(options.headers as HeadersInit | undefined);

  // Ensure JSON content type by default
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      // If response is not JSON, try to get text
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // Keep default error message
      }
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

// ===== Authentication API =====

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'PATIENT' | 'PROVIDER';
}

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    twoFactorEnabled: boolean;
  };
}

export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (response.token) {
    setAuthToken(response.token);
  }
  return response;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (response.token) {
    setAuthToken(response.token);
  }
  return response;
}

export async function logout(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' });
  clearAuthToken();
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiRequest<{ user: User }>('/me');
  return response.user;
}

// ===== TOTP/2FA API =====

export interface TotpEnrollResponse {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

export async function enrollTotp(): Promise<TotpEnrollResponse> {
  return apiRequest<TotpEnrollResponse>('/auth/totp/enroll', {
    method: 'POST',
  });
}

export async function verifyTotp(
  totpCode: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest('/auth/totp/verify', {
    method: 'POST',
    body: JSON.stringify({ totpCode }),
  });
}

export async function disableTotp(
  totpCode: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest('/auth/totp/disable', {
    method: 'POST',
    body: JSON.stringify({ totpCode }),
  });
}

// ===== Files API =====

export interface PresignUploadRequest {
  mimeType?: string;
  size: number;
  filenameCipher: string;
  notesCipher?: string;
  encFileKey: string;
  encFileKeyAlg?: string;
  iv: string;
}

export interface PresignUploadResponse {
  uploadUrl: string;
  fileId: string;
  fields?: Record<string, string>;
  requiredHeaders?: Record<string, string>;
}

export async function presignUpload(
  data: PresignUploadRequest
): Promise<PresignUploadResponse> {
  return apiRequest<PresignUploadResponse>('/files/presign-upload', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface FileInfo {
  id: string;
  size: number;
  mimeType?: string;
  objectKey: string;
  createdAt: string;
  filenameCipher: string;
  notesCipher?: string;
  encFileKey: string;
  iv: string;
  shared?: boolean;
  shareId?: string;
  sharedAt?: string;
  sharedById?: string;
  sharedByName?: string | null;
  sharedByEmail?: string | null;
}

export interface FileListResponse {
  files: FileInfo[];
  total: number;
  ownedTotal?: number;
  sharedTotal?: number;
}

export async function listFiles(): Promise<FileListResponse> {
  return apiRequest<FileListResponse>('/files');
}

export interface PresignDownloadRequest {
  fileId: string;
}

export interface PresignDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
}

export async function presignDownload(
  fileId: string
): Promise<PresignDownloadResponse> {
  return apiRequest<PresignDownloadResponse>('/files/presign-download', {
    method: 'POST',
    body: JSON.stringify({ fileId }),
  });
}

export interface ShareFileRequest {
  fileId: string;
  granteeId: string;
  canDownload?: boolean;
}

export interface ShareInfo {
  id: string;
  fileId: string;
  granteeId: string;
  canDownload: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface ShareFileResponse {
  share: ShareInfo;
}

export async function shareFile(
  data: ShareFileRequest
): Promise<ShareFileResponse> {
  return apiRequest<ShareFileResponse>('/files/share', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface FileSharesResponse {
  shares: ShareInfo[];
}

export async function getFileShares(
  fileId: string
): Promise<FileSharesResponse> {
  return apiRequest<FileSharesResponse>(`/files/${fileId}/shares`);
}

export async function revokeShare(
  shareId: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/files/shares/${shareId}/revoke`, {
    method: 'DELETE',
  });
}

export async function deleteFile(
  fileId: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/files/${fileId}`, {
    method: 'DELETE',
  });
}

// ===== Admin API =====

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'PATIENT' | 'PROVIDER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  data: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminUsersQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: 'createdAt' | 'role';
  order?: 'asc' | 'desc';
  role?: 'PATIENT' | 'PROVIDER' | 'ADMIN' | 'ALL';
}

export async function getAdminUsers(
  query: AdminUsersQuery = {}
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.q) params.set('q', query.q);
  if (query.sort) params.set('sort', query.sort);
  if (query.order) params.set('order', query.order);
  if (query.role && query.role !== 'ALL') params.set('role', query.role);

  return apiRequest<AdminUsersResponse>(`/admin/users?${params.toString()}`);
}

export async function promoteUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest('/admin/promote', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function demoteUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest('/admin/demote', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  target: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  targetId: string | null;
  fileId?: string | null;
  shareId?: string | null;
  subjectUserId?: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, any> | null;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAuditLogs(
  page = 1,
  pageSize = 20
): Promise<AuditLogsResponse> {
  return apiRequest<AuditLogsResponse>(
    `/admin/audit-logs?page=${page}&pageSize=${pageSize}`
  );
}

export async function adminPing(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/admin/ping');
}

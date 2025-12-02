// src/components/FileList.tsx
'use client';

import { useState, useEffect } from 'react';
import { listFiles, presignDownload, deleteFile, FileInfo } from '@/lib/api-client';
import {
  decryptFile,
  decryptString,
  hexToUint8Array,
  base64ToArrayBuffer,
} from '@/lib/client-encryption';

interface FileListProps {
  onShare?: (fileId: string) => void;
  showShareButton?: boolean;
  onDelete?: () => void;
}

export default function FileList({ onShare, showShareButton = true, onDelete }: FileListProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await listFiles();
      setFiles(response.files);
    } catch (err: any) {
      console.error('Load files error:', err);
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleDownload = async (file: FileInfo) => {
    try {
      setDownloading(file.id);
      setError('');

      // Get presigned download URL
      const { downloadUrl } = await presignDownload(file.id);

      // Download encrypted file
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const encryptedData = await response.arrayBuffer();

      // Import the encryption key - it's stored as base64 in the database
      let encryptionKey;
      try {
        // The encFileKey is base64 encoded in the API response
        // We need to decode it to get the raw key bytes, then import
        const keyBytes = base64ToArrayBuffer(file.encFileKey);
        encryptionKey = await crypto.subtle.importKey(
          'raw',
          keyBytes,
          {
            name: 'AES-GCM',
            length: 256,
          },
          true,
          ['encrypt', 'decrypt']
        );
      } catch (keyError) {
        console.error('Key import error:', keyError);
        throw new Error('Failed to decrypt file: Invalid encryption key');
      }

      // Convert IV from hex to Uint8Array
      const iv = hexToUint8Array(file.iv);

      // Decrypt file
      let decryptedBlob;
      try {
        decryptedBlob = await decryptFile(
          encryptedData,
          encryptionKey,
          iv,
          file.mimeType || undefined
        );
      } catch (decryptError) {
        console.error('Decrypt error:', decryptError);
        throw new Error('Failed to decrypt file. The file may be corrupted.');
      }

      // Decrypt filename
      let filename;
      try {
        filename = await decryptString(file.filenameCipher, encryptionKey, iv);
      } catch (filenameError) {
        console.error('Filename decrypt error:', filenameError);
        filename = `file-${file.id.substring(0, 8)}`;
      }

      // Create download link
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      // Provide more helpful error messages
      let errorMsg = err.message || 'Download failed. Please try again.';
      if (err.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (err.status === 403) {
        errorMsg = 'Access denied. You may not have permission to download this file.';
      } else if (err.message?.includes('decrypt')) {
        errorMsg = 'Failed to decrypt file. The file may be corrupted or the encryption key is invalid.';
      }
      setError(errorMsg);
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(fileId);
      setError('');
      await deleteFile(fileId);
      // Remove file from list
      setFiles(files.filter(f => f.id !== fileId));
      if (onDelete) {
        onDelete();
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      // Provide more helpful error messages
      let errorMsg = err.message || 'Failed to delete file';
      if (err.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (err.status === 403) {
        errorMsg = 'Access denied. You can only delete your own files.';
      }
      setError(errorMsg);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading files...</p>
      </div>
    );
  }

  if (error && !files.length) {
    return (
      <div className="card">
        <div className="error-message">{error}</div>
        <button className="btn btn-primary" onClick={loadFiles} style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>My Files</h2>
        <button className="btn btn-secondary btn-sm" onClick={loadFiles} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: '16px', height: '16px' }}></span> : '↻'} Refresh
        </button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      {files.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem', fontWeight: '500' }}>No files yet</p>
          <p style={{ color: '#6b7280' }}>Upload your first file to get started</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th className="hide-mobile">Size</th>
                  <th className="hide-mobile">Uploaded</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <div style={{ fontWeight: '500' }}>
                        {file.filenameCipher.substring(0, 40)}
                        {file.filenameCipher.length > 40 ? '...' : ''}
                      </div>
                      {file.notesCipher && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          📝 Has notes
                        </div>
                      )}
                      {file.shared && (
                        <div style={{ fontSize: '0.85rem', color: '#16a34a', marginTop: '0.25rem' }}>
                          Shared by {file.sharedByName || file.sharedByEmail || 'another user'}
                        </div>
                      )}
                    </td>
                    <td className="hide-mobile" style={{ color: '#6b7280' }}>
                      {(Number(file.size) / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td className="hide-mobile" style={{ color: '#6b7280' }}>
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDownload(file)}
                          disabled={downloading === file.id || deleting === file.id}
                        >
                          {downloading === file.id ? (
                            <>
                              <span className="spinner" style={{ width: '14px', height: '14px' }}></span> Downloading...
                            </>
                          ) : (
                            '⬇ Download'
                          )}
                        </button>
                        {showShareButton && onShare && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onShare(file.id)}
                            disabled={downloading === file.id || deleting === file.id}
                          >
                            🔗 Share
                          </button>
                        )}
                        {showShareButton && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(file.id)}
                            disabled={downloading === file.id || deleting === file.id}
                          >
                            {deleting === file.id ? (
                              <>
                                <span className="spinner" style={{ width: '14px', height: '14px' }}></span> Deleting...
                              </>
                            ) : (
                              '🗑 Delete'
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
            Showing {files.length} file{files.length !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  );
}

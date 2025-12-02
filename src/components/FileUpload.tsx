// src/components/FileUpload.tsx
'use client';

import { useState, useRef } from 'react';
import {
  generateKey,
  generateIV,
  encryptFile,
  encryptString,
  exportKey,
  uint8ArrayToHex,
  arrayBufferToBase64,
} from '@/lib/client-encryption';
import { presignUpload, PresignUploadRequest } from '@/lib/api-client';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');
    setSuccess('');

    try {
      // Generate encryption key and IV
      setProgress(5);
      const encryptionKey = await generateKey();
      const iv = generateIV();
      setProgress(10);

      // Encrypt the file
      const encryptedFileData = await encryptFile(file, encryptionKey, iv);
      setProgress(40);

      // Encrypt filename and notes
      const filenameCipher = await encryptString(file.name, encryptionKey, iv);
      const notesCipher = notes ? await encryptString(notes, encryptionKey, iv) : undefined;
      setProgress(60);

      // Export encryption key (this would normally be encrypted with user's public key)
      // For now, we'll store it as base64 (in production, use proper key management)
      const encFileKey = await exportKey(encryptionKey);
      const ivHex = uint8ArrayToHex(iv);

      // Get presigned upload URL
      setProgress(70);
      const uploadRequest: PresignUploadRequest = {
        mimeType: file.type || 'application/octet-stream',
        size: encryptedFileData.byteLength,
        filenameCipher,
        notesCipher,
        encFileKey: encFileKey, // Already base64 from exportKey
        encFileKeyAlg: 'AES-GCM-256',
        iv: ivHex,
      };

      const { uploadUrl, fileId, requiredHeaders } = await presignUpload(uploadRequest);
      setProgress(80);

      // Upload encrypted file to S3
      const uploadOptions: RequestInit = {
        method: 'PUT',
        body: encryptedFileData,
      };

      // Only send headers if the backend explicitly tells us to, so the
      // signed headers always match what S3 actually sees.
      if (requiredHeaders && Object.keys(requiredHeaders).length) {
        uploadOptions.headers = requiredHeaders;
      }

      const uploadResponse = await fetch(uploadUrl, uploadOptions);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => 'Unknown error');
        console.error('S3 upload error:', uploadResponse.status, errorText);
        throw new Error(`Failed to upload file to storage: ${uploadResponse.status}. Please try again.`);
      }

      setProgress(100);
      setSuccess('File uploaded successfully!');
      
      // Clear form
      setFile(null);
      setNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call callback after a short delay to ensure state is updated
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete();
        }
      }, 500);
    } catch (err: any) {
      console.error('Upload error:', err);
      // Provide more helpful error messages
      let errorMsg = err.message || 'Upload failed. Please try again.';
      if (err.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (err.status === 403) {
        errorMsg = 'Access denied. Please check your permissions or verify 2FA.';
      } else if (err.message?.includes('2FA')) {
        errorMsg = '2FA verification required. Please verify your 2FA code.';
      } else if (err.message?.includes('ZodError') || err.message?.includes('validation')) {
        errorMsg = 'Invalid file data. Please try again.';
      }
      setError(errorMsg);
    } finally {
      setUploading(false);
      // Keep progress bar visible for a moment on success
      if (!error) {
        setTimeout(() => setProgress(0), 3000);
      } else {
        setTimeout(() => setProgress(0), 2000);
      }
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
        Upload File
      </h2>

      <div className="form-group">
        <label className="form-label" htmlFor="file">
          Select File
        </label>
        <input
          id="file"
          ref={fileInputRef}
          type="file"
          className="form-input"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        {file && (
          <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          className="form-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={uploading}
          placeholder="Add any notes about this file..."
        />
      </div>

      {uploading && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: '10px', background: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{ width: '100%' }}
      >
        {uploading ? (
          <>
            <span className="spinner" style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}></span>
            Uploading... {progress}%
          </>
        ) : (
          '📤 Upload File'
        )}
      </button>
    </div>
  );
}

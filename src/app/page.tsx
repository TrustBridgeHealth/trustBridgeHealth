// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api-client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    getCurrentUser()
      .then((user) => {
        // Redirect to appropriate dashboard based on role
        if (user.role === 'ADMIN') {
          router.push('/admin');
        } else if (user.role === 'PROVIDER') {
          router.push('/provider');
        } else {
          router.push('/patient');
        }
      })
      .catch(() => {
        // Not logged in, redirect to login
        router.push('/login');
      });
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div>Loading...</div>
    </div>
  );
}




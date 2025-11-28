// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full bg-white shadow-md rounded-xl p-8 space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          TrustBridge Health
        </h1>

        <p className="text-sm text-slate-600">
          Welcome to the patient & provider portal. Please sign in to continue.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md border text-sm font-medium bg-slate-900 text-white hover:bg-slate-800"
        >
          Go to Login
        </Link>
      </div>
    </main>
  );
}

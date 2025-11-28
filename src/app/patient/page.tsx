// src/app/patient/page.tsx

export default function PatientDashboardPage() {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <header>
            <h1 className="text-2xl font-semibold text-slate-900">
              Patient Dashboard
            </h1>
            <p className="text-sm text-slate-600">
              Welcome to your TrustBridge Health portal. Here you’ll see your
              appointments, records, and messages.
            </p>
          </header>
  
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Upcoming appointments
              </p>
              <p className="mt-2 text-2xl font-semibold">0</p>
              <p className="mt-1 text-xs text-slate-500">
                This will show your next visit once we connect the API.
              </p>
            </div>
  
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Recent messages
              </p>
              <p className="mt-2 text-2xl font-semibold">0</p>
              <p className="mt-1 text-xs text-slate-500">
                Secure conversations with your provider.
              </p>
            </div>
  
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                New documents
              </p>
              <p className="mt-2 text-2xl font-semibold">0</p>
              <p className="mt-1 text-xs text-slate-500">
                Lab results and visit summaries will appear here.
              </p>
            </div>
          </section>
  
          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              What&apos;s coming next
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              In the next steps, we&apos;ll connect this page to the backend to
              show real appointments, EHR summaries, and secure messages from the
              APIs your team already built.
            </p>
          </section>
        </div>
      </main>
    );
  }
  
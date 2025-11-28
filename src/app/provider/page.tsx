// src/app/provider/page.tsx

export default function ProviderDashboardPage() {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <header>
            <h1 className="text-2xl font-semibold text-slate-900">
              Provider Dashboard
            </h1>
            <p className="text-sm text-slate-600">
              Overview of your schedule, patient panel, and messages.
            </p>
          </header>
  
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Today&apos;s appointments
              </p>
              <p className="mt-2 text-2xl font-semibold">0</p>
              <p className="mt-1 text-xs text-slate-500">
                We&apos;ll populate this from the appointment service.
              </p>
            </div>
  
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Active patients
              </p>
              <p className="mt-2 text-2xl font-semibold">0</p>
              <p className="mt-1 text-xs text-slate-500">
                Later this will link to patient search & charts.
              </p>
            </div>
  
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Unread messages
              </p>
              <p className="mt-2 text-2xl font-semibold">0</p>
              <p className="mt-1 text-xs text-slate-500">
                Secure inbox for patient communication.
              </p>
            </div>
          </section>
  
          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Next steps
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              We&apos;ll extend this page with a schedule view, patient search,
              and reporting once the core UI flow is working end-to-end.
            </p>
          </section>
        </div>
      </main>
    );
  }
  
// src/app/provider/page.tsx

export default function ProviderPage() {
    return (
      <main className="p-6 space-y-8">
        <header>
          <h1 className="text-3xl font-bold">Provider Dashboard</h1>
          <p className="mt-2 text-gray-700">
            Overview of today&apos;s schedule and your recent patients.
          </p>
        </header>
  
        {/* Schedule Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Today&apos;s Schedule</h2>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">9:00 AM – 9:30 AM</p>
                <p className="text-sm text-gray-700">Alex Johnson – Follow-up</p>
              </div>
              <span className="text-sm text-gray-500">Room 204</span>
            </div>
  
            <div className="border-t pt-3 flex justify-between">
              <div>
                <p className="font-medium">10:15 AM – 10:45 AM</p>
                <p className="text-sm text-gray-700">
                  Maria Garcia – New consultation
                </p>
              </div>
              <span className="text-sm text-gray-500">Room 103</span>
            </div>
  
            <div className="border-t pt-3 flex justify-between">
              <div>
                <p className="font-medium">11:30 AM – 12:00 PM</p>
                <p className="text-sm text-gray-700">James Lee – Lab review</p>
              </div>
              <span className="text-sm text-gray-500">Room 210</span>
            </div>
          </div>
        </section>
  
        {/* Patient Search Section (very simple for now) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Patients</h2>
          <input
            type="text"
            placeholder="Search patients by name or MRN..."
            className="w-full max-w-md border rounded-md px-3 py-2 text-sm"
          />
  
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full border rounded-lg text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Name</th>
                  <th className="text-left px-3 py-2 border-b">DOB</th>
                  <th className="text-left px-3 py-2 border-b">MRN</th>
                  <th className="text-left px-3 py-2 border-b">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b">Alex Johnson</td>
                  <td className="px-3 py-2 border-b">1990-03-22</td>
                  <td className="px-3 py-2 border-b">MRN-10234</td>
                  <td className="px-3 py-2 border-b">2024-11-02</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b">Maria Garcia</td>
                  <td className="px-3 py-2 border-b">1985-07-14</td>
                  <td className="px-3 py-2 border-b">MRN-20456</td>
                  <td className="px-3 py-2 border-b">2024-10-15</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b">James Lee</td>
                  <td className="px-3 py-2 border-b">1978-01-09</td>
                  <td className="px-3 py-2 border-b">MRN-39812</td>
                  <td className="px-3 py-2 border-b">2024-09-28</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }
  
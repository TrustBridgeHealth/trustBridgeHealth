// src/app/patient/page.tsx
import RecordsSection from "./RecordsSection";
import AppointmentsTable, { type Appointment } from "./AppointmentsTable";
import styles from "./page.module.css";

export default function PatientDashboardPage() {
  const mockAppointments: Appointment[] = [
    {
      id: "1",
      provider: "Dr. Roberts",
      date: "2025-01-22",
      time: "2:00 PM",
      status: "UPCOMING",
    },
    {
      id: "2",
      provider: "Dr. Kim",
      date: "2024-12-11",
      time: "9:00 AM",
      status: "COMPLETED",
    },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.blobOne} />
      <div className={styles.blobTwo} />
      <div className={styles.blobThree} />

      <section className={styles.card}>
        <h1 className={styles.title}>Patient Dashboard</h1>
        <p className={styles.subtitle}>
          View your appointments, medical records, and provider updates.
        </p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Appointments</h2>
          <AppointmentsTable initialData={mockAppointments} />
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Records</h2>
          <RecordsSection />
        </div>
      </section>
    </main>
  );
}

// src/app/page.tsx
import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      {/* Color blobs in the background */}
      <div className={styles.blobOne} />
      <div className={styles.blobTwo} />
      <div className={styles.blobThree} />

      <div className={styles.container}>
        {/* HERO SECTION */}
        <header className={styles.hero}>
          <span className={styles.chip}>TrustBridge Health</span>
          <h1 className={styles.title}>
            Care that feels{" "}
            <span className={styles.highlight}>warm, connected, colorful.</span>
          </h1>
          <p className={styles.subtitle}>
            Patients and providers share one bright, friendly space to manage
            appointments, stay organized, and keep everyone on the same page.
          </p>

          <div className={styles.actions}>
            <Link href="/login" className={styles.primaryButton}>
              Go to Login
            </Link>
            <span className={styles.secondaryPill}>No real patient data • Demo only</span>
          </div>
        </header>

        {/* FOR PATIENTS / PROVIDERS */}
        <section className={styles.columns}>
          <div className={`${styles.infoCard} ${styles.patientCard}`}>
            <span className={styles.cardLabel}>For Patients:</span>
            <h2>Everything for your visit, in one place.</h2>
            <p>
              Keep track of upcoming visits, instructions, and important notes
              without digging through emails and sticky notes.
            </p>
            <ul>
              <li>See upcoming & past appointments</li>
              <li>Review visit summaries and reminders</li>
              <li>Stay connected with your care team</li>
            </ul>
          </div>

          <div className={`${styles.infoCard} ${styles.providerCard}`}>
            <span className={styles.cardLabel}>For Providers:</span>
            <h2>Walk into clinic ready to go.</h2>
            <p>
              Glance at your day, open patient details, and coordinate with your
              team — without flipping between a million tools.
            </p>
            <ul>
              <li>Daily schedule at a glance</li>
              <li>Quick patient look-up</li>
              <li>Streamlined pre-visit prep</li>
            </ul>
          </div>
        </section>

        {/* FUN FEATURE STRIP */}
        <section className={styles.features}>
          <div className={styles.featureCard}>
            <span className={styles.emoji}></span>
            <h3>Simple</h3>
            <p>Clean, colorful layouts that are easy to scan in seconds.</p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.emoji}></span>
            <h3>Secure</h3>
            <p>Built with privacy in mind — real data appears only after login.</p>
          </div>
          <div className={styles.featureCard}>
            <span className={styles.emoji}></span>
            <h3>Connected</h3>
            <p>One shared portal, two views tailored to who&apos;s signed in.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

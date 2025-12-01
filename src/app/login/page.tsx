"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

type LoginResponse = {
  role?: "ADMIN" | "PROVIDER" | "PATIENT" | string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid email or password");
      }

      const data: LoginResponse = await res.json();

      // Redirect based on role (adjust paths if your backend uses different roles)
      if (data.role === "ADMIN") router.push("/admin");
      else if (data.role === "PROVIDER") router.push("/provider");
      else if (data.role === "PATIENT") router.push("/patient");
      else router.push("/");

    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.blobOne} />
      <div className={styles.blobTwo} />
      <div className={styles.blobThree} />

      <section className={styles.card}>
        <p className={styles.chip}>TrustBridge Health</p>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>
          Use your TrustBridge Health account to access the portal.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className={styles.footerNote}>
          This is a demo environment. No real patient data is shown.
        </p>
      </section>
    </main>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type Role = "patient" | "provider";

type AppShellProps = {
  role: Role;
  children: React.ReactNode;
};

const AppShell: React.FC<AppShellProps> = ({ role, children }) => {
  const pathname = usePathname();

  const navItems =
    role === "patient"
      ? [
          { href: "/patient", label: "Dashboard" },
          { href: "/patient#appointments", label: "Appointments" },
          { href: "/patient#records", label: "Records" },
          { href: "/patient#messages", label: "Messages" },
        ]
      : [
          { href: "/provider", label: "Dashboard" },
          { href: "/provider#schedule", label: "Schedule" },
          { href: "/provider#patients", label: "Patients" },
        ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r bg-white px-4 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            TrustBridge Health
          </h1>
          <p className="text-xs text-slate-500 capitalize">
            {role} portal
          </p>
        </div>

        <nav className="flex-1 space-y-1 text-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-2 border-t space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            asChild
          >
            <Link href="/login">Logout</Link>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
};

export default AppShell;

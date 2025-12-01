"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

export type Appointment = {
    id: string;
    provider: string;
    date: string;
    time: string;
    status: "UPCOMING" | "COMPLETED" | "CANCELLED";
};

type Props = {
  initialData: Appointment[];
};

export default function AppointmentsTable({ initialData }: Props) {
  const { toast } = useToast();
  const [appointments, setAppointments] =
    React.useState<Appointment[]>(initialData);
  const [q, setQ] = React.useState("");

  const filtered = appointments.filter((a) =>
    a.provider.toLowerCase().includes(q.toLowerCase())
  );

  function cancelAppointment(id: string) {
    toast({
      title: "Appointment cancelled",
      description: "This will connect to the backend later.",
    });

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "CANCELLED" } : a
      )
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by provider name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  No appointments found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.provider}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{a.time}</TableCell>
                  <TableCell>{a.status}</TableCell>
                  <TableCell className="text-right">
                    {a.status === "UPCOMING" && (
                      <Button
                        variant="outline"
                        onClick={() => cancelAppointment(a.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

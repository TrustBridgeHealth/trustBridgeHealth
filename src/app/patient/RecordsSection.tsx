"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type RecordItem = {
  id: string;
  type: string;
  date: string;
  summary: string;
};

const initialRecords: RecordItem[] = [
  {
    id: "r1",
    type: "Lab Result",
    date: "2024-11-02",
    summary: "CBC panel – all values within normal range.",
  },
  {
    id: "r2",
    type: "Visit Summary",
    date: "2024-10-15",
    summary: "Primary care follow-up for blood pressure management.",
  },
  {
    id: "r3",
    type: "Imaging Report",
    date: "2024-09-28",
    summary: "Chest X-ray – no acute findings.",
  },
];

const RecordsSection: React.FC = () => {
  const [q, setQ] = React.useState("");
  const [records] = React.useState<RecordItem[]>(initialRecords);

  const filtered = records.filter((r) => {
    const needle = q.toLowerCase();
    return (
      r.type.toLowerCase().includes(needle) ||
      r.summary.toLowerCase().includes(needle)
    );
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Health Records</h2>
          <p className="text-sm text-muted-foreground">
            Recent visit summaries, lab results, and imaging reports.
          </p>
        </div>
        <Input
          placeholder="Search records…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-muted-foreground"
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.type}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.summary}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      View / Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

export default RecordsSection;

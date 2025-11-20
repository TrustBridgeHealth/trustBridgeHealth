"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { UsersResponse, UserRow } from "@/lib/admin-users";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import EditRole from "./EditRole";

type Props = {
  initialData: UsersResponse;
  currentUserId: string;
  adminCount: number;
  initialQ: string;
  initialSort: "createdAt" | "role";
  initialOrder: "asc" | "desc";
  initialRole: "ADMIN" | "USER" | "ALL";
};

export default function UsersTable(props: Props) {
  const { initialData, currentUserId, adminCount, initialQ, initialSort, initialOrder, initialRole } = props;
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local view state (optimistic for role edits)
  const [data, setData] = React.useState<UserRow[]>(initialData.data);
  const [page, setPage] = React.useState<number>(initialData.page);
  const [totalPages, setTotalPages] = React.useState<number>(initialData.totalPages);

  // Filters / sorting state, persisted in URL
  const [q, setQ] = React.useState(initialQ);
  const [role, setRole] = React.useState<"ADMIN" | "USER" | "ALL">(initialRole);
  const [sort, setSort] = React.useState<"createdAt" | "role">(initialSort);
  const [order, setOrder] = React.useState<"asc" | "desc">(initialOrder);

  // Debounce search
  const debouncedQ = useDebouncedValue(q, 400);

  // Rebuild URL on changes
  React.useEffect(() => {
    const sp = new URLSearchParams(searchParams?.toString());
    sp.set("page", String(page));
    if (debouncedQ) sp.set("q", debouncedQ); else sp.delete("q");
    sp.set("sort", sort);
    sp.set("order", order);
    sp.set("role", role);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    // Then refetch client-side to refresh the table (RSC did the first load)
    void refetch(sp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ, sort, order, role]);

  async function refetch(sp: URLSearchParams) {
    const res = await fetch(`/api/admin/users?${sp.toString()}`, { credentials: "include" });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load users." });
      return;
    }
    const json = await res.json();
    try {
      // trust the shape based on server (you already validate server-side)
      setData(json.data);
      setPage(json.page);
      setTotalPages(json.totalPages);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Unexpected response from server." });
    }
  }

  function toggleSortByCreated() {
    if (sort === "createdAt") setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort("createdAt");
      setOrder("desc");
    }
  }

  function toggleSortByRole() {
    if (sort === "role") setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort("role");
      setOrder("asc");
    }
  }

  function onRoleChangeOptimistic(id: string, newRole: "ADMIN" | "USER") {
    setData((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
  }

  function onRoleChangeRevert(id: string, oldRole: "ADMIN" | "USER") {
    setData((prev) => prev.map((u) => (u.id === id ? { ...u, role: oldRole } : u)));
  }

  const isEmpty = data.length === 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search email or name…"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            className="w-64"
          />
          <Select
            value={role}
            onValueChange={(v: "ADMIN" | "USER" | "ALL") => { setPage(1); setRole(v); }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Role filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="USER">USER</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={toggleSortByCreated}>
            Sort: Created {sort === "createdAt" ? (order === "asc" ? "↑" : "↓") : ""}
          </Button>
          <Button variant="outline" onClick={toggleSortByRole}>
            Sort: Role {sort === "role" ? (order === "asc" ? "↑" : "↓") : ""}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((u) => {
                const isMe = u.id === currentUserId;
                // Disable if this user is the only admin and it's "me"
                const disableEdit = isMe && u.role === "ADMIN" && adminCount === 1;

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.name ?? "—"}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(u.updatedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <EditRole
                        user={u}
                        disabled={disableEdit}
                        onOptimisticChange={onRoleChangeOptimistic}
                        onRevert={onRoleChangeRevert}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {Math.max(1, totalPages)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

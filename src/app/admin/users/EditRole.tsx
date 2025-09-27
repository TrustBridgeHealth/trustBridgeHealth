"use client";

import * as React from "react";
import { UserRow } from "@/src/lib/admin-users";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

type Props = {
  user: UserRow;
  disabled?: boolean;
  onOptimisticChange: (id: string, newRole: "ADMIN" | "USER") => void;
  onRevert: (id: string, oldRole: "ADMIN" | "USER") => void;
};

export default function EditRole({ user, disabled, onOptimisticChange, onRevert }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [tempRole, setTempRole] = React.useState<"ADMIN" | "USER">(user.role);

  React.useEffect(() => setTempRole(user.role), [user.role]);

  async function submit() {
    if (tempRole === user.role) {
      setOpen(false);
      return;
    }
    const prev = user.role;
    onOptimisticChange(user.id, tempRole);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: tempRole }),
      });

      if (!res.ok) {
        const body = await safeJson(res);
        onRevert(user.id, prev);
        toast({
          variant: "destructive",
          title: "Failed to update role",
          description: body?.error ?? `Server responded ${res.status}`,
        });
      } else {
        toast({ title: "Role updated", description: `${user.email} is now ${tempRole}` });
      }
    } catch (e: any) {
      onRevert(user.id, prev);
      toast({ variant: "destructive", title: "Network error", description: e?.message ?? "Update failed." });
    } finally {
      setSubmitting(false);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || submitting}>
          Edit role
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="space-y-3">
          <div className="text-sm">
            <div className="font-medium">Change role</div>
            <div className="text-muted-foreground truncate">{user.email}</div>
          </div>
          <Select value={tempRole} onValueChange={(v: "ADMIN" | "USER") => setTempRole(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="USER">USER</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

// src/lib/admin-users.ts
import { z } from "zod";

export const RoleSchema = z.enum(["ADMIN", "PATIENT", "PROVIDER"]);

export const UserRowSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  role: RoleSchema,
  createdAt: z.string(), // ISO
  updatedAt: z.string(), // ISO
});

export const UsersResponseSchema = z.object({
  data: z.array(UserRowSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  sort: z.string().optional(),     // e.g., "createdAt" or "role"
  order: z.enum(["asc", "desc"]).optional(),
  q: z.string().optional().nullable(),
  role: RoleSchema.nullable().optional(),
});

export type UsersResponse = z.infer<typeof UsersResponseSchema>;
export type UserRow = z.infer<typeof UserRowSchema>;
export type Role = z.infer<typeof RoleSchema>;

export type UsersQuery = {
  page?: number;
  pageSize?: number; // we’ll always pass 20
  q?: string | null;
  sort?: "createdAt" | "role";
  order?: "asc" | "desc";
  role?: "ADMIN" | "PATIENT" | "PROVIDER" | "ALL";
};

// Server-side fetch wrapper (keeps RSC-friendly no-store semantics)
export async function fetchUsersServer(search: UsersQuery): Promise<UsersResponse> {
  const params = new URLSearchParams();
  if (search.page) params.set("page", String(search.page));
  if (search.pageSize) params.set("pageSize", String(search.pageSize));
  if (search.q) params.set("q", search.q);
  if (search.sort) params.set("sort", search.sort);
  if (search.order) params.set("order", search.order);
  if (search.role && search.role !== "ALL") params.set("role", search.role);

  const res = await fetch(`/api/admin/users?${params.toString()}`, {
    // credentials/cookies flow automatically in RSC
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load users: ${res.status} ${text}`);
  }

  const json = await res.json();
  return UsersResponseSchema.parse(json);
}

// Handy helper to discover the total number of admins (for "last admin" logic)
export async function fetchAdminCount(): Promise<number> {
  const res = await fetch(`/api/admin/users?role=ADMIN&pageSize=1&page=1`, {
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const json = await res.json();
  const parsed = UsersResponseSchema.parse(json);
  return parsed.total;
}

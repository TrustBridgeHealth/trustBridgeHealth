// src/app/admin/users/page.tsx
import { requireAdminServer } from "@/lib/auth-helper";
import { fetchAdminCount, fetchUsersServer, UsersResponse } from "@/lib/admin-users";
import UsersTable from "./UsersTable";

type SearchParams = {
  page?: string;
  q?: string;
  sort?: "createdAt" | "role";
  order?: "asc" | "desc";
  role?: "ADMIN" | "USER" | "ALL";
};

export const dynamic = "force-dynamic"; // ensure fresh

// NOTE: relax the prop type to `any` to avoid Next 15's PageProps constraint
export default async function AdminUsersPage(props: any) {
  const searchParams = (props?.searchParams ?? {}) as SearchParams;

  const me = await requireAdminServer(); // redirects if not admin

  const page = Math.max(1, Number(searchParams?.page ?? "1"));
  const q = (searchParams?.q ?? "").trim() || undefined;
  const sort = (searchParams?.sort as "createdAt" | "role") ?? "createdAt";
  const order = (searchParams?.order as "asc" | "desc") ?? "desc";
  const role = (searchParams?.role as "ADMIN" | "USER" | "ALL") ?? "ALL";

  const [users, adminCount] = await Promise.all([
    fetchUsersServer({
      page,
      pageSize: 20,
      q,
      sort,
      order,
      role,
    }),
    fetchAdminCount(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage user roles and browse the user directory.
        </p>
      </div>

      {/* Pass server-fetched data + current user + adminCount down */}
      <UsersTable
        initialData={users}
        currentUserId={me.id}
        adminCount={adminCount}
        initialQ={q ?? ""}
        initialSort={sort}
        initialOrder={order}
        initialRole={role}
      />
    </div>
  );
}

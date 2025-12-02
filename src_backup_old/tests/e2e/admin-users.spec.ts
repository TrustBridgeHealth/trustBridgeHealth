import { test, expect } from "@playwright/test";

async function loginAs(page, email: string, password: string) {
  // Use your existing API to obtain a token cookie
  const res = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body?.token).toBeTruthy();
  // Set HttpOnly cookie indirectly by visiting a small page that sets it,
  // or more simply, rely on server setting the cookie on login endpoint.
  // If your login endpoint sets the cookie, instead just call it via `page.goto` to set.
  await page.context().addCookies([{
    name: "token",
    value: body.token,
    url: page.url().startsWith("http") ? new URL(page.url()).origin : "http://localhost:3000",
    httpOnly: true,
  }]);
}

test.describe("Admin Users Dashboard", () => {
  test("non-admin is redirected to /", async ({ page }) => {
    // Arrange: login as a regular user
    await loginAs(page, "basic2@example.com", "Password123!");
    // Act:
    await page.goto("/admin/users");
    // Assert:
    await expect(page).toHaveURL("/");
  });

  test("admin can list, search, paginate, sort, and edit roles", async ({ page }) => {
    await loginAs(page, "admin@example.com", "Password123!"); // ensure this exists in your seed

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    // Search
    await page.getByPlaceholder("Search email or name…").fill("basic");
    await page.waitForTimeout(500); // debounce
    await expect(page.getByText("No users found.")).not.toBeVisible();

    // Sort by role
    await page.getByRole("button", { name: /Sort: Role/ }).click();

    // Paginate
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=\d+/);

    // Edit role (promote/demote)
    const editButtons = page.getByRole("button", { name: "Edit role" });
    await editButtons.first().click();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "ADMIN" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Role updated")).toBeVisible();
  });

  test("cannot demote the last admin", async ({ page }) => {
    await loginAs(page, "admin@example.com", "Password123!");

    await page.goto("/admin/users");

    // Find the current admin row and attempt to demote if it's the only admin.
    // The UI should disable the edit button, but we also test the server behavior:
    // Directly call the API to simulate last-admin attempt.
    const res = await page.request.patch("/api/admin/users/<ADMIN_ID>/role", {
      data: { role: "USER" },
    });
    expect(res.status()).toBe(400); // or 403 based on your route; you said 400/403/404 as appropriate
    const j = await res.json();
    expect(j.error).toBeTruthy();
  });
});

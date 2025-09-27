import { test, expect } from "@playwright/test";

test.describe("Admin Users – promote/demote actions", () => {
  test.beforeEach(async ({ page }) => {
    // Default table: one USER and one ADMIN so both actions are testable
    await page.route("**/api/admin/users**", async (route) => {
      const json = {
        data: [
          { id: "u-user",  email: "user@example.com",  name: "User",  role: "USER",  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: "u-admin", email: "admin@example.com", name: "Admin", role: "ADMIN", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
        page: 1, totalPages: 1
      };
      await route.fulfill({ json });
    });
    await page.goto("/admin/users");
  });

  test("promote success refetches & shows success toast", async ({ page }) => {
    // Intercept promote call, ensure correct payload { userId }
    await page.route("**/api/admin/promote", async (route) => {
      const req = route.request();
      const body = JSON.parse(req.postData() || "{}");
      expect(body).toEqual({ userId: "u-user" });
      await route.fulfill({ status: 200, json: { id: "u-user", email: "user@example.com", role: "ADMIN", updatedAt: new Date().toISOString() } });
    });

    // After success, refetch shows updated ADMIN role
    await page.route("**/api/admin/users?**", async (route) => {
      const json = {
        data: [
          { id: "u-user",  email: "user@example.com",  name: "User",  role: "ADMIN", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: "u-admin", email: "admin@example.com", name: "Admin", role: "ADMIN", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
        page: 1, totalPages: 1
      };
      await route.fulfill({ json });
    });

    await page.getByTestId("promote-u-user").click();

    await expect(page.getByText("Promoted", { exact: false })).toBeVisible();
    await expect(page.getByText("User is now an admin.", { exact: false })).toBeVisible();

    const row = page.getByText("user@example.com").locator("xpath=ancestor::tr[1]");
    await expect(row).toContainText("ADMIN");
  });

  test("demote success refetches & shows success toast", async ({ page }) => {
    // Ensure two admins so demote isn’t disabled by the last-admin client guard
    await page.route("**/api/admin/users**", async (route) => {
      const json = {
        data: [
          { id: "u-admin1", email: "a1@example.com", name: "A1", role: "ADMIN", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: "u-admin2", email: "a2@example.com", name: "A2", role: "ADMIN", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
        page: 1, totalPages: 1
      };
      await route.fulfill({ json });
    });
    await page.reload();

    await page.route("**/api/admin/demote", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      expect(body).toEqual({ userId: "u-admin1" });
      await route.fulfill({ status: 200, json: { id: "u-admin1", email: "a1@example.com", role: "USER", updatedAt: new Date().toISOString() } });
    });

    await page.route("**/api/admin/users?**", async (route) => {
      const json = {
        data: [
          { id: "u-admin1", email: "a1@example.com", name: "A1", role: "USER",  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: "u-admin2", email: "a2@example.com", name: "A2", role: "ADMIN", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
        page: 1, totalPages: 1
      };
      await route.fulfill({ json });
    });

    await page.getByTestId("demote-u-admin1").click();

    await expect(page.getByText("Demoted", { exact: false })).toBeVisible();
    await expect(page.getByText("User is now a regular user.", { exact: false })).toBeVisible();

    const row = page.getByText("a1@example.com").locator("xpath=ancestor::tr[1]");
    await expect(row).toContainText("USER");
  });

  test("forbidden error shows server message", async ({ page }) => {
    await page.route("**/api/admin/promote", async (route) => {
      await route.fulfill({ status: 403, json: { error: "Forbidden" } });
    });

    await page.getByTestId("promote-u-user").click();

    await expect(page.getByText("Action failed", { exact: false })).toBeVisible();
    await expect(page.getByText("Forbidden", { exact: false })).toBeVisible();
  });

  test("last-admin guard disables Demote in UI", async ({ page }) => {
    // Only one admin → Demote disabled for that admin
    await page.route("**/api/admin/users**", async (route) => {
      const json = {
        data: [
          { id: "only-admin", email: "only@example.com", name: "Only", role: "ADMIN", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: "some-user",  email: "user@example.com", name: "User", role: "USER",  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
        page: 1, totalPages: 1
      };
      await route.fulfill({ json });
    });
    await page.reload();

    await expect(page.getByTestId("demote-only-admin")).toBeDisabled();
  });
});

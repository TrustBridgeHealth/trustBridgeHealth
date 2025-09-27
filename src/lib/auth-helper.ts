import type { NextRequest } from "next/server";

function b64urlToJson(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const str = atob(b64 + pad);
  try {
    return JSON.parse(decodeURIComponent(escape(str)));
  } catch {
    return JSON.parse(str);
  }
}

export async function requireUser(req: NextRequest): Promise<{ id: string; role: string }> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    const e: any = new Error("Unauthorized"); e.status = 401; throw e;
  }
  const token = auth.slice("Bearer ".length).trim();
  const parts = token.split(".");
  if (parts.length < 2) { const e: any = new Error("Unauthorized"); e.status = 401; throw e; }
  const payload = b64urlToJson(parts[1]);
  const id = payload.sub || payload.userId || payload.id;
  const role = payload.role || "USER";
  if (!id) { const e: any = new Error("Unauthorized"); e.status = 401; throw e; }
  return { id, role };
}

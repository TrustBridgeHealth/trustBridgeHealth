import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const twoFactorVerified =
      req.headers.get("x-user-2fa-verified") === "true";


    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorVerified,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("[/api/me] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
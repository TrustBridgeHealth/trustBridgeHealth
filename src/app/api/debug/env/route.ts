// src/app/api/debug/env/route.ts

export async function GET() {
  return Response.json({
    hasDb: !!process.env.DATABASE_URL,
    // DO NOT return the actual URL for security reasons
  });
}
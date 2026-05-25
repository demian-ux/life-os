import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBlockerState } from "@/lib/retention/blocker";

export const dynamic = "force-dynamic";

/**
 * Returns the current desired-blocked-domain list for the local user.
 * Polled by the privileged PowerShell blocker to keep the hosts file in sync.
 *
 * Auth: header `X-Life-OS-Token` must match env `LIFE_OS_API_TOKEN`. If the
 * env var is unset (uncommon — only on a fresh install before first-run
 * token generation) we deny access.
 */
export async function GET(request: Request) {
  const expected = process.env.LIFE_OS_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Blocker API token not configured" },
      { status: 503 },
    );
  }
  const provided = request.headers.get("x-life-os-token");
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "No user" }, { status: 404 });
  }

  const state = await getBlockerState(user.id);
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}

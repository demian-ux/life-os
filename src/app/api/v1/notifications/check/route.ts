import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pendingNotifications } from "@/lib/retention/notifications";

export const dynamic = "force-dynamic";

/**
 * Polled by Electron's main process to receive notifications to display
 * as native Windows toasts.
 *
 * Each notification returned is also recorded server-side, so subsequent
 * polls won't re-return the same slug.
 *
 * Auth: same `X-Life-OS-Token` as the blocker.
 */
export async function GET(request: Request) {
  const expected = process.env.LIFE_OS_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "API token not configured" },
      { status: 503 },
    );
  }
  if (request.headers.get("x-life-os-token") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ notifications: [] });
  }

  const notifications = await pendingNotifications(user.id);
  return NextResponse.json({ notifications }, {
    headers: { "Cache-Control": "no-store" },
  });
}

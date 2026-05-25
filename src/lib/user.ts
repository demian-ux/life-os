import { prisma } from "@/lib/db";

export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

export function timezoneOrDefault(
  timezone: string | null | undefined,
): string {
  return timezone || DEFAULT_TIMEZONE;
}

export async function getCurrentUser() {
  return prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
}

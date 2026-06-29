import { auth } from "@/lib/auth";

/**
 * Requires an authenticated ADMIN or TEAM session. Throws if not authorised.
 * Use inside Server Actions / route handlers for the admin area.
 */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM")) {
    throw new Error("Not authorised");
  }
  return session;
}

/** Requires an authenticated ADMIN session. Throws if not authorised. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Not authorised");
  }
  return session;
}

/** Requires an authenticated CLIENT session tied to a client. Throws if not authorised. */
export async function requireClient() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    throw new Error("Not authorised");
  }
  return session;
}

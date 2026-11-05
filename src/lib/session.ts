import { cookies } from "next/headers";
import { isAdminEmail, readSessionToken, SESSION_COOKIE } from "./auth";

export interface ViewerSession {
  email: string;
  isAdmin: boolean;
}

/** The signed-in traveller in a server component or route handler, or null. */
export async function getSession(): Promise<ViewerSession | null> {
  const store = await cookies();
  const session = readSessionToken(store.get(SESSION_COOKIE)?.value);
  return session ? { email: session.email, isAdmin: isAdminEmail(session.email) } : null;
}

import { Role } from "@prisma/client";
import { auth } from "./session";
import { AppError } from "@/lib/errors";

export interface AuthenticatedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  mustChangePassword: boolean;
}

/**
 * Validates that a user is currently authenticated with an active session.
 * Throws AppError("UNAUTHENTICATED") if no active session exists.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    throw new AppError("UNAUTHENTICATED", "Authentication required.");
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword ?? false,
  };
}

/**
 * Validates that the authenticated user possesses one of the allowed roles.
 * Throws AppError("FORBIDDEN") if the user's role is not in the allowed list.
 */
export async function requireRole(
  ...allowedRoles: Role[]
): Promise<AuthenticatedUser> {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to perform this action."
    );
  }

  return user;
}

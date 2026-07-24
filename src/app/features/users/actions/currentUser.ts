import "server-only";

import { auth } from "@/auth";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";

// Secure source of truth for the current user. The JWT identifies the user,
// but authorization-sensitive fields (especially `role`) always come from the
// database so role changes and account deletion take effect on the next
// protected request. React cache deduplicates repeated checks during one render
// without persisting authorization data between requests.
const getCurrentDatabaseUser = cache(async () => {
    const session = await auth();
    const userId = session?.user?.id;

    if (userId == null) return null;

    return db.query.UserTable.findFirst({
        where: and(
            eq(UserTable.id, userId),
            isNull(UserTable.deletedAt)
        ),
        columns: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
        },
    });
});

export async function getCurrentUser({
    withFullUser = false,
    redirectIfNotFound = false,
} = {}) {
    const databaseUser = await getCurrentDatabaseUser();

    if (databaseUser == null) {
        if (redirectIfNotFound) redirect("/login");
        return { userId: null, role: undefined, user: null };
    }

    const user = withFullUser
        ? databaseUser
        : {
              id: databaseUser.id,
              email: databaseUser.email,
              name: databaseUser.name,
              image: databaseUser.image,
              role: databaseUser.role,
          };

    return {
        userId: databaseUser.id,
        role: databaseUser.role,
        user,
    };
}

export async function requireAdmin() {
    const currentUser = await getCurrentUser();

    if (currentUser.userId == null) redirect("/login");
    if (currentUser.role !== "admin") redirect("/");

    return currentUser;
}

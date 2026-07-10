import { auth } from "@/auth";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";


export async function getCurrentUser({
    withFullUser = false,
    redirectIfNotFound = false,
} = {}) {
    const session = await auth();
    const user = session?.user ?? null;
    
    if (user == null) {
        if (redirectIfNotFound) return redirect("/login");
        return {userId: null, role: undefined, user:null };
    }

    if (withFullUser) {
            const fullUser = await db.query.UserTable.findFirst({
            where: eq(UserTable.id, user.id),
        });
        if (fullUser == null) throw new Error("Usuario no encontrado.");
        return { userId: null, role: undefined, user:null };
    }

    return {userId: user.id, role: user.role, user }

}
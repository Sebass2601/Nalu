import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/features/users/actions/currentUser";
import { getProfileUser } from "@/app/features/users/db/users";
import { ProfileForm } from "@/app/features/users/components/ProfileForm";
import { cinzel } from "@/components/ui/fonts";
import { CarvedBackdrop } from "@/components/ui/CarvedBackdrop";

// Where a person edits their own account: photo, name, email, password.
//
// Reached from the avatar in the navbar rather than from a doorway in the bar,
// because it is the one screen in the app that is about the visitor instead of
// the courses.
export default function ProfilePage() {
    return (
        <main
            className={`${cinzel.className} relative min-h-screen w-full`}
        >
            <CarvedBackdrop />

            <div className="mx-auto w-full max-w-2xl px-4 pt-28 pb-16 sm:pt-32">
                <h1 className="mb-8 text-4xl tracking-wide text-ink-bright">
                    Editar perfil
                </h1>

                {/* Everything below the heading is this particular person, which
                    is request-time data. The title paints in the prerendered
                    shell and the forms stream in behind it. */}
                <Suspense fallback={<Skeleton />}>
                    <ProfileDetails />
                </Suspense>
            </div>
        </main>
    );
}

async function ProfileDetails() {
    const { userId } = await getCurrentUser();
    if (userId == null) redirect("/login");

    // A second read rather than `getCurrentUser({ withFullUser: true })`: this
    // screen needs to know whether a password is set, and the session helper
    // deliberately never selects that column.
    const user = await getProfileUser(userId);

    // Only reachable if the account was deleted between the two reads.
    if (user == null) redirect("/login");

    return (
        <ProfileForm
            name={user.name}
            email={user.email}
            image={user.image}
            hasPassword={user.hasPassword}
        />
    );
}

function Skeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-6">
            <div className="h-64 rounded-2xl bg-[#0a1628]/40" />
            <div className="h-56 rounded-2xl bg-[#0a1628]/40" />
            <div className="h-64 rounded-2xl bg-[#0a1628]/40" />
        </div>
    );
}

"use server";

import { signOut } from "@/auth";

// Sign-out as an importable action.
//
// The layouts used to declare this inline inside the navbar's <form>, which
// only works while the form lives in a Server Component. It now sits inside the
// avatar dropdown — a Client Component, since a menu that opens on click cannot
// be anything else — and a client file may import a Server Action but cannot
// define one, so it moves here.
export async function signOutAction() {
    await signOut();
}

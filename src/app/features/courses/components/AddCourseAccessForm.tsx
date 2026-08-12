"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingTextSwap } from "@/components/ui/LoadingTextSwap";
import { actionToast } from "@/lib/actionToast";
import {
    grantCourseAccess,
    searchAccountsForCourseAccess,
} from "../actions/courseAccess";
import type { UserSearchResult } from "../db/adminCourseAccess";

const DEBOUNCE_MS = 250;

// Adds one account to a course's access list.
//
// It searches instead of taking a typed email straight, because the access row
// needs a user id and an admin has only ever seen the address. Searching turns
// "does this account exist?" into something answered before the click rather
// than reported as an error after it.
export function AddCourseAccessForm({ courseId }: { courseId: string }) {
    const [query, setQuery] = useState("");
    // What came back, together with the term it answers. Storing the term
    // alongside the users is what keeps a slow reply from an earlier keystroke
    // from being shown under a later one: results are only displayed when the
    // term they belong to is still the term in the box.
    const [found, setFound] = useState<{
        term: string;
        users: UserSearchResult[];
    } | null>(null);
    const [grantingId, setGrantingId] = useState<string | null>(null);
    const [isGranting, startGranting] = useTransition();

    const term = query.trim();

    // Everything below is derived rather than stored. An effect that also wrote
    // "searching" and "searched" flags had to set state on the way in, which
    // costs a second render pass every keystroke — and the answer was already
    // implied by whether `found` matches what is typed now.
    const isSearching = term.length > 0 && found?.term !== term;
    const hasSearched = found?.term === term;
    const results = hasSearched ? found.users : [];

    // Debounced so a search does not leave for every keystroke. `cancelled`
    // covers the unmount case; a stale reply that still arrives is filtered by
    // the term check above rather than by racing to set state first.
    useEffect(() => {
        if (term.length === 0) return;

        let cancelled = false;

        const timeout = setTimeout(async () => {
            const users = await searchAccountsForCourseAccess({
                courseId,
                query: term,
            });

            if (!cancelled) setFound({ term, users });
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [term, courseId]);

    function grant(user: UserSearchResult) {
        setGrantingId(user.id);

        startGranting(async () => {
            const result = await grantCourseAccess({
                courseId,
                userId: user.id,
            });

            actionToast({ actionData: result });
            setGrantingId(null);

            // Clearing the box on success is what removes the granted account
            // from the results — it has access now, so the search that excludes
            // people who already have it would no longer return them anyway.
            // The stored results need no clearing: an empty box matches no
            // stored term, so nothing is shown.
            if (!result.error) setQuery("");
        });
    }

    return (
        <div className="max-w-xl">
            <label
                htmlFor="course-access-search"
                className="mb-2 block text-sm font-medium"
            >
                Añadir una cuenta
            </label>
            <Input
                id="course-access-search"
                type="search"
                autoComplete="off"
                placeholder="Buscar por email…"
                value={query}
                onChange={event => setQuery(event.target.value)}
            />

            {isSearching && (
                <p className="text-muted-foreground mt-2 text-sm">Buscando…</p>
            )}

            {!isSearching && hasSearched && results.length === 0 && (
                <p className="text-muted-foreground mt-2 text-sm">
                    No hay ninguna cuenta sin acceso con ese email. Si la persona
                    todavía no se ha registrado, tiene que crear su cuenta
                    primero.
                </p>
            )}

            {results.length > 0 && (
                <ul className="mt-2 divide-y rounded-md border border-border">
                    {results.map(user => (
                        <li
                            key={user.id}
                            className="flex items-center justify-between gap-4 p-3"
                        >
                            <div className="min-w-0">
                                <div className="truncate font-medium">
                                    {user.name}
                                </div>
                                <div className="text-muted-foreground truncate text-sm">
                                    {user.email}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                disabled={isGranting}
                                onClick={() => grant(user)}
                            >
                                <LoadingTextSwap
                                    isLoading={
                                        isGranting && grantingId === user.id
                                    }
                                >
                                    Dar acceso
                                </LoadingTextSwap>
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

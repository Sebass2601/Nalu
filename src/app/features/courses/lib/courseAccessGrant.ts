// Where a row in `user_course_access` came from, and what may be done to it.
//
// The table holds two kinds of row that look identical apart from one column:
// access somebody bought, and access an admin handed out. `grantedBy` is the
// only thing telling them apart — a purchase never sets it.
//
// This lives apart from the queries that read those rows, for the same reason
// `subscriptionGrantsAccess` does: it is the rule, not the fetching, and the
// rule is what has to be right. The admin UI hides the remove button with it
// and the Server Action refuses the request with it, so both sides of the
// screen are deciding from one definition rather than two that can drift.

export type CourseAccessOrigin = "purchase" | "manual";

// Anything carrying the column. Deliberately loose so a row selected with
// `columns: { grantedBy: true }` satisfies it as readily as a full row.
type HasGrantedBy = { grantedBy?: string | null };

export function accessOrigin({ grantedBy }: HasGrantedBy): CourseAccessOrigin {
    return grantedBy == null ? "purchase" : "manual";
}

// Whether the admin screen may delete access of this origin.
//
// Note the direction of the default below: a row whose origin cannot be
// established counts as purchased and is therefore protected. Every row written
// before the column existed is NULL, and being unable to revoke access that
// should have been revocable costs a support message, while the opposite costs
// a customer the thing they paid for.
export function originIsRevocable(origin: CourseAccessOrigin): boolean {
    return origin === "manual";
}

// The same question asked of a row rather than of an origin. The list screen has
// already narrowed its rows to an origin and uses the function above; this is
// for callers holding the raw column.
export function accessIsRevocable(access: HasGrantedBy): boolean {
    return originIsRevocable(accessOrigin(access));
}

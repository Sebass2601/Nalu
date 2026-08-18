// The cover for a course with no artwork: its own name, set as type on the navy
// gradient.
//
// Not a stand-in for a missing picture — it carries the same thing a cover
// carries, which is why it is worth the space.
//
// Shared by every card that draws a cover block unconditionally, which is what
// keeps a row of cards on one baseline: a card that simply omits the block when
// there is no image is shorter than its neighbours, and in a strip that reads as
// a fault rather than as variety.
export function TypographicCover({ name }: { name: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#16294a] via-[#0f1f38] to-[#0a1628] p-4">
            <span className="line-clamp-3 text-center text-sm tracking-[0.2em] text-ink-body uppercase">
                {name}
            </span>
        </div>
    );
}

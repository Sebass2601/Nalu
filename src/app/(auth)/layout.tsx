import type { ReactNode } from "react";
import { LegalFooter } from "@/components/ui/LegalFooter";

// Login and sign-up sit outside the consumer layout — no navbar, no contact
// mark — but they are where an account is made, which is the moment the terms
// matter most. So they get the same link at their foot, anchored the same way
// as on the consumer pages: see the wrapper in `(consumer)/layout.tsx`.
export default function AuthLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    return (
        <div className="relative flex-1">
            {children}
            <LegalFooter />
        </div>
    );
}

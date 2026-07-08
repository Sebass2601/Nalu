import { ButtonHTMLAttributes } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean
}

export function Button({ className, type = "button", asChild = false, ...props }: ButtonProps) {
    const Comp = asChild ? Slot : "button"
    return (
        <Comp
            type={asChild ? undefined : type}
            className={cn(
                "inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:pointer-events-none disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
}

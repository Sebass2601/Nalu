"use client"

import { ComponentPropsWithRef, ReactNode, useTransition } from "react";
import { Button } from "./ui/button";
import { PlaqueButton } from "./ui/PlaqueButton";
import { actionToast } from "@/lib/actionToast";
import { LoadingTextSwap } from "./ui/LoadingTextSwap";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

export function ActionButton({
    action,
    requireAreYouSure = false,
    plaque = false,
    ...props
}: Omit<ComponentPropsWithRef<typeof Button>, "onClick"> & {
    action: () => Promise<{error: boolean, message: string}>
    requireAreYouSure?: boolean
    // Wear the consumer plaque instead of the admin button. Opt-in so every
    // existing call site — all of them in /admin — keeps the button it has.
    // `variant` and `size` are shadcn's and mean nothing to the plaque, so
    // they are dropped rather than passed on.
    plaque?: boolean
}) {
   const [isLoading, startTransition] = useTransition();

   function performAction() {
     startTransition(async () => {
        const data = await action()
        actionToast({ actionData: data })
     })
   };

   // The two controls take different props, so the plaque path forwards only
   // what both understand rather than spreading shadcn's props at it. `variant`
   // is dropped outright — shadcn's values ("outline", "destructive") are not
   // the plaque's — while `size` is narrowed, since the plaque has no "xs",
   // "lg" or icon sizes and anything but "sm" means the default plaque.
   //
   // A plain function returning an element, not a component declared here: a
   // component defined during render is a new type on every render, which
   // remounts the button and drops its focus and pending state.
   function renderControl(
     controlProps: { disabled?: boolean; onClick?: () => void },
     label: ReactNode
   ) {
     return plaque ? (
       <PlaqueButton
         className={props.className}
         size={props.size === "sm" ? "sm" : "default"}
         {...controlProps}
       >
         {label}
       </PlaqueButton>
     ) : (
       <Button {...props} {...controlProps}>{label}</Button>
     );
   }

   if (requireAreYouSure) {
    return (
      <AlertDialog open={isLoading ? true : undefined }>
        <AlertDialogTrigger asChild>
          {renderControl({}, props.children)}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estas Seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no puede ser deshecha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isLoading} onClick={performAction}>
              <LoadingTextSwap isLoading={isLoading}>Si</LoadingTextSwap>
            </AlertDialogAction> 
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
   }

   return renderControl(
     { disabled: isLoading, onClick: performAction },
     <LoadingTextSwap isLoading={isLoading}>{props.children}</LoadingTextSwap>
   );
}


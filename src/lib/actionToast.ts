import { toast, type ExternalToast } from "sonner"

export function actionToast({
    actionData,
    ...props
}: ExternalToast & {
    actionData: { error: boolean; message: string }
}) {
    const title = actionData.error ? "Error" : "Success"
    const fn = actionData.error ? toast.error : toast.success
    return fn(title, { description: actionData.message, ...props })
}
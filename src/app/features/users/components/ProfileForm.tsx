"use client"

import { useActionState, useState } from "react"
import {
    updateEmail,
    updatePassword,
    updateProfile,
    type ProfileState,
} from "../actions/profile"
import { ProfileAvatarField } from "./ProfileAvatarField"

// The three things a person can change about their own account, as three
// independent forms.
//
// Independent on purpose. One form with one submit would mean a mistyped
// password throwing away a name and a photo the user had just set, and would
// force a single action to decide what "partly succeeded" means. Each of these
// stands alone, carries its own errors, and leaves the others untouched.
export function ProfileForm({
    name,
    email,
    image,
    hasPassword,
}: {
    name: string
    email: string
    image: string | null
    hasPassword: boolean
}) {
    return (
        <div className="flex flex-col gap-6">
            <IdentitySection name={name} image={image} />

            {/* A Google account has no password, so there is nothing to check a
                change against — and its email is whatever Google says it is.
                Both forms are withheld rather than shown broken. The actions
                behind them refuse those accounts too; this only decides what is
                worth drawing. */}
            {hasPassword ? (
                <>
                    <EmailSection email={email} />
                    <PasswordSection />
                </>
            ) : (
                <Section title="Cuenta">
                    <p className="text-sm text-gold-meta">
                        Tu cuenta inicia sesión con Google, así que tu email y
                        tu contraseña se gestionan desde ahí.
                    </p>
                    <p className="font-sans text-base text-gold-body">
                        {email}
                    </p>
                </Section>
            )}
        </div>
    )
}

function IdentitySection({
    name,
    image,
}: {
    name: string
    image: string | null
}) {
    const [state, action, pending] = useActionState(updateProfile, undefined)
    // The picture is chosen by an upload that finishes long before the form is
    // submitted, so its URL is held here and rides along in a hidden input.
    const [imageUrl, setImageUrl] = useState(image)

    return (
        <Section title="Foto y nombre">
            <form action={action} className="flex flex-col gap-5">
                <ProfileAvatarField
                    value={imageUrl}
                    onChange={setImageUrl}
                    disabled={pending}
                />
                {/* Empty string when cleared — the schema turns that back into
                    null, since an unset input cannot submit one. */}
                <input type="hidden" name="image" value={imageUrl ?? ""} />

                <Field
                    id="name"
                    label="Nombre"
                    defaultValue={name}
                    errors={state?.fieldErrors?.name}
                />

                <Feedback state={state} />
                <Submit pending={pending}>Guardar</Submit>
            </form>
        </Section>
    )
}

function EmailSection({ email }: { email: string }) {
    const [state, action, pending] = useActionState(updateEmail, undefined)

    return (
        <Section title="Email">
            {/* Shown rather than prefilled into the field below. The new
                address has to be typed twice to catch a slip, and starting
                either box with the current address would just mean clearing it
                first — worse, it would make the second box look pre-agreed. */}
            <div className="flex flex-col gap-1">
                <span className="text-xs tracking-widest text-gold-meta uppercase">
                    Email actual
                </span>
                <span className="font-sans text-base text-gold-body">
                    {email}
                </span>
            </div>

            <form action={action} className="flex flex-col gap-5">
                <Field
                    id="email"
                    label="Nuevo email"
                    type="email"
                    autoComplete="email"
                    errors={state?.fieldErrors?.email}
                />
                <Field
                    id="confirmEmail"
                    label="Repetir nuevo email"
                    type="email"
                    // Off, or the browser helpfully fills this with the address
                    // already on file and the two boxes agree on the wrong one.
                    autoComplete="off"
                    errors={state?.fieldErrors?.confirmEmail}
                />
                <Field
                    id="currentPassword"
                    label="Contraseña actual"
                    type="password"
                    autoComplete="current-password"
                    errors={state?.fieldErrors?.currentPassword}
                />
                <p className="text-xs text-gold-meta">
                    A partir de ahora iniciarás sesión con este email. No
                    enviamos ningún mensaje de confirmación, así que revisa que
                    esté bien escrito.
                </p>

                <Feedback state={state} />
                <Submit pending={pending}>Cambiar email</Submit>
            </form>
        </Section>
    )
}

function PasswordSection() {
    const [state, action, pending] = useActionState(updatePassword, undefined)

    return (
        <Section title="Contraseña">
            <form action={action} className="flex flex-col gap-5">
                <Field
                    id="currentPassword"
                    label="Contraseña actual"
                    type="password"
                    autoComplete="current-password"
                    errors={state?.fieldErrors?.currentPassword}
                />
                <Field
                    id="newPassword"
                    label="Nueva contraseña"
                    type="password"
                    autoComplete="new-password"
                    errors={state?.fieldErrors?.newPassword}
                />
                <Field
                    id="confirmPassword"
                    label="Repetir nueva contraseña"
                    type="password"
                    autoComplete="new-password"
                    errors={state?.fieldErrors?.confirmPassword}
                />

                <Feedback state={state} />
                <Submit pending={pending}>Cambiar contraseña</Submit>
            </form>
        </Section>
    )
}

// The same bordered navy card the subscription screen uses, so /profile reads
// as another page of the same account rather than a form dumped on the canvas.
function Section({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <section className="flex flex-col gap-5 rounded-2xl border border-yellow-200/30 bg-[#0a1628]/60 p-6">
            <h2 className="text-sm tracking-[0.3em] text-gold-body uppercase">
                {title}
            </h2>
            {children}
        </section>
    )
}

// `font-sans` on the input itself: the page is set in Cinzel, which is a display
// face — fine for a label, wrong for an email address or a row of password dots.
// The auth screens make the same split.
function Field({
    id,
    label,
    errors,
    ...props
}: {
    id: string
    label: string
    errors?: string[]
} & React.ComponentProps<"input">) {
    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={id}
                className="text-xs tracking-widest text-yellow-200/90"
            >
                {label}
            </label>
            <input
                id={id}
                name={id}
                type="text"
                className="font-sans rounded-md border border-yellow-200/40 bg-white/5 px-3 py-2 text-yellow-50 placeholder-yellow-200/30 outline-none focus:border-yellow-200 focus:ring-1 focus:ring-yellow-200/50"
                {...props}
            />
            {errors?.map(message => (
                <p key={message} className="text-sm text-red-400">
                    {message}
                </p>
            ))}
        </div>
    )
}

// The one line a form says about itself after a submit: what went wrong across
// the whole form, or that it worked. Field-level messages sit with their fields.
function Feedback({ state }: { state: ProfileState | undefined }) {
    if (state?.error) {
        return <p className="text-sm text-red-400">{state.error}</p>
    }
    if (state?.success) {
        return <p className="text-sm text-yellow-200">{state.success}</p>
    }
    return null
}

function Submit({
    pending,
    children,
}: {
    pending: boolean
    children: React.ReactNode
}) {
    return (
        <button
            type="submit"
            disabled={pending}
            className="cursor-pointer self-start rounded-md bg-yellow-200 px-4 py-2 text-sm font-semibold tracking-widest text-[#0a1628] transition-colors hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? "Guardando..." : children}
        </button>
    )
}

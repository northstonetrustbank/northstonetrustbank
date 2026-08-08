"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth-actions";
import { PasswordInput } from "@/components/password-input";

/**
 * Staff sign-in, rendered by the admin layout when nobody is signed in.
 * Deliberately a username field rather than an email one: the bank's staff
 * sign in here with a short username, and `type="email"` would make the browser
 * refuse to submit it before the server ever saw it.
 *
 * The admin area is English-only (no getDict anywhere under /admin), so the
 * copy is plain literals — adding i18n keys here would force all four locale
 * files to change for a screen no client ever sees.
 */
const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-navy-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-semibold text-navy-800">
        Username
        <input
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-semibold text-navy-800">
        Password
        <PasswordInput
          name="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white shadow-md shadow-accent-700/25 transition hover:bg-accent-600 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

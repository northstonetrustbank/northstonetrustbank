"use client";

import { useActionState } from "react";
import { submitIdentityAction } from "@/lib/actions/auth-actions";

export type IdentityLabels = {
  title: string;
  body: string;
  ssnLabel: string;
  ssnHint: string;
  addressLabel: string;
  address2Label: string;
  cityLabel: string;
  regionLabel: string;
  postalLabel: string;
  countryLabel: string;
  phoneLabel: string;
  phoneHint: string;
  optional: string;
  submit: string;
  submitting: string;
};

const field =
  "mt-1.5 w-full rounded-xl border border-line bg-ink-1 px-3.5 py-2.5 text-[15px] text-fg " +
  "outline-none transition placeholder:text-fg-faint focus:border-brand-500 " +
  "focus:ring-2 focus:ring-brand-500/25";

const label = "block text-[13px] font-semibold text-fg";

/**
 * Customer identification: the details a bank has to hold on an account holder,
 * as opposed to the photo of a document that corroborates them.
 *
 * The SSN input is deliberately type="text" with inputMode numeric rather than
 * type="number" — a number input lets browsers strip leading zeros and offers a
 * spinner, and an SSN beginning 0 is perfectly ordinary.
 */
export function IdentityStep({
  labels,
  defaults,
}: {
  labels: IdentityLabels;
  defaults: { phone: string; country: string };
}) {
  const [state, formAction, pending] = useActionState(submitIdentityAction, {});

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-fg">{labels.title}</h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-fg-muted">{labels.body}</p>

      <form action={formAction} className="mt-7 space-y-5">
        <div>
          <label htmlFor="ssn" className={label}>
            {labels.ssnLabel}
          </label>
          <input
            id="ssn"
            name="ssn"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="123-45-6789"
            maxLength={20}
            className={`${field} tnum`}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-fg-faint">{labels.ssnHint}</p>
        </div>

        <div>
          <label htmlFor="addressLine1" className={label}>
            {labels.addressLabel}
          </label>
          <input
            id="addressLine1"
            name="addressLine1"
            required
            autoComplete="address-line1"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="addressLine2" className={label}>
            {labels.address2Label}{" "}
            <span className="font-medium text-fg-faint">{labels.optional}</span>
          </label>
          <input
            id="addressLine2"
            name="addressLine2"
            autoComplete="address-line2"
            className={field}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className={label}>
              {labels.cityLabel}
            </label>
            <input id="city" name="city" required autoComplete="address-level2" className={field} />
          </div>
          <div>
            <label htmlFor="region" className={label}>
              {labels.regionLabel}
            </label>
            <input id="region" name="region" autoComplete="address-level1" className={field} />
          </div>
          <div>
            <label htmlFor="postalCode" className={label}>
              {labels.postalLabel}
            </label>
            <input
              id="postalCode"
              name="postalCode"
              required
              autoComplete="postal-code"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="country" className={label}>
              {labels.countryLabel}
            </label>
            <input
              id="country"
              name="country"
              required
              defaultValue={defaults.country}
              autoComplete="country-name"
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className={label}>
            {labels.phoneLabel}
          </label>
          <input
            id="phone"
            name="phone"
            required
            type="tel"
            defaultValue={defaults.phone}
            autoComplete="tel"
            className={field}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-fg-faint">{labels.phoneHint}</p>
        </div>

        {state?.error && (
          <p
            role="alert"
            className="rounded-xl border border-neg/30 bg-neg/10 px-4 py-3 text-sm font-medium text-neg"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60 sm:w-auto sm:px-10"
        >
          {pending ? labels.submitting : labels.submit}
        </button>
      </form>
    </div>
  );
}

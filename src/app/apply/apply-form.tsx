"use client";

import { useActionState, useState } from "react";
import { submitApplicationAction } from "@/lib/actions/product-actions";
import type { FormState } from "@/lib/actions/auth-actions";
import { BankCard } from "@/components/bank-card";
import { CARD_TIERS, type FieldDef } from "@/lib/products";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
const labelClass = "block text-[13px] font-semibold text-fg";

const TERMS = [12, 24, 36, 60, 120, 240, 360];

export type ApplyLabels = {
  amount: string;
  purpose: string;
  submit: string;
  submitting: string;
  chooseTier: string;
  tierHint: string;
  tierLimit: string;
  term: string;
  termMonths: string;
  aboutYou: string;
  aboutYouHint: string;
  aboutProduct: string;
  choose: string;
  tiers: Record<string, string>;
  tierBlurbs: Record<string, string>;
  tierRanges: Record<string, string>;
  fields: Record<string, string>;
  fieldOptions: Record<string, string>;
};

function Field({
  field,
  labels,
  currencySymbol,
  values,
  onChange,
}: {
  field: FieldDef;
  labels: ApplyLabels;
  currencySymbol: string;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  // Conditional questions (employer only when employed, and so on).
  if (field.showIf) {
    const current = values[field.showIf.field] ?? "";
    if (!field.showIf.equals.includes(current)) return null;
  }

  const label = labels.fields[field.name] ?? field.name;
  const value = values[field.name] ?? "";
  const set = (v: string) => onChange(field.name, v);

  if (field.kind === "select") {
    return (
      <label className={labelClass}>
        {label}
        {field.required && <span className="ml-1 text-brand-400">*</span>}
        <select
          name={field.name}
          value={value}
          required={field.required}
          onChange={(e) => set(e.target.value)}
          className={inputClass}
        >
          <option value="">{labels.choose}</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {labels.fieldOptions[o] ?? o}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === "textarea") {
    return (
      <label className={`${labelClass} sm:col-span-2`}>
        {label}
        <textarea
          name={field.name}
          rows={3}
          maxLength={300}
          value={value}
          onChange={(e) => set(e.target.value)}
          className={inputClass}
        />
      </label>
    );
  }

  if (field.kind === "money") {
    return (
      <label className={labelClass}>
        {label}
        {field.required && <span className="ml-1 text-brand-400">*</span>}
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 mt-[3px] -translate-y-1/2 text-[15px] text-fg-faint">
            {currencySymbol}
          </span>
          <input
            name={field.name}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required={field.required}
            value={value}
            onChange={(e) => set(e.target.value)}
            placeholder="0.00"
            className={`${inputClass} pl-8`}
          />
        </div>
      </label>
    );
  }

  return (
    <label className={labelClass}>
      {label}
      {field.required && <span className="ml-1 text-brand-400">*</span>}
      <input
        name={field.name}
        type={field.kind === "number" ? "number" : "text"}
        min={field.kind === "number" ? 0 : undefined}
        required={field.required}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

export function ApplyForm({
  productKey,
  productName,
  showAmount,
  amountPlaceholder,
  showTerm,
  showTiers,
  holderName,
  currencySymbol,
  sharedFields,
  productFields,
  labels,
}: {
  productKey: string;
  productName: string;
  showAmount: boolean;
  amountPlaceholder?: string;
  showTerm: boolean;
  showTiers: boolean;
  holderName: string;
  currencySymbol: string;
  sharedFields: FieldDef[];
  productFields: FieldDef[];
  labels: ApplyLabels;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    submitApplicationAction,
    null
  );
  const [tier, setTier] = useState<string>("CLASSIC");
  const [values, setValues] = useState<Record<string, string>>({});
  const onChange = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));

  const hasProductSection = showAmount || showTerm || productFields.length > 0;

  return (
    <form action={formAction} className="mt-8 space-y-9">
      <input type="hidden" name="productKey" value={productKey} />

      {showTiers && (
        <fieldset>
          <legend className="text-base font-semibold text-fg">{labels.chooseTier}</legend>
          <p className="mt-1 text-sm text-fg-muted">{labels.tierHint}</p>
          <input type="hidden" name="requestedTier" value={tier} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {CARD_TIERS.map((option) => {
              const selected = tier === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTier(option)}
                  aria-pressed={selected}
                  className={`rounded-2xl border-2 bg-ink-1 p-3 text-left transition ${
                    selected
                      ? "border-accent-500 shadow-md"
                      : "border-line-soft hover:border-line"
                  }`}
                >
                  <BankCard
                    theme={option === "CLASSIC" ? "BLUE" : option}
                    productName={productName}
                    badge={labels.tiers[option] ?? option}
                    holder={holderName.toUpperCase()}
                    placeholder
                    className={selected ? "" : "opacity-90"}
                  />
                  <div className="mt-3 px-1 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-fg">
                        {labels.tiers[option] ?? option}
                      </p>
                      {selected && (
                        <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-fg-muted">
                      {labels.tierBlurbs[option] ?? ""}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                      {labels.tierLimit}: {labels.tierRanges[option]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {hasProductSection && (
        <fieldset>
          <legend className="text-base font-semibold text-fg">{labels.aboutProduct}</legend>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {showAmount && (
              <label className={labelClass}>
                {labels.amount}
                <span className="ml-1 text-brand-400">*</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 mt-[3px] -translate-y-1/2 text-[15px] text-fg-faint">
                    {currencySymbol}
                  </span>
                  <input
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder={amountPlaceholder || "0.00"}
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </label>
            )}
            {showTerm && (
              <label className={labelClass}>
                {labels.term}
                <select name="termMonths" defaultValue="" className={inputClass}>
                  <option value="">{labels.choose}</option>
                  {TERMS.map((n) => (
                    <option key={n} value={n}>
                      {labels.termMonths.replace("{n}", String(n))}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {productFields.map((f) => (
              <Field
                key={f.name}
                field={f}
                labels={labels}
                currencySymbol={currencySymbol}
                values={values}
                onChange={onChange}
              />
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="text-base font-semibold text-fg">{labels.aboutYou}</legend>
        <p className="mt-1 text-sm text-fg-muted">{labels.aboutYouHint}</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {sharedFields.map((f) => (
            <Field
              key={f.name}
              field={f}
              labels={labels}
              currencySymbol={currencySymbol}
              values={values}
              onChange={onChange}
            />
          ))}
        </div>
      </fieldset>

      {state?.error && (
        <p className="rounded-lg border border-neg/25 bg-neg/10 px-3.5 py-2.5 text-sm text-neg">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}

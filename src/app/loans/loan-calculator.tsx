"use client";

import { useMemo, useState } from "react";
import { monthlyPaymentCents } from "@/lib/lending";

/**
 * What a loan actually costs, before anyone applies for one.
 *
 * The point is the total interest, not the monthly payment: a longer term
 * always looks cheaper month to month and is nearly always dearer overall.
 * Both are shown together so that trade is visible while the term is moved.
 *
 * It uses the same amortisation the approved loans use, so the estimate here
 * and the schedule afterwards can never disagree.
 */

export type CalculatorProduct = {
  key: string;
  title: string;
  aprFrom: number;
  minCents: number;
  maxCents: number;
  minTermMonths: number;
  maxTermMonths: number;
};

type Labels = {
  title: string;
  lede: string;
  product: string;
  amount: string;
  rate: string;
  term: string;
  months: string;
  monthly: string;
  totalInterest: string;
  totalPayable: string;
  outOfRange: string;
  apply: string;
  disclaimer: string;
};

export function LoanCalculator({
  products,
  labels,
  locale,
  currency,
}: {
  products: CalculatorProduct[];
  labels: Labels;
  locale: string;
  currency: string;
}) {
  const [key, setKey] = useState(products[0]?.key ?? "");
  const product = products.find((p) => p.key === key) ?? products[0];

  const [amount, setAmount] = useState(() => Math.round((product?.minCents ?? 500_000) / 100));
  const [rate, setRate] = useState(product?.aprFrom ?? 5.99);
  const [term, setTerm] = useState(product?.minTermMonths ?? 36);

  // Changing product resets the inputs to that product's own range, otherwise
  // the form sits on figures the product does not offer.
  function chooseProduct(nextKey: string) {
    const next = products.find((p) => p.key === nextKey);
    setKey(nextKey);
    if (!next) return;
    setRate(next.aprFrom);
    setAmount(Math.min(Math.max(amount, Math.round(next.minCents / 100)), Math.round(next.maxCents / 100)));
    setTerm(Math.min(Math.max(term, next.minTermMonths), next.maxTermMonths));
  }

  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [locale, currency]
  );
  const moneyExact = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency }),
    [locale, currency]
  );

  const cents = Math.round(amount * 100);
  const inRange =
    product && cents >= product.minCents && cents <= product.maxCents &&
    term >= product.minTermMonths && term <= product.maxTermMonths;

  const monthly = inRange ? monthlyPaymentCents(cents, rate, term) : null;
  const totalPayable = monthly === null ? null : monthly * term;
  const totalInterest = totalPayable === null ? null : totalPayable - cents;

  if (!product) return null;

  const field =
    "mt-1.5 w-full rounded-lg border border-line bg-ink-2 px-3.5 py-2.5 text-[15px] text-fg transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";
  const label = "block text-[13px] font-medium text-fg-muted";

  return (
    <div className="elev-2 overflow-hidden rounded-2xl border border-line bg-ink-1">
      <div className="border-b border-line-soft px-5 py-4 sm:px-6">
        <h2 className="text-[15px] font-semibold text-fg">{labels.title}</h2>
        <p className="mt-1 text-[13px] text-fg-muted">{labels.lede}</p>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <label className={label}>
            {labels.product}
            <select value={key} onChange={(e) => chooseProduct(e.target.value)} className={field}>
              {products.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className={label}>
              {labels.amount}
              <input
                type="number"
                inputMode="numeric"
                min={Math.round(product.minCents / 100)}
                max={Math.round(product.maxCents / 100)}
                step={100}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={field}
              />
              <span className="mt-1.5 block text-xs font-normal text-fg-faint">
                {money.format(product.minCents / 100)} – {money.format(product.maxCents / 100)}
              </span>
            </label>

            <label className={label}>
              {labels.rate}
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={40}
                step={0.01}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className={field}
              />
              <span className="mt-1.5 block text-xs font-normal text-fg-faint">
                {product.aprFrom}%
              </span>
            </label>
          </div>

          <label className={label}>
            {labels.term}
            {/* A slider, because the term is the figure worth playing with —
                it is what moves the monthly payment and the total apart. */}
            <input
              type="range"
              min={product.minTermMonths}
              max={product.maxTermMonths}
              step={6}
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              className="mt-3 w-full accent-brand-500"
            />
            <span className="tnum mt-1 block text-[13px] font-medium text-fg">
              {term} {labels.months}
            </span>
          </label>
        </div>

        {/* The read-out */}
        <div className="rounded-2xl border border-line bg-ink-0/60 p-5 lg:w-[15.5rem]">
          {inRange && monthly !== null ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-faint">
                {labels.monthly}
              </p>
              <p className="tnum display mt-1 text-[30px] font-semibold text-fg">
                {moneyExact.format(monthly / 100)}
              </p>
              <dl className="mt-5 space-y-2.5 border-t border-line-soft pt-4 text-[13px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-fg-muted">{labels.totalInterest}</dt>
                  <dd className="tnum font-semibold text-gold">
                    {moneyExact.format((totalInterest ?? 0) / 100)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-fg-muted">{labels.totalPayable}</dt>
                  <dd className="tnum font-semibold text-fg">
                    {moneyExact.format((totalPayable ?? 0) / 100)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-fg-muted">{labels.outOfRange}</p>
          )}

          <a
            href={`/product/${product.key}`}
            className="mt-5 block rounded-xl bg-brand-500 py-2.5 text-center text-[13px] font-semibold text-white transition hover:bg-brand-600"
          >
            {labels.apply}
          </a>
        </div>
      </div>

      <p className="border-t border-line-soft px-5 py-3 text-[11px] leading-relaxed text-fg-faint sm:px-6">
        {labels.disclaimer}
      </p>
    </div>
  );
}

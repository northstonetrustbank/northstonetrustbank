// TEMPORARY — visual comparison only, no database access. Delete after review.
//
// The same dashboard on dark surfaces, built from the existing navy ramp
// rather than a new palette: navy-950 ground, a raised navy-900 card, and the
// accent blue kept as the only saturated colour so the money stays the loudest
// thing on the screen.
import { en } from "@/i18n/en";
import { formatMoney } from "@/lib/bank";
import { BalanceTrend } from "@/components/balance-trend";
import { Icons, NavIcons } from "@/components/icons";

const glyph = (name: string) => NavIcons[name] ?? Icons[name] ?? NavIcons.home;

export const metadata = { title: "Design preview — dark" };

const t = en;
const locale = "en";
const currency = "USD";

function series() {
  const out: { v: number; date: string; value: string }[] = [];
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  let bal = 265_000;
  const now = Date.now();
  for (let i = 89; i >= 0; i--) {
    const at = new Date(now - i * 86_400_000);
    const day = at.getDate();
    if (day === 1) bal -= 132_000;
    if (day === 15 || day === 28) bal += 118_000;
    bal -= Math.round(1200 + Math.sin(i / 3) * 900 + (i % 7) * 350);
    out.push({ v: bal, date: fmt.format(at), value: formatMoney(bal, locale, currency) });
  }
  return out;
}

const NAV = [
  ["home", "Overview", true],
  ["wallet", "Accounts", false],
  ["swap", "Move money", false],
  ["list", "Transactions", false],
  ["card", "Cards", false],
  ["lending", "Loans", false],
] as const;

function Tile({ icon, label }: { icon: string; label: string }) {
  const draw = glyph(icon);
  return (
    <div className="flex w-[3.9rem] shrink-0 flex-col items-center gap-1.5 text-center sm:w-[4.5rem]">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-1/[0.06] text-white ring-1 ring-inset ring-white/10">
        {draw({ className: "h-5 w-5" })}
      </span>
      <span className="w-full truncate text-[11px] font-medium text-fg-faint">{label}</span>
    </div>
  );
}

export default function DarkPreview() {
  const data = series();
  const latest = data[data.length - 1].v;

  return (
    <div className="flex min-h-screen bg-[#050b18]">
      <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-white/[0.06] bg-[#040814] p-4 lg:flex">
        {NAV.map(([icon, label, active]) => (
          <span
            key={label}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              active ? "bg-brand-500/15 text-white" : "text-fg-faint"
            }`}
          >
            {glyph(icon)({
              className: `h-[18px] w-[18px] ${active ? "text-accent-400" : "text-navy-400"}`,
            })}
            {label}
          </span>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/[0.06] bg-[#040814]">
          <div className="flex h-16 items-center px-4 sm:px-6">
            <h1 className="text-base font-semibold tracking-tight text-white">
              {t.dashboard.overview}
            </h1>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0b1424] p-5 shadow-xl shadow-black/40 sm:p-7">
            <p className="text-[13px] text-fg-faint">Good evening, Preview</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-400">
              {t.dashboard.totalBalance}
            </p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="tnum text-[2rem] font-semibold leading-none tracking-tight text-white sm:text-[2.5rem]">
                {formatMoney(latest, locale, currency)}
              </p>
              <span className="tnum rounded-full bg-emerald-400/10 px-2.5 py-1 text-[12px] font-semibold text-emerald-300">
                +8.4% {t.dashboard.thisMonth}
              </span>
            </div>
            <p className="tnum mt-2 text-[12px] text-navy-400">{t.bank.accountNo} NS-48555789</p>

            <div className="mt-4">
              <BalanceTrend data={data} label={t.dashboard.trendLabel} />
            </div>

            <div className="no-scrollbar mt-5 flex gap-1 overflow-x-auto border-t border-white/[0.07] pt-5 sm:gap-3">
              <Tile icon="plus" label={t.bank.actionDeposit} />
              <Tile icon="send" label={t.bank.actionSend} />
              <Tile icon="bank" label={t.bank.withdraw} />
              <Tile icon="swap" label={t.bank.transfer} />
              <Tile icon="statement" label={t.statements.link} />
              <Tile icon="target" label={t.bank.actionGoals} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ["bg-emerald-400", t.dashboard.moneyIn, 708_000],
              ["bg-red-400", t.dashboard.moneyOut, 624_300],
            ].map(([dot, label, cents]) => (
              <div
                key={label as string}
                className="rounded-2xl border border-white/[0.07] bg-[#0b1424] p-4 sm:p-5"
              >
                <p className="flex items-center gap-2 text-[12px] font-medium text-fg-faint">
                  <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
                  {label as string}
                </p>
                <p className="tnum mt-1.5 text-xl font-semibold tracking-tight text-white">
                  {formatMoney(cents as number, locale, currency)}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-white">
              {t.dashboard.yourAccounts}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Checking", "···· 5789", 479_810],
                ["Savings", "···· 2233", 120_000],
              ].map(([kind, num, cents]) => (
                <div
                  key={kind as string}
                  className="rounded-2xl border border-white/[0.07] bg-[#0b1424] p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-400">
                        {kind as string}
                      </p>
                      <p className="tnum mt-1 font-mono text-[12px] text-fg-faint">{num as string}</p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-1/[0.06] text-fg-muted">
                      {NavIcons.wallet({ className: "h-[18px] w-[18px]" })}
                    </span>
                  </div>
                  <p className="tnum mt-4 text-2xl font-semibold tracking-tight text-white">
                    {formatMoney(cents as number, locale, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

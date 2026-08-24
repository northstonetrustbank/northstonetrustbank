// DESIGN PREVIEW — a dashboard built to the new token set. No database access.
// Delete once a direction is agreed.
import { formatMoney } from "@/lib/bank";
import { BalanceTrend } from "@/components/balance-trend";
import { Icons, NavIcons } from "@/components/icons";

export const metadata = { title: "Northstone — design" };

const glyph = (name: string) => NavIcons[name] ?? Icons[name] ?? NavIcons.home;
const money = (c: number) => formatMoney(c, "en", "USD");

function series() {
  const out: { v: number; date: string; value: string }[] = [];
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  let bal = 265_000;
  const now = Date.now();
  for (let i = 89; i >= 0; i--) {
    const at = new Date(now - i * 86_400_000);
    const d = at.getDate();
    if (d === 1) bal -= 132_000;
    if (d === 15 || d === 28) bal += 118_000;
    bal -= Math.round(900 + Math.sin(i / 4) * 700 + (i % 6) * 260);
    out.push({ v: bal, date: fmt.format(at), value: money(bal) });
  }
  return out;
}

const NAV: [string, string, boolean][] = [
  ["home", "Overview", true],
  ["wallet", "Accounts", false],
  ["swap", "Move money", false],
  ["list", "Transactions", false],
  ["card", "Cards", false],
  ["lending", "Loans", false],
  ["statement", "Documents", false],
  ["shield", "Security", false],
];

const ACTIONS: [string, string][] = [
  ["plus", "Deposit"],
  ["send", "Send"],
  ["bank", "Withdraw"],
  ["swap", "Transfer"],
  ["statement", "Statements"],
  ["target", "Goals"],
];

const ACCOUNTS = [
  { kind: "Checking", tail: "5789", cents: 479_810, accent: "from-brand-500/25" },
  { kind: "Savings", tail: "2233", cents: 120_000, accent: "from-pos/20" },
];

const TX = [
  ["Payroll — Acme Corp", "Today", 118_000],
  ["Rent", "1 Aug", -132_000],
  ["Whole Foods", "31 Jul", -8_240],
  ["Interest earned", "30 Jul", 1_250],
  ["Card payment", "28 Jul", -40_000],
];

/** Initial-in-a-well, so a list of entries scans like a list of people. */
function Avatar({ label, positive }: { label: string; positive: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
        positive ? "bg-pos/12 text-pos" : "bg-ink-3 text-fg-muted"
      }`}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

export default function V2() {
  const data = series();
  const balance = data[data.length - 1].v;
  const whole = money(balance).split(".")[0];
  const cents = money(balance).split(".")[1];

  return (
    <div className="min-h-screen bg-ink-0 text-fg">
      {/* A single wash of brand light behind the fold gives the ground depth
          without the page becoming a gradient. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(76,134,245,0.16) 0%, rgba(76,134,245,0) 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative flex">
        <aside className="hidden w-[248px] shrink-0 border-r border-line-soft lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-4">
            <div className="flex items-center gap-2.5 px-2 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-[15px] font-bold text-ink-0">
                T
              </span>
              <span className="text-[13px] font-semibold tracking-[0.14em] text-fg">NORTHSTONE</span>
            </div>

            <nav className="mt-4 flex flex-col gap-0.5">
              {NAV.map(([icon, label, active], i) => (
                <span
                  key={label}
                  className={`rise flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium ${
                    active ? "bg-ink-2 text-fg elev-1" : "text-fg-muted hover:bg-ink-1"
                  }`}
                  style={{ animationDelay: `${i * 18}ms` }}
                >
                  {glyph(icon)({
                    className: `h-[18px] w-[18px] ${active ? "text-brand-400" : "text-fg-faint"}`,
                  })}
                  {label}
                </span>
              ))}
            </nav>

            <div className="mt-auto flex items-center gap-3 rounded-xl bg-ink-1 p-3 elev-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-[12px] font-semibold text-brand-400">
                JM
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-fg">John Miller</p>
                <p className="truncate text-[11px] text-fg-faint">Personal</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-16 items-center gap-3 px-5 sm:px-8">
            <span className="lg:hidden">{NavIcons.menu({ className: "h-5 w-5 text-fg-muted" })}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-fg-faint">Sunday, 24 August</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-2 elev-1">
              {NavIcons.chat({ className: "h-[18px] w-[18px] text-fg-muted" })}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-[12px] font-semibold text-brand-400">
              JM
            </span>
          </header>

          <div className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
            <p className="rise text-[15px] text-fg-muted">Good evening, John</p>

            {/* Balance — the one thing on the page allowed to be loud */}
            <section className="rise mt-5" style={{ animationDelay: "60ms" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-faint">
                Total balance
              </p>
              <div className="mt-2 flex items-end gap-3">
                <h1 className="display text-[44px] font-semibold leading-none text-fg sm:text-[56px]">
                  {whole}
                  <span className="text-fg-faint">.{cents}</span>
                </h1>
                <span className="mb-1.5 inline-flex items-center gap-1 rounded-lg bg-pos/12 px-2 py-1 text-[12px] font-semibold text-pos">
                  ▲ 8.4%
                </span>
              </div>

              <div className="-mx-1 mt-3">
                <BalanceTrend data={data} label="Balance over the last 90 days" />
              </div>
            </section>

            {/* Actions */}
            <section
              className="rise no-scrollbar mt-6 flex gap-2 overflow-x-auto sm:gap-3"
              style={{ animationDelay: "110ms" }}
            >
              {ACTIONS.map(([icon, label]) => (
                <span key={label} className="flex w-[4.25rem] shrink-0 flex-col items-center gap-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-1 elev-1 transition hover:bg-ink-2">
                    {glyph(icon)({ className: "h-5 w-5 text-brand-400" })}
                  </span>
                  <span className="w-full truncate text-center text-[11px] font-medium text-fg-muted">
                    {label}
                  </span>
                </span>
              ))}
            </section>

            {/* Accounts */}
            <section className="rise mt-9" style={{ animationDelay: "160ms" }}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-fg">Accounts</h2>
                <span className="text-[13px] font-medium text-brand-400">View all</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ACCOUNTS.map((a) => (
                  <div
                    key={a.tail}
                    className={`relative overflow-hidden rounded-2xl border border-line bg-ink-1 p-5 elev-2`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${a.accent} to-transparent`}
                      aria-hidden="true"
                    />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-fg">{a.kind}</p>
                        <p className="mt-0.5 font-mono text-[12px] tracking-wider text-fg-faint">
                          •••• {a.tail}
                        </p>
                      </div>
                      {NavIcons.chevronRight({ className: "h-4 w-4 text-fg-faint" })}
                    </div>
                    <p className="display relative mt-6 text-[26px] font-semibold text-fg">
                      {money(a.cents)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Activity */}
            <section className="rise mt-9" style={{ animationDelay: "210ms" }}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-fg">Recent activity</h2>
                <span className="text-[13px] font-medium text-brand-400">View all</span>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink-1 elev-2">
                {TX.map(([label, when, cents], i) => {
                  const positive = (cents as number) >= 0;
                  return (
                    <div
                      key={label as string}
                      className={`flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-ink-2 sm:px-5 ${
                        i > 0 ? "border-t border-line-soft" : ""
                      }`}
                    >
                      <Avatar label={label as string} positive={positive} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-fg">{label as string}</p>
                        <p className="mt-0.5 text-[12px] text-fg-faint">{when as string}</p>
                      </div>
                      <p
                        className={`display shrink-0 text-[15px] font-semibold ${
                          positive ? "text-pos" : "text-fg"
                        }`}
                      >
                        {positive ? "+" : "−"}
                        {money(Math.abs(cents as number))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

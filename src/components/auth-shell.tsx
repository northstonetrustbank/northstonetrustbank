import Image from "next/image";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import type { Locale } from "@/i18n";

/**
 * The frame every signed-out page sits in — sign in, sign up, the two password
 * flows, the email code step.
 *
 * Each of those had hand-rolled the same split layout, and each carried the
 * same three faults left over from the move to a light theme: `scheme-dark` on
 * the root, which forced dark native form controls onto a white page; the
 * brand panel hidden below 1024px, so a phone — the client's actual screen —
 * got a bare form on flat grey; and the panel's copy in `text-fg-muted`, which
 * is now a dark slate and all but vanished on navy. One shell fixes all five.
 *
 * The panel is the flyer in miniature: the navy gradient, the headquarters
 * behind it, a gold rule under the heading, the seal's own tagline. On a phone
 * it becomes a compact navy header above the form rather than disappearing.
 */
export function AuthShell({
  locale,
  panelTitle,
  panelBody,
  children,
}: {
  locale: Locale;
  panelTitle: React.ReactNode;
  panelBody: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-1 bg-ink-0 text-fg">
      {/* Brand panel — full height beside the form on a laptop. */}
      <aside className="relative hidden w-[44%] max-w-[560px] overflow-hidden bg-navy-950 lg:block">
        <Image
          src="/images/lobby.jpg"
          alt=""
          fill
          priority
          className="object-cover object-left-bottom opacity-25"
        />
        <div className="absolute inset-0 bg-[linear-gradient(158deg,#013378_0%,#04162c_52%,#020d1c_100%)] opacity-90" />
        {/* A soft gold glow, top-right, the one warm note on the flyer. */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-2xl"
          style={{ background: "radial-gradient(circle, #e0b15c 0%, transparent 70%)" }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo onDark />
          <div>
            <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-white">
              {panelTitle}
            </h2>
            <span className="mt-5 block h-1 w-14 rounded-full bg-gold-400" aria-hidden="true" />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-navy-200">{panelBody}</p>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-navy-300">
            Your money · Handled with care
          </p>
        </div>
      </aside>

      {/* Form side. */}
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 pt-6 lg:justify-end">
          {/* On a phone the brand panel is gone, so the mark rides the top of
              the form instead of leaving it anonymous. */}
          <span className="lg:hidden">
            <Logo />
          </span>
          <LanguageSwitcher current={locale} variant="light" />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 pt-6 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </main>
  );
}

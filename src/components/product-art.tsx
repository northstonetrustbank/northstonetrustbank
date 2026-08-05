// Illustrated artwork for products that aren't payment cards. Each one is a
// full-bleed scene on the brand navy, distinguished by a single accent hue, so
// ten products read as one designed system rather than ten stock photographs.
//
// The viewBox matches the card aspect ratio (1.586:1) exactly, so a tile and a
// card face are interchangeable in the grid.

type ArtProps = { className?: string };

const NAVY_TOP = "#0F4383";
const NAVY_MID = "#08305F";
const NAVY_DEEP = "#04162C";
const INK = "#E6ECF5";

/** Accent hue per motif — the only thing that changes between scenes. */
const ACCENTS: Record<string, string> = {
  vault: "#2BB7A6",
  house: "#3FA96B",
  contract: "#7C6BE0",
  shield: "#4F8DF5",
  deposit: "#2BB7A6",
  globe: "#5B8DEF",
  cheque: "#3FA96B",
  handset: "#8AA0C4",
  market: "#2BB7A6",
  storefront: "#7C6BE0",
};

function Backdrop({ id, accent }: { id: string; accent: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={NAVY_TOP} />
          <stop offset="55%" stopColor={NAVY_MID} />
          <stop offset="100%" stopColor={NAVY_DEEP} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="252" fill={`url(#${id}-bg)`} />
      <circle cx="300" cy="60" r="130" fill={`url(#${id}-glow)`} />
      <circle cx="70" cy="230" r="110" fill={`url(#${id}-glow)`} opacity="0.5" />
      {/* horizon */}
      <path d="M0 196 H400" stroke={INK} strokeOpacity="0.12" />
    </>
  );
}

function Shell({
  id,
  accent,
  className,
  label,
  children,
}: {
  id: string;
  accent: string;
  className?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox="0 0 400 252" className={className} role="img" aria-label={label}>
      <Backdrop id={id} accent={accent} />
      {children}
    </svg>
  );
}

/** Soft shadow the motif sits on, so it reads as an object with weight. */
function Floor({ cx = "200", rx = "96" }: { cx?: string; rx?: string }) {
  return <ellipse cx={cx} cy="198" rx={rx} ry="9" fill="#000" opacity="0.22" />;
}

// ---------------------------------------------------------------- motifs

function Vault({ className }: ArtProps) {
  const a = ACCENTS.vault;
  return (
    <Shell id="vault" accent={a} className={className} label="Savings">
      <Floor cx="186" rx="86" />
      <rect x="112" y="66" width="148" height="132" rx="12" fill="#12294C" />
      <rect x="112" y="66" width="148" height="132" rx="12" fill="none" stroke={INK} strokeOpacity="0.25" />
      <rect x="126" y="80" width="120" height="104" rx="8" fill="#0B1E3B" />
      <circle cx="186" cy="132" r="38" fill="#16345F" stroke={a} strokeOpacity="0.55" />
      <circle cx="186" cy="132" r="24" fill="none" stroke={INK} strokeOpacity="0.35" />
      <circle cx="186" cy="132" r="7" fill={a} />
      {/* handle spokes */}
      <g stroke={INK} strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round">
        <path d="M186 100 V112" />
        <path d="M186 152 V164" />
        <path d="M154 132 H166" />
        <path d="M206 132 H218" />
      </g>
      <rect x="118" y="190" width="136" height="8" rx="4" fill="#062A52" />
      {/* coins */}
      <g>
        <ellipse cx="304" cy="188" rx="30" ry="9" fill={a} opacity="0.9" />
        <rect x="274" y="170" width="60" height="18" fill={a} opacity="0.9" />
        <ellipse cx="304" cy="170" rx="30" ry="9" fill={a} />
        <ellipse cx="304" cy="160" rx="26" ry="8" fill={a} opacity="0.75" />
        <ellipse cx="304" cy="150" rx="22" ry="7" fill={a} opacity="0.6" />
      </g>
    </Shell>
  );
}

function House({ className }: ArtProps) {
  const a = ACCENTS.house;
  return (
    <Shell id="house" accent={a} className={className} label="Mortgages">
      <Floor cx="196" rx="120" />
      {/* distant skyline */}
      <g fill={INK} opacity="0.07">
        <rect x="20" y="132" width="34" height="64" />
        <rect x="60" y="150" width="26" height="46" />
        <rect x="330" y="140" width="30" height="56" />
      </g>
      {/* roof */}
      <path d="M196 62 L306 140 H86 Z" fill={a} />
      <path d="M196 62 L306 140 H196 Z" fill="#000" opacity="0.12" />
      {/* body */}
      <rect x="112" y="140" width="168" height="56" fill="#12294C" />
      <rect x="112" y="140" width="168" height="56" fill="none" stroke={INK} strokeOpacity="0.18" />
      {/* door */}
      <rect x="182" y="156" width="30" height="40" rx="3" fill="#062A52" />
      <circle cx="205" cy="177" r="2.5" fill={a} />
      {/* lit windows */}
      <rect x="130" y="156" width="34" height="26" rx="3" fill={a} opacity="0.85" />
      <rect x="228" y="156" width="34" height="26" rx="3" fill={a} opacity="0.85" />
      <path d="M147 156 V182 M130 169 H164 M245 156 V182 M228 169 H262" stroke="#08305F" strokeOpacity="0.6" />
      {/* chimney */}
      <rect x="258" y="86" width="18" height="34" fill={a} opacity="0.7" />
      {/* tree */}
      <rect x="316" y="168" width="6" height="28" fill="#062A52" />
      <circle cx="319" cy="160" r="20" fill={a} opacity="0.35" />
    </Shell>
  );
}

function Contract({ className }: ArtProps) {
  const a = ACCENTS.contract;
  return (
    <Shell id="contract" accent={a} className={className} label="Personal loans">
      <Floor cx="190" rx="100" />
      <g transform="rotate(-6 190 124)">
        <rect x="118" y="52" width="144" height="146" rx="8" fill="#EFF5FC" opacity="0.94" />
        <rect x="118" y="52" width="144" height="146" rx="8" fill="none" stroke="#062A52" strokeOpacity="0.2" />
        <g stroke="#08305F" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round">
          <path d="M138 84 H242" />
          <path d="M138 102 H242" />
          <path d="M138 120 H214" />
        </g>
        <rect x="138" y="140" width="60" height="10" rx="5" fill={a} opacity="0.55" />
        {/* signature */}
        <path
          d="M140 176 c14 -16 22 6 34 -6 c10 -10 16 10 28 0 c8 -7 14 6 24 -4"
          fill="none"
          stroke={a}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>
      {/* pen */}
      <g transform="rotate(28 300 130)">
        <rect x="292" y="60" width="17" height="104" rx="4" fill={a} />
        <rect x="292" y="60" width="17" height="104" rx="4" fill="#000" opacity="0.12" />
        <path d="M292 164 H309 L300.5 186 Z" fill={INK} />
        <path d="M297 176 H304 L300.5 186 Z" fill="#062A52" />
      </g>
    </Shell>
  );
}

function Shield({ className }: ArtProps) {
  const a = ACCENTS.shield;
  return (
    <Shell id="shield" accent={a} className={className} label="Insurance">
      <Floor cx="200" rx="80" />
      {/* rays */}
      <g stroke={a} strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round">
        <path d="M104 78 L82 62" />
        <path d="M296 78 L318 62" />
        <path d="M96 132 H70" />
        <path d="M304 132 H330" />
      </g>
      <path
        d="M200 42 L282 76 V132 c0 46 -34 74 -82 90 c-48 -16 -82 -44 -82 -90 V76 Z"
        fill="#12294C"
        stroke={INK}
        strokeOpacity="0.28"
      />
      <path
        d="M200 42 L282 76 V132 c0 46 -34 74 -82 90 Z"
        fill="#000"
        opacity="0.14"
      />
      <path
        d="M200 62 L262 88 V132 c0 36 -26 58 -62 72 c-36 -14 -62 -36 -62 -72 V88 Z"
        fill={a}
        opacity="0.18"
      />
      <path
        d="M170 132 l22 24 l42 -50"
        fill="none"
        stroke={a}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Shell>
  );
}

function Deposit({ className }: ArtProps) {
  const a = ACCENTS.deposit;
  return (
    <Shell id="deposit" accent={a} className={className} label="Deposits">
      <Floor cx="200" rx="104" />
      {/* falling note */}
      <g transform="rotate(-12 200 74)">
        <rect x="152" y="44" width="96" height="58" rx="7" fill={a} opacity="0.92" />
        <circle cx="200" cy="73" r="15" fill="#0B1E3B" opacity="0.35" />
        <path d="M164 56 h14 M222 90 h14" stroke="#0B1E3B" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* arrow into the slot */}
      <path d="M200 112 V140 M186 128 l14 14 l14 -14" fill="none" stroke={INK} strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {/* counter */}
      <rect x="96" y="150" width="208" height="48" rx="10" fill="#12294C" stroke={INK} strokeOpacity="0.22" />
      <rect x="168" y="150" width="64" height="12" rx="6" fill="#04162C" />
      <rect x="96" y="186" width="208" height="12" rx="6" fill="#062A52" />
      <g fill={a} opacity="0.55">
        <rect x="116" y="170" width="30" height="6" rx="3" />
        <rect x="254" y="170" width="30" height="6" rx="3" />
      </g>
    </Shell>
  );
}

function Globe({ className }: ArtProps) {
  const a = ACCENTS.globe;
  return (
    <Shell id="globe" accent={a} className={className} label="Foreign drafts">
      <Floor cx="176" rx="76" />
      <circle cx="176" cy="122" r="74" fill="#12294C" stroke={INK} strokeOpacity="0.25" />
      <circle cx="176" cy="122" r="74" fill={a} opacity="0.12" />
      <g fill="none" stroke={INK} strokeOpacity="0.3">
        <path d="M102 122 H250" />
        <path d="M110 88 H242" />
        <path d="M110 156 H242" />
        <ellipse cx="176" cy="122" rx="30" ry="74" />
        <ellipse cx="176" cy="122" rx="58" ry="74" />
      </g>
      {/* landmasses */}
      <g fill={a} opacity="0.55">
        <path d="M132 96 c16 -8 30 2 38 10 c-10 12 -30 16 -44 8 z" />
        <path d="M186 138 c20 -10 40 -2 46 10 c-14 12 -40 12 -52 2 z" />
      </g>
      {/* transfer arc */}
      <path d="M126 76 Q246 24 322 96" fill="none" stroke={a} strokeWidth="3" strokeDasharray="7 8" strokeLinecap="round" />
      <circle cx="126" cy="76" r="7" fill={INK} />
      <circle cx="322" cy="96" r="9" fill={a} />
      <circle cx="322" cy="96" r="16" fill="none" stroke={a} strokeOpacity="0.45" />
    </Shell>
  );
}

function Cheque({ className }: ArtProps) {
  const a = ACCENTS.cheque;
  return (
    <Shell id="cheque" accent={a} className={className} label="Interest checking">
      <Floor cx="196" rx="106" />
      <rect x="80" y="74" width="232" height="112" rx="10" fill="#EFF5FC" opacity="0.94" />
      <rect x="80" y="74" width="232" height="112" rx="10" fill="none" stroke="#062A52" strokeOpacity="0.2" />
      <rect x="80" y="74" width="232" height="20" rx="10" fill={a} opacity="0.35" />
      <g stroke="#08305F" strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round">
        <path d="M100 116 H206" />
        <path d="M100 134 H180" />
        <path d="M100 160 H160" />
      </g>
      <rect x="226" y="106" width="66" height="34" rx="6" fill={a} opacity="0.22" />
      {/* percent badge */}
      <circle cx="298" cy="170" r="34" fill={a} />
      <circle cx="298" cy="170" r="34" fill="#000" opacity="0.08" />
      <g stroke="#062A52" strokeWidth="5" strokeLinecap="round">
        <path d="M284 184 L312 156" />
      </g>
      <circle cx="286" cy="158" r="7" fill="none" stroke="#062A52" strokeWidth="5" />
      <circle cx="310" cy="182" r="7" fill="none" stroke="#062A52" strokeWidth="5" />
    </Shell>
  );
}

function Handset({ className }: ArtProps) {
  const a = ACCENTS.handset;
  return (
    <Shell id="handset" accent={a} className={className} label="Telephone banking">
      <Floor cx="200" rx="74" />
      <rect x="152" y="44" width="96" height="154" rx="16" fill="#12294C" stroke={INK} strokeOpacity="0.25" />
      <rect x="162" y="60" width="76" height="112" rx="8" fill="#0B1E3B" />
      <circle cx="200" cy="184" r="8" fill={INK} opacity="0.4" />
      <rect x="186" y="52" width="28" height="5" rx="2.5" fill={INK} opacity="0.35" />
      {/* handset glyph on screen */}
      <path
        d="M180 96 h16 l8 18 l-11 8 a38 38 0 0 0 17 17 l8 -11 l18 8 v16 a8 8 0 0 1 -8 8 A56 56 0 0 1 172 104 a8 8 0 0 1 8 -8 z"
        fill={a}
        opacity="0.9"
      />
      {/* signal arcs */}
      <g fill="none" stroke={a} strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round">
        <path d="M276 96 a34 34 0 0 1 0 60" />
        <path d="M296 76 a58 58 0 0 1 0 100" />
        <path d="M124 96 a34 34 0 0 0 0 60" />
        <path d="M104 76 a58 58 0 0 0 0 100" />
      </g>
    </Shell>
  );
}

function Market({ className }: ArtProps) {
  const a = ACCENTS.market;
  return (
    <Shell id="market" accent={a} className={className} label="Money market">
      <Floor cx="200" rx="112" />
      <defs>
        <linearGradient id="market-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={a} stopOpacity="0.5" />
          <stop offset="100%" stopColor={a} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* grid */}
      <g stroke={INK} strokeOpacity="0.1">
        <path d="M72 82 H328 M72 122 H328 M72 162 H328" />
      </g>
      {/* area */}
      <path
        d="M72 168 L124 142 L172 154 L220 106 L272 122 L328 66 V196 H72 Z"
        fill="url(#market-fill)"
      />
      <path
        d="M72 168 L124 142 L172 154 L220 106 L272 122 L328 66"
        fill="none"
        stroke={a}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill={INK}>
        <circle cx="124" cy="142" r="5" />
        <circle cx="220" cy="106" r="5" />
      </g>
      <circle cx="328" cy="66" r="8" fill={a} />
      <circle cx="328" cy="66" r="15" fill="none" stroke={a} strokeOpacity="0.4" />
      {/* coins */}
      <g opacity="0.9">
        <ellipse cx="106" cy="190" rx="26" ry="8" fill={a} />
        <rect x="80" y="176" width="52" height="14" fill={a} />
        <ellipse cx="106" cy="176" rx="26" ry="8" fill={a} opacity="0.8" />
      </g>
    </Shell>
  );
}

function Storefront({ className }: ArtProps) {
  const a = ACCENTS.storefront;
  return (
    <Shell id="storefront" accent={a} className={className} label="Small business">
      <Floor cx="200" rx="118" />
      {/* building */}
      <rect x="92" y="94" width="216" height="102" fill="#12294C" stroke={INK} strokeOpacity="0.2" />
      {/* awning */}
      <path d="M84 94 H316 L302 62 H98 Z" fill={a} opacity="0.9" />
      <g fill="#062A52" opacity="0.25">
        <path d="M124 62 h28 l-8 32 h-28 z" />
        <path d="M180 62 h28 l-4 32 h-28 z" />
        <path d="M236 62 h28 l0 32 h-28 z" />
      </g>
      {/* window */}
      <rect x="110" y="112" width="86" height="60" rx="4" fill="#0B1E3B" />
      <rect x="110" y="112" width="86" height="60" rx="4" fill={a} opacity="0.18" />
      <path d="M110 142 H196 M153 112 V172" stroke={INK} strokeOpacity="0.2" />
      {/* door */}
      <rect x="216" y="112" width="62" height="84" rx="4" fill="#0B1E3B" />
      <rect x="216" y="112" width="62" height="84" rx="4" fill="none" stroke={INK} strokeOpacity="0.2" />
      <circle cx="266" cy="156" r="3.5" fill={a} />
      {/* sign */}
      <rect x="150" y="34" width="100" height="20" rx="6" fill="#0B1E3B" stroke={a} strokeOpacity="0.6" />
      <rect x="164" y="42" width="72" height="5" rx="2.5" fill={INK} opacity="0.5" />
      <rect x="88" y="188" width="224" height="8" rx="4" fill="#062A52" />
    </Shell>
  );
}

const MOTIFS: Record<string, (p: ArtProps) => React.ReactElement> = {
  vault: Vault,
  house: House,
  contract: Contract,
  shield: Shield,
  deposit: Deposit,
  globe: Globe,
  cheque: Cheque,
  handset: Handset,
  market: Market,
  storefront: Storefront,
};

export function ProductArt({ art, className }: { art: string; className?: string }) {
  const Motif = MOTIFS[art] ?? MOTIFS.vault;
  return <Motif className={className} />;
}

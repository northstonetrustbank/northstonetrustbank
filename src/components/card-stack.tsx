// Fanned three-tier card stack (Gold / Platinum / Black), pure SVG, brand navy.
export function CardStack({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 680 400" className={className} role="img" aria-label="Northstone card tiers">
      <g transform="translate(210,50)">
        <rect width="340" height="210" rx="16" fill="#C9A227" />
        <rect width="340" height="210" rx="16" fill="none" stroke="#A98718" />
        <text x="24" y="34" fontFamily="Inter,Arial,sans-serif" fontSize="15" fontWeight="500" letterSpacing="2" fill="#4A3A05">NORTHSTONE</text>
        <text x="316" y="34" textAnchor="end" fontFamily="Inter,Arial,sans-serif" fontSize="12" fontWeight="500" letterSpacing="3" fill="#4A3A05">GOLD</text>
      </g>
      <g transform="translate(165,105)">
        <rect width="340" height="210" rx="16" fill="#C7CBD2" />
        <rect width="340" height="210" rx="16" fill="none" stroke="#9BA1AC" />
        <text x="24" y="34" fontFamily="Inter,Arial,sans-serif" fontSize="15" fontWeight="500" letterSpacing="2" fill="#2A2E35">NORTHSTONE</text>
        <text x="316" y="34" textAnchor="end" fontFamily="Inter,Arial,sans-serif" fontSize="12" fontWeight="500" letterSpacing="3" fill="#2A2E35">PLATINUM</text>
      </g>
      <g transform="translate(120,160)">
        <rect width="340" height="210" rx="16" fill="#062A52" />
        <rect width="340" height="210" rx="16" fill="none" stroke="#243A5E" />
        <text x="24" y="36" fontFamily="Inter,Arial,sans-serif" fontSize="16" fontWeight="500" letterSpacing="2" fill="#EFF5FC">NORTHSTONE</text>
        <text x="24" y="54" fontFamily="Inter,Arial,sans-serif" fontSize="10" letterSpacing="4" fill="#7F97C2">TRUST BANK</text>
        <rect x="24" y="78" width="48" height="37" rx="7" fill="#E4C56B" />
        <path d="M24 96 H72 M48 78 V115" stroke="#B9973A" fill="none" />
        <path d="M90 82 a12 12 0 0 1 0 29" fill="none" stroke="#7F97C2" strokeWidth="2" strokeLinecap="round" />
        <path d="M97 76 a20 20 0 0 1 0 41" fill="none" stroke="#7F97C2" strokeWidth="2" strokeLinecap="round" />
        <text x="24" y="150" fontFamily="monospace" fontSize="19" letterSpacing="2" fill="#E6ECF5">••••  ••••  ••••  4921</text>
        <text x="24" y="184" fontFamily="Inter,Arial,sans-serif" fontSize="11" fontWeight="500" letterSpacing="2" fill="#B0C1DE">J. CARDHOLDER</text>
        <text x="316" y="184" textAnchor="end" fontFamily="Inter,Arial,sans-serif" fontSize="13" fontWeight="500" letterSpacing="3" fill="#C9A227">BLACK</text>
      </g>
    </svg>
  );
}

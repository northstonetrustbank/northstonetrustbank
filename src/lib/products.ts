// Product catalogue. Entries are aligned by index with the i18n landing items
// (personal.items / commercial.items), and "kind" controls the tile's behaviour.
//
// Only genuine card products render a card face. Everything else is a product
// tile with its own photograph, so a mortgage looks like a home and not a
// payment card.

export type CardTheme = "BLUE" | "GOLD" | "PLATINUM" | "BLACK";

/** A question asked on the application form. Rendered from this definition. */
export type FieldDef = {
  name: string;
  kind: "text" | "money" | "number" | "select" | "textarea";
  /** Option values for selects; labels come from i18n products.fieldOptions. */
  options?: string[];
  required?: boolean;
  /** Only shown when another field has one of these values. */
  showIf?: { field: string; equals: string[] };
};

/**
 * A supporting document an application asks for. `showIf` reads the answers
 * given on the form, so a self-employed applicant is asked for tax returns and
 * a motor policy asks for a vehicle registration.
 *
 * These are sensible defaults, not law — requirements vary by country and by
 * lender. Admins can ask for anything else on a case-by-case basis from the
 * applications queue.
 */
export type DocRequirement = {
  key: string;
  required?: boolean;
  showIf?: { field: string; equals: string[] };
};

/** Asked for on every credit application. */
const IDENTITY_DOCS: DocRequirement[] = [
  { key: "GOVERNMENT_ID", required: true },
  { key: "PROOF_OF_ADDRESS", required: true },
];

/** Income evidence, with the self-employed asked for returns instead. */
const INCOME_DOCS: DocRequirement[] = [
  {
    key: "PROOF_OF_INCOME",
    required: true,
    showIf: { field: "employmentStatus", equals: ["EMPLOYED", "RETIRED"] },
  },
  {
    key: "TAX_RETURNS",
    required: true,
    showIf: { field: "employmentStatus", equals: ["SELF_EMPLOYED"] },
  },
  {
    key: "EMPLOYMENT_LETTER",
    showIf: { field: "employmentStatus", equals: ["EMPLOYED"] },
  },
  { key: "BANK_STATEMENTS", required: true },
  { key: "CREDIT_REPORT" },
];

export type ProductDef = {
  key: string;
  kind: "apply" | "savings" | "deposit";
  amount?: boolean; // application asks for a requested amount
  card?: boolean; // card product: tier chooser, card face, issued details
  term?: boolean; // application asks for a repayment term in months
  // installment: principal disbursed to checking on approval, repaid over time.
  // revolving: a credit line the client draws from directly.
  credit?: "installment" | "revolving";
  /** Illustration key from components/product-art.tsx. Cards don't use one. */
  art?: string;
  /** Icon key from components/icons.tsx, used in compact listings. */
  icon: string;
  /** Extra questions beyond the shared ones. */
  fields?: FieldDef[];
  /** Supporting paperwork this product asks for. */
  docs?: DocRequirement[];
  /**
   * What the product is advertised at, and the bounds an application has to
   * fall inside. Published on the product tile and enforced on submit — until
   * these existed the only floor was "more than zero", which is how a 26-cent
   * mortgage reached the applications queue.
   */
  terms?: LendingTerms;
};

export type LendingTerms = {
  /** Headline rate, as a percentage. Displayed as "from X% APR". */
  aprFrom: number;
  minCents: number;
  maxCents: number;
  /** A typical ask, shown as an editable placeholder — never enforced. */
  typicalCents: number;
  minTermMonths: number;
  maxTermMonths: number;
};

// Asked on every application — the basics any bank wants up front.
export const SHARED_FIELDS: FieldDef[] = [
  {
    name: "employmentStatus",
    kind: "select",
    required: true,
    options: ["EMPLOYED", "SELF_EMPLOYED", "RETIRED", "STUDENT", "UNEMPLOYED"],
  },
  {
    name: "employer",
    kind: "text",
    showIf: { field: "employmentStatus", equals: ["EMPLOYED", "SELF_EMPLOYED"] },
  },
  { name: "annualIncome", kind: "money", required: true },
  {
    name: "housingStatus",
    kind: "select",
    required: true,
    options: ["OWN_OUTRIGHT", "OWN_MORTGAGE", "RENT", "LIVING_WITH_FAMILY"],
  },
];

/**
 * Rates and bounds, kept together so the loans page, the product page and the
 * application guard all quote the same numbers. Adjusting a rate is one edit.
 */
const TERMS = {
  PERSONAL_LOAN: { aprFrom: 5.99, minCents: 500_000, maxCents: 5_000_000, typicalCents: 1000000, minTermMonths: 24, maxTermMonths: 84 },
  MORTGAGE: { aprFrom: 3.25, minCents: 5_000_000, maxCents: 100_000_000, typicalCents: 25000000, minTermMonths: 180, maxTermMonths: 360 },
  AUTO_LOAN: { aprFrom: 2.99, minCents: 300_000, maxCents: 10_000_000, typicalCents: 2500000, minTermMonths: 36, maxTermMonths: 84 },
  STUDENT_LOAN: { aprFrom: 3.75, minCents: 100_000, maxCents: 20_000_000, typicalCents: 1500000, minTermMonths: 60, maxTermMonths: 240 },
  HOME_EQUITY: { aprFrom: 4.5, minCents: 1_000_000, maxCents: 50_000_000, typicalCents: 5000000, minTermMonths: 60, maxTermMonths: 360 },
  HOME_IMPROVEMENT: { aprFrom: 4.99, minCents: 500_000, maxCents: 15_000_000, typicalCents: 2000000, minTermMonths: 24, maxTermMonths: 120 },
  BUSINESS_LOAN: { aprFrom: 4.25, minCents: 1_000_000, maxCents: 500_000_000, typicalCents: 5000000, minTermMonths: 12, maxTermMonths: 300 },
} as const;

export const PERSONAL_PRODUCTS: ProductDef[] = [
  {
    key: "CREDIT_CARD",
    kind: "apply",
    card: true,
    credit: "revolving",
    icon: "card",
    docs: [...IDENTITY_DOCS, ...INCOME_DOCS],
  },
  { key: "SAVINGS", kind: "savings", art: "vault", icon: "savings" },
  {
    key: "PERSONAL_LOAN",
    kind: "apply",
    amount: true,
    term: true,
    credit: "installment",
    art: "contract",
    icon: "lending",
    terms: TERMS.PERSONAL_LOAN,
    fields: [
      {
        name: "loanPurpose",
        kind: "select",
        required: true,
        options: [
          "DEBT_CONSOLIDATION",
          "HOME_IMPROVEMENT",
          "MAJOR_PURCHASE",
          "MEDICAL",
          "VEHICLE",
          "WEDDING",
          "TRAVEL",
          "EDUCATION",
          "OTHER",
        ],
      },
      { name: "purpose", kind: "textarea" },
    ],
    docs: [
      ...IDENTITY_DOCS,
      ...INCOME_DOCS,
      // Larger borrowing is where a lender starts asking for security.
      { key: "GUARANTOR_DETAILS" },
      { key: "COLLATERAL_DOCUMENTS" },
    ],
  },
  {
    key: "MORTGAGE",
    kind: "apply",
    amount: true,
    term: true,
    credit: "installment",
    art: "house",
    icon: "mortgage",
    terms: TERMS.MORTGAGE,
    fields: [
      {
        name: "propertyType",
        kind: "select",
        required: true,
        options: ["HOUSE", "APARTMENT", "LAND", "COMMERCIAL"],
      },
      { name: "propertyPrice", kind: "money", required: true },
      { name: "downPayment", kind: "money", required: true },
      { name: "propertyLocation", kind: "text", required: true },
    ],
    docs: [
      ...IDENTITY_DOCS,
      ...INCOME_DOCS,
      // The property itself, and evidence the deposit is real.
      { key: "SALE_AGREEMENT", required: true },
      { key: "VALUATION_REPORT", required: true },
      { key: "TITLE_DEED", required: true },
      { key: "PROOF_OF_DEPOSIT", required: true },
      { key: "DEBT_DOCUMENTATION" },
      { key: "PROPERTY_INSURANCE" },
    ],
  },
  {
    key: "AUTO_LOAN",
    kind: "apply",
    amount: true,
    term: true,
    credit: "installment",
    art: "auto",
    icon: "lending",
    terms: TERMS.AUTO_LOAN,
    fields: [
      { name: "vehicleMake", kind: "text", required: true },
      { name: "vehicleYear", kind: "number", required: true },
      { name: "vehiclePrice", kind: "money", required: true },
      { name: "downPayment", kind: "money" },
      {
        name: "vehicleCondition",
        kind: "select",
        required: true,
        options: ["NEW", "USED"],
      },
    ],
    docs: [
      ...IDENTITY_DOCS,
      ...INCOME_DOCS,
      // The car is the security, so the bank wants to see it exists.
      { key: "VEHICLE_REGISTRATION", showIf: { field: "vehicleCondition", equals: ["USED"] } },
      { key: "VEHICLE_VALUATION", showIf: { field: "vehicleCondition", equals: ["USED"] } },
      { key: "DRIVING_LICENCE", required: true },
    ],
  },
  {
    key: "STUDENT_LOAN",
    kind: "apply",
    amount: true,
    term: true,
    credit: "installment",
    art: "student",
    icon: "lending",
    terms: TERMS.STUDENT_LOAN,
    fields: [
      { name: "institutionName", kind: "text", required: true },
      { name: "courseOfStudy", kind: "text", required: true },
      { name: "courseYears", kind: "number", required: true },
      {
        name: "studyLevel",
        kind: "select",
        required: true,
        options: ["UNDERGRADUATE", "POSTGRADUATE", "VOCATIONAL"],
      },
    ],
    docs: [
      ...IDENTITY_DOCS,
      // A student rarely has income of their own, so the guarantor carries it.
      { key: "GUARANTOR_DETAILS", required: true },
      { key: "BANK_STATEMENTS", required: true },
    ],
  },
  {
    key: "HOME_IMPROVEMENT",
    kind: "apply",
    amount: true,
    term: true,
    credit: "installment",
    art: "renovation",
    icon: "mortgage",
    terms: TERMS.HOME_IMPROVEMENT,
    fields: [
      { name: "worksDescription", kind: "textarea", required: true },
      { name: "propertyLocation", kind: "text", required: true },
      {
        name: "housingStatus",
        kind: "select",
        required: true,
        options: ["OWN_OUTRIGHT", "OWN_MORTGAGE"],
      },
    ],
    docs: [...IDENTITY_DOCS, ...INCOME_DOCS, { key: "TITLE_DEED", required: true }],
  },
  {
    key: "HOME_EQUITY",
    kind: "apply",
    amount: true,
    term: true,
    credit: "installment",
    art: "equity",
    icon: "mortgage",
    terms: TERMS.HOME_EQUITY,
    fields: [
      { name: "propertyLocation", kind: "text", required: true },
      { name: "propertyPrice", kind: "money", required: true },
      { name: "outstandingMortgage", kind: "money", required: true },
    ],
    docs: [
      ...IDENTITY_DOCS,
      ...INCOME_DOCS,
      { key: "TITLE_DEED", required: true },
      { key: "VALUATION_REPORT", required: true },
      { key: "DEBT_DOCUMENTATION", required: true },
    ],
  },
  {
    key: "PERSONAL_INSURANCE",
    kind: "apply",
    art: "shield",
    icon: "insurance",
    fields: [
      {
        name: "coverType",
        kind: "select",
        required: true,
        options: ["LIFE", "HOME", "AUTO", "TRAVEL", "HEALTH"],
      },
      { name: "coveredPeople", kind: "number" },
      {
        name: "beneficiaries",
        kind: "textarea",
        showIf: { field: "coverType", equals: ["LIFE"] },
      },
    ],
    // What insurers ask for depends entirely on what is being covered.
    docs: [
      ...IDENTITY_DOCS,
      {
        key: "MEDICAL_HISTORY",
        required: true,
        showIf: { field: "coverType", equals: ["LIFE", "HEALTH"] },
      },
      {
        key: "DOCTORS_REPORT",
        showIf: { field: "coverType", equals: ["LIFE", "HEALTH"] },
      },
      {
        key: "VEHICLE_REGISTRATION",
        required: true,
        showIf: { field: "coverType", equals: ["AUTO"] },
      },
      {
        key: "DRIVING_LICENCE",
        required: true,
        showIf: { field: "coverType", equals: ["AUTO"] },
      },
      {
        key: "VEHICLE_VALUATION",
        showIf: { field: "coverType", equals: ["AUTO"] },
      },
      {
        key: "TITLE_DEED",
        required: true,
        showIf: { field: "coverType", equals: ["HOME"] },
      },
    ],
  },
];

export const COMMERCIAL_PRODUCTS: ProductDef[] = [
  {
    key: "BUSINESS_CARD",
    kind: "apply",
    card: true,
    credit: "revolving",
    icon: "card",
    fields: [{ name: "businessName", kind: "text", required: true }],
    docs: [
      ...IDENTITY_DOCS,
      ...INCOME_DOCS,
      { key: "BUSINESS_REGISTRATION", required: true },
      { key: "BUSINESS_FINANCIALS" },
    ],
  },
  { key: "DEPOSITS", kind: "deposit", art: "deposit", icon: "deposit" },
  {
    key: "FOREIGN_DRAFTS",
    kind: "apply",
    amount: true,
    art: "globe",
    icon: "draft",
    fields: [
      { name: "destinationCountry", kind: "text", required: true },
      { name: "beneficiaryName", kind: "text", required: true },
    ],
    docs: [...IDENTITY_DOCS, { key: "BUSINESS_REGISTRATION", required: true }],
  },
  {
    key: "INTEREST_CHECKING",
    kind: "apply",
    art: "cheque",
    icon: "checking",
    fields: [{ name: "businessName", kind: "text", required: true }],
    docs: [...IDENTITY_DOCS, { key: "BUSINESS_REGISTRATION", required: true }],
  },
  {
    key: "TELE_BANKING",
    kind: "apply",
    art: "handset",
    icon: "phone",
    fields: [{ name: "businessName", kind: "text", required: true }],
    docs: [...IDENTITY_DOCS, { key: "BUSINESS_REGISTRATION", required: true }],
  },
  {
    key: "MONEY_MARKET",
    kind: "apply",
    amount: true,
    art: "market",
    icon: "money",
    fields: [{ name: "businessName", kind: "text", required: true }],
    docs: [
      ...IDENTITY_DOCS,
      { key: "BUSINESS_REGISTRATION", required: true },
      { key: "BANK_STATEMENTS", required: true },
      { key: "PROOF_OF_DEPOSIT" },
    ],
  },
  {
    key: "SMALL_BUSINESS",
    kind: "apply",
    amount: true,
    term: true,
    credit: "installment",
    art: "storefront",
    icon: "buildings",
    fields: [
      { name: "businessName", kind: "text", required: true },
      { name: "yearsTrading", kind: "number", required: true },
      { name: "annualRevenue", kind: "money", required: true },
      { name: "purpose", kind: "textarea" },
    ],
    docs: [
      ...IDENTITY_DOCS,
      { key: "BUSINESS_REGISTRATION", required: true },
      { key: "BUSINESS_FINANCIALS", required: true },
      { key: "BANK_STATEMENTS", required: true },
      { key: "TAX_RETURNS" },
      { key: "COLLATERAL_DOCUMENTS" },
      { key: "GUARANTOR_DETAILS" },
    ],
  },
];

/**
 * Card tiers, lowest first. Clients pick a tier rather than naming a limit —
 * each tier carries its own range and the final limit is set at approval.
 * Amounts are in cents; a null max means "and above".
 */
export const CARD_TIERS = ["CLASSIC", "GOLD", "PLATINUM", "BLACK"] as const;
export type CardTier = (typeof CARD_TIERS)[number];

export const TIER_LIMITS: Record<CardTier, { min: number; max: number | null }> = {
  CLASSIC: { min: 50_000, max: 250_000 },
  GOLD: { min: 250_000, max: 1_000_000 },
  PLATINUM: { min: 1_000_000, max: 2_500_000 },
  BLACK: { min: 2_500_000, max: null },
};

export const TIER_THEMES: Record<CardTier, CardTheme> = {
  CLASSIC: "BLUE",
  GOLD: "GOLD",
  PLATINUM: "PLATINUM",
  BLACK: "BLACK",
};

export function isCardTier(value: unknown): value is CardTier {
  return typeof value === "string" && (CARD_TIERS as readonly string[]).includes(value);
}

/** The card face colour for a tier, defaulting to the Northstone blue. */
export function themeForTier(tier?: string | null): CardTheme {
  const t = (tier ?? "").toUpperCase();
  return isCardTier(t) ? TIER_THEMES[t] : "BLUE";
}

/** Every question a product's application asks, shared ones first. */
export function fieldsFor(def: ProductDef): FieldDef[] {
  return [...SHARED_FIELDS, ...(def.fields ?? [])];
}

/**
 * The documents this application actually needs, resolved against the answers
 * the applicant gave. A salaried applicant is asked for payslips; a
 * self-employed one for tax returns; a motor policy for a vehicle
 * registration. Duplicates are collapsed, keeping the strictest requirement.
 */
export function docsFor(def: ProductDef, details: unknown): DocRequirement[] {
  const answers = (details && typeof details === "object" ? details : {}) as Record<
    string,
    unknown
  >;

  const resolved = new Map<string, DocRequirement>();
  for (const doc of def.docs ?? []) {
    if (doc.showIf) {
      const value = String(answers[doc.showIf.field] ?? "");
      // With no answer recorded, fall back to showing the requirement rather
      // than silently dropping it — a reviewer can always waive it.
      const answered = Object.prototype.hasOwnProperty.call(answers, doc.showIf.field);
      if (answered && !doc.showIf.equals.includes(value)) continue;
      if (!answered && !doc.required) continue;
    }
    const existing = resolved.get(doc.key);
    resolved.set(doc.key, {
      key: doc.key,
      required: existing?.required || doc.required,
    });
  }
  return [...resolved.values()];
}

export function productsFor(accountType: string): ProductDef[] {
  return accountType === "COMMERCIAL" ? COMMERCIAL_PRODUCTS : PERSONAL_PRODUCTS;
}

export function productDef(accountType: string, key: string): ProductDef | undefined {
  return productsFor(accountType).find((p) => p.key === key);
}

/** The localized {title, body} for a product key, from the landing dictionary. */
export function productLabel(
  landing: { personal: { items: { title: string; body: string }[] }; commercial: { items: { title: string; body: string }[] } },
  accountType: string,
  key: string
): { title: string; body: string } | null {
  const list = productsFor(accountType);
  const idx = list.findIndex((p) => p.key === key);
  if (idx < 0) return null;
  const items = accountType === "COMMERCIAL" ? landing.commercial.items : landing.personal.items;
  return items[idx] ?? null;
}

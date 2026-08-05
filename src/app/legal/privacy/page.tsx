import { LegalShell, LegalH2, LegalP, LegalList } from "@/components/legal";

export const metadata = { title: "Privacy Policy — Northstone Trust Bank" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="August 5, 2026">
      <LegalP>
        Northstone Trust Bank (&ldquo;Northstone&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;) respects your privacy. This policy explains what personal
        information we collect, why, how we protect it, and your rights. It should be read
        with our Terms of Service.
      </LegalP>

      <LegalH2>1. Information we collect</LegalH2>
      <LegalList
        items={[
          "Identity & contact data: name, date of birth, address, email, phone.",
          "Identity documents: government-issued ID, driver's licence, or passport you upload for verification.",
          "Financial data: account balance, transactions, deposits, and any loan or credit information.",
          "Proof documents: transfer confirmations or receipts you provide.",
          "Technical data: login records, IP address, and device information needed to secure your account.",
        ]}
      />

      <LegalH2>2. Why we use it</LegalH2>
      <LegalList
        items={[
          "To open and operate your account and verify your identity.",
          "To process and verify deposits and transactions.",
          "To review loan and credit applications.",
          "To send statements, receipts, security alerts, and service notices.",
          "To detect, investigate, and prevent fraud and suspicious activity.",
          "To comply with legal, regulatory, and record-keeping obligations.",
          "With your consent, to send product news and offers (you can opt out).",
        ]}
      />

      <LegalH2>3. How we share information</LegalH2>
      <LegalP>
        We do not sell your personal information. We share it only with service providers
        who help us operate (such as our secure cloud database/storage provider and email
        delivery) under confidentiality obligations; with regulators, law enforcement, or
        courts where required by law; and with professional advisers as needed.
      </LegalP>

      <LegalH2>4. How we protect it</LegalH2>
      <LegalList
        items={[
          "Encryption in transit, with access controls and authentication.",
          "Passwords are stored only as secure one-way hashes — never in plain text.",
          "A permanent audit log records staff actions on accounts.",
          "Identity and deposit files are held in private storage, served only through authorized, permission-checked requests.",
        ]}
      />

      <LegalH2>5. How long we keep it</LegalH2>
      <LegalP>
        We retain personal data for as long as your account is open and thereafter as
        required by financial record-keeping and anti-money-laundering law.
      </LegalP>

      <LegalH2>6. Your rights</LegalH2>
      <LegalP>
        Depending on your jurisdiction, you may have the right to access, correct, delete,
        restrict, or port your data, and to object to certain processing or withdraw
        consent. To exercise these, contact support@northstonetrustbank.com.
      </LegalP>

      <LegalH2>7. Cookies</LegalH2>
      <LegalP>
        The website uses only the cookies necessary to keep you securely signed in and to
        remember your language preference.
      </LegalP>

      <LegalH2>8. Contact</LegalH2>
      <LegalP>
        Questions or requests: support@northstonetrustbank.com, or write to Northstone
        Trust Bank, New York, United States.
      </LegalP>
    </LegalShell>
  );
}

import { LegalShell, LegalH2, LegalP, LegalList } from "@/components/legal";

export const metadata = { title: "Terms of Service — Northstone Trust Bank" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="August 5, 2026">
      <LegalP>
        These Terms of Service govern your access to and use of the website, online
        banking portal, and services (the &ldquo;Services&rdquo;) provided by Northstone
        Trust Bank (&ldquo;Northstone&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By
        opening an account or using the Services, you agree to these Terms.
      </LegalP>

      <LegalH2>1. Eligibility</LegalH2>
      <LegalP>
        You must be at least 18 years old, have legal capacity to enter a contract, and
        provide accurate identity information. We may decline any application at our
        discretion, subject to applicable law.
      </LegalP>

      <LegalH2>2. Applications and identity verification</LegalH2>
      <LegalP>
        To comply with applicable &ldquo;know your customer&rdquo; and anti-money-laundering
        laws, you agree to provide a valid government-issued identity document and any
        additional information we reasonably request. We review every application
        manually and may approve, decline, or request more information. Approval is not
        guaranteed and creates no obligation until your account status is shown as active.
      </LegalP>

      <LegalH2>3. Deposits</LegalH2>
      <LegalList
        items={[
          "Deposits you submit are recorded as pending until our team verifies them.",
          "Funds become available in your balance only after verification.",
          "We may request proof of a deposit before crediting it, and may decline a deposit we cannot verify.",
          "You are responsible for the accuracy of the information you submit.",
        ]}
      />

      <LegalH2>4. Loans and credit</LegalH2>
      <LegalP>
        Applications for loans or credit lines are subject to review, approval, and
        separate written agreements that disclose the rate, fees, and repayment terms.
        Nothing on the website is an offer or commitment to lend.
      </LegalP>

      <LegalH2>5. Your responsibilities</LegalH2>
      <LegalP>
        Keep your login credentials confidential; notify us immediately of any
        unauthorized access at support@northstonetrustbank.com; provide truthful
        information; and do not use the Services for unlawful purposes, fraud, or money
        laundering.
      </LegalP>

      <LegalH2>6. Account restrictions and closure</LegalH2>
      <LegalP>
        We may suspend, restrict, or close an account to comply with law, investigate
        suspected fraud or suspicious activity, or address a breach of these Terms. Where
        lawful and practical, we will notify you and explain how to resolve the issue.
      </LegalP>

      <LegalH2>7. Electronic communications</LegalH2>
      <LegalP>
        By using the Services you consent to receive statements, receipts, and notices
        electronically, as described in our Electronic Communications Consent.
      </LegalP>

      <LegalH2>8. Availability and changes</LegalH2>
      <LegalP>
        We aim to keep the Services available but do not guarantee uninterrupted access.
        We may modify features and may update these Terms; material changes will be
        communicated and take effect as required by law.
      </LegalP>

      <LegalH2>9. Deposit protection</LegalH2>
      <LegalP>
        Information about how your deposits are held and protected is available from
        Northstone on request. This section will be updated with full disclosures.
      </LegalP>

      <LegalH2>10. Governing law</LegalH2>
      <LegalP>
        These Terms are governed by the laws of the State of New York, United States,
        without regard to conflict-of-law principles. The dispute-resolution mechanism
        will be specified in the finalized Terms.
      </LegalP>

      <LegalH2>11. Contact</LegalH2>
      <LegalP>
        Northstone Trust Bank — info@northstonetrustbank.com ·
        support@northstonetrustbank.com · New York, United States.
      </LegalP>
    </LegalShell>
  );
}

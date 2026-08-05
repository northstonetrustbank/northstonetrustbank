import { LegalShell, LegalH2, LegalP, LegalList } from "@/components/legal";

export const metadata = {
  title: "Electronic Communications Consent — Northstone Trust Bank",
};

export default function EConsentPage() {
  return (
    <LegalShell title="Electronic Communications Consent" updated="August 5, 2026">
      <LegalP>
        Because Northstone is an online service, we deliver most documents electronically.
        This consent explains what you agree to receive electronically.
      </LegalP>

      <LegalH2>1. Your consent</LegalH2>
      <LegalP>
        By opening an account, you consent to receive the following electronically (by
        email and/or in your online portal) instead of on paper:
      </LegalP>
      <LegalList
        items={[
          "Account statements, including weekly statements.",
          "Deposit and transaction receipts.",
          "Account approval, restriction, and status notices.",
          "Loan and credit application decisions and disclosures.",
          "Legal notices, updates to terms, and privacy notices.",
        ]}
      />

      <LegalH2>2. What you need</LegalH2>
      <LegalP>
        A device with internet access, a current web browser, a valid email address, and
        the ability to view and save PDF or HTML documents.
      </LegalP>

      <LegalH2>3. Keeping your email current</LegalH2>
      <LegalP>
        You must keep your email address up to date. Tell us immediately at
        support@northstonetrustbank.com if you stop receiving expected messages.
      </LegalP>

      <LegalH2>4. Withdrawing consent</LegalH2>
      <LegalP>
        You may withdraw consent to electronic delivery by contacting
        support@northstonetrustbank.com. We will explain any effect on your account.
      </LegalP>

      <LegalH2>5. Automated senders</LegalH2>
      <LegalP>
        Automated messages are sent from info@northstonetrustbank.com. For help,
        always use support@northstonetrustbank.com.
      </LegalP>
    </LegalShell>
  );
}

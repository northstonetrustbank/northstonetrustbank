import { LegalShell, LegalH2, LegalP, LegalList } from "@/components/legal";

export const metadata = {
  title: "Deposit Account Agreement — Northstone Trust Bank",
};

export default function DepositAgreementPage() {
  return (
    <LegalShell title="Deposit Account Agreement" updated="August 5, 2026">
      <LegalP>
        This summarizes the key terms of a Northstone deposit account. It should be read
        together with our Terms of Service and Privacy Policy. Full disclosures will be
        added as this document is finalized.
      </LegalP>

      <LegalH2>1. Opening your account</LegalH2>
      <LegalP>
        Accounts open only after identity verification and manual approval. Each account
        receives a unique account number.
      </LegalP>

      <LegalH2>2. How your balance works</LegalH2>
      <LegalList
        items={[
          "Your balance is the sum of all verified (posted) transactions.",
          "Deposits are pending until our team verifies them, then posted.",
          "We keep a permanent, append-only record of every transaction. Nothing is deleted; corrections are made by posting a new adjusting entry.",
        ]}
      />

      <LegalH2>3. Deposits and availability</LegalH2>
      <LegalList
        items={[
          "You submit deposits with the amount and, if requested, proof of payment.",
          "Funds are available after verification, typically within one to three business days.",
          "We may decline or reverse a deposit that cannot be verified or that appears fraudulent.",
        ]}
      />

      <LegalH2>4. Withdrawals and adjustments</LegalH2>
      <LegalP>
        Withdrawals, interest, bonuses, fees, and corrections are applied by Northstone and
        appear in your transaction history with a reason. A debit will not reduce your
        balance below zero.
      </LegalP>

      <LegalH2>5. Statements</LegalH2>
      <LegalP>
        You will receive periodic (including weekly) statements electronically. Review
        them promptly and report any error or unauthorized transaction to
        support@northstonetrustbank.com within 14 days.
      </LegalP>

      <LegalH2>6. Suspicious activity</LegalH2>
      <LegalP>
        To protect clients, we monitor for unusual activity and may place a temporary hold
        or restriction while we review. We will contact you to resolve it.
      </LegalP>

      <LegalH2>7. Deposit protection</LegalH2>
      <LegalP>
        Information about how client deposits are held and protected is available from
        Northstone on request and will be detailed here when finalized.
      </LegalP>

      <LegalH2>8. Closing an account</LegalH2>
      <LegalP>
        You or Northstone may close the account subject to these terms and applicable law;
        any remaining verified balance is returned to you through an approved method.
      </LegalP>
    </LegalShell>
  );
}

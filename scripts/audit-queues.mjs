// Checks that what a client does actually reaches the admin queues.
//
//   node --env-file=.env scripts/audit-queues.mjs
//
// Runs the same filters the admin console uses, over HTTPS, so it works even
// when Postgres is unreachable from this machine.
const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function q(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function count(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
  });
  return Number((res.headers.get("content-range") ?? "0-0/0").split("/")[1]);
}

const line = (label, value, note = "") =>
  console.log(`  ${label.padEnd(34)} ${String(value).padStart(4)}  ${note}`);

console.log("\nADMIN QUEUE BADGES (same filters as src/app/admin/layout.tsx)");
line("Review queue (pending clients)", await count(`User?role=eq.CLIENT&status=eq.PENDING&select=id`));
line("Applications (submitted)", await count(`ProductApplication?status=eq.SUBMITTED&select=id`));
line("Deposits (pending)", await count(`Transaction?status=eq.PENDING&type=eq.DEPOSIT&select=id`));
line("Withdrawals (pending)", await count(`Transaction?status=eq.PENDING&type=eq.WITHDRAWAL&select=id`));
line("Live chat (unread)", await count(`ChatConversation?unreadForAdmin=is.true&select=id`));
line("Support tickets (unread)", await count(`SupportTicket?unreadForAdmin=is.true&select=id`));

console.log("\nTHE PREVIEW CLIENT'S TRAIL");
const [user] = await q(`User?email=eq.preview-check@northstone.local&select=id,email,status`);
if (!user) {
  console.log("  preview client not found");
} else {
  const accounts = await q(`Account?userId=eq.${user.id}&select=id,number,kind`);
  const ids = accounts.map((a) => `"${a.id}"`).join(",");
  line("Accounts", accounts.length, accounts.map((a) => `${a.kind} ${a.number}`).join(", "));
  line("Pending deposits", await count(`Transaction?accountId=in.(${ids})&status=eq.PENDING&type=eq.DEPOSIT&select=id`));
  line("Pending withdrawals", await count(`Transaction?accountId=in.(${ids})&status=eq.PENDING&type=eq.WITHDRAWAL&select=id`));
  line("Support tickets", await count(`SupportTicket?userId=eq.${user.id}&select=id`));
  line("Ticket messages", await count(`TicketMessage?select=id`));
  line("Sessions (live)", await count(`Session?userId=eq.${user.id}&revokedAt=is.null&select=id`));
  line("Identity documents", await count(`KycDocument?userId=eq.${user.id}&select=id`));
  line("Applications", await count(`ProductApplication?userId=eq.${user.id}&select=id`));
  try {
    line("Saved payees", await count(`Payee?userId=eq.${user.id}&archivedAt=is.null&select=id`));
    // A bill payment must land in the same queue a withdrawal does, or nobody
    // settles it. This is the check that the two halves are actually joined.
    const bills = await q(
      `Transaction?accountId=in.(${ids})&payeeId=not.is.null` +
        `&select=reference,amountCents,status,type,counterparty,payee:Payee(name)&order=createdAt.desc&limit=5`
    );
    line("Bill payments", bills.length);
    for (const b of bills) {
      console.log(
        `      ${b.reference}  ${String(b.type).padEnd(11)} ${String(b.status).padEnd(7)}` +
          ` $${(Math.abs(b.amountCents) / 100).toFixed(2).padStart(9)}  ${b.payee?.name ?? "?"}`
      );
      if (b.status === "PENDING" && b.type === "WITHDRAWAL") {
        console.log(`        in the withdrawals queue as: ${b.counterparty}`);
      }
    }
  } catch {
    console.log("      (payees not migrated yet)");
  }
}

console.log("\nSCHEMA READINESS");
for (const [label, path] of [
  ["DepositMethod.etaLabel", "DepositMethod?select=key,etaLabel&limit=1"],
  ["Session", "Session?select=id&limit=1"],
  ["SupportTicket", "SupportTicket?select=id&limit=1"],
  ["TicketMessage", "TicketMessage?select=id&limit=1"],
  ["ProductApplication.contactless", "ProductApplication?select=id,contactless,dailyLimitCents&limit=1"],
  ["Payee", "Payee?select=id&limit=1"],
  ["Transaction.payeeId", "Transaction?select=id,payeeId&limit=1"],
]) {
  try {
    await q(path);
    line(label, "OK");
  } catch (e) {
    line(label, "MISSING", String(e.message).slice(0, 90));
  }
}

console.log("\nDEPOSIT METHODS AS CLIENTS SEE THEM");
const methods = await q(`DepositMethod?select=key,label,enabled,accountTypes,forDeposit,forWithdrawal,etaLabel&order=sortOrder`);
for (const m of methods) {
  const who = m.accountTypes === "ALL" ? "everyone" : `${m.accountTypes.toLowerCase()} only`;
  console.log(
    `  ${String(m.label).padEnd(16)} ${m.enabled ? "on " : "off"}  ${who.padEnd(16)}` +
      `dep:${m.forDeposit ? "y" : "n"} wd:${m.forWithdrawal ? "y" : "n"}  eta:${m.etaLabel ?? "(default)"}`
  );
}
console.log();

// ── What each admin screen actually reads ────────────────────────────────
// Mirrors the queries in src/app/admin/*, so a missing column or a broken
// relation shows up here rather than as a 500 in front of your team.
console.log("ADMIN SCREEN DATA CONTRACTS");
const SCREENS = [
  ["/admin (review queue)", "User?role=eq.CLIENT&status=eq.PENDING&select=id,email,firstName,lastName,accountType,emailVerified,kycDocsDeletedAt&limit=3"],
  ["/admin/applications", "ProductApplication?status=eq.SUBMITTED&select=id,productKey,status,amountCents,termMonths,details,requestedTier,cardNumber,contactless,onlinePayments,dailyLimitCents,monthlyLimitCents,user:User(email)&limit=3"],
  ["/admin/deposits", "Transaction?status=eq.PENDING&type=eq.DEPOSIT&select=id,reference,amountCents,methodKey,note,proofStoredName,proofFileName,account:Account(number,userId)&limit=3"],
  ["/admin/withdrawals", "Transaction?status=eq.PENDING&type=eq.WITHDRAWAL&select=id,reference,amountCents,methodKey,counterparty,account:Account(number,userId)&limit=3"],
  ["/admin/tickets", "SupportTicket?select=id,reference,category,subject,status,unreadForAdmin,lastMessageAt,user:User(firstName,lastName,email,accountType),messages:TicketMessage(id,sender,authorLabel,body)&limit=3"],
  ["/admin/methods", "DepositMethod?select=id,key,label,enabled,accountTypes,forDeposit,forWithdrawal,routeName,routeIdentifier,etaLabel&limit=3"],
  ["/admin/clients", "User?role=eq.CLIENT&select=id,email,status,currency,accounts:Account(id,number,kind,currency),kycDocuments:KycDocument(id)&limit=3"],
  ["/admin/audit", "AuditLog?select=id,actorLabel,action,targetType,targetId,details,createdAt&order=createdAt.desc&limit=3"],
];

for (const [label, path] of SCREENS) {
  try {
    const rows = await q(path);
    line(label, "OK", `${rows.length} row(s)`);
  } catch (e) {
    line(label, "FAIL", String(e.message).slice(0, 110));
  }
}

console.log("\nRECENT AUDIT TRAIL (what the team can see happened)");
const trail = await q(`AuditLog?select=actorLabel,action,details,createdAt&order=createdAt.desc&limit=8`);
for (const a of trail) {
  console.log(`  ${a.createdAt.slice(0, 16).replace("T", " ")}  ${String(a.action).padEnd(22)} ${String(a.details ?? "").slice(0, 62)}`);
}
console.log();

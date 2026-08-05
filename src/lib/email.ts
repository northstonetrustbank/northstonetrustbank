import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { db } from "./db";
import { isLocale, type Locale } from "@/i18n";

// Company mailboxes that may act as the "From" sender. They share one password,
// so we authenticate as whichever mailbox is sending — Spacemail rejects sending
// "as" an address other than the authenticated one.
//
// noreply@ carries every automated message. The other three are the real staffed
// mailboxes and only ever send when an admin picks one in the compose screen.
const SENDER_MAILBOXES = [
  "noreply@northstonetrustbank.com",
  "info@northstonetrustbank.com",
  "support@northstonetrustbank.com",
  "accountmanager@northstonetrustbank.com",
];

function extractEmail(from: string) {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

// One cached transport per authenticated mailbox.
const smtpTransports = new Map<string, Transporter>();
function getSmtpTransport(fromAddress?: string): Transporter | null {
  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASSWORD;
  const defaultUser = process.env.SMTP_USER;
  if (!host || !pass || !defaultUser) return null;

  const wanted = fromAddress ? extractEmail(fromAddress) : "";
  const user = SENDER_MAILBOXES.includes(wanted) ? wanted : defaultUser;

  if (!smtpTransports.has(user)) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    smtpTransports.set(
      user,
      nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
        auth: { user, pass },
        // No pooling: each serverless invocation is isolated, and a lingering
        // pool can hang the function. Fail fast instead of hanging.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
      })
    );
  }
  return smtpTransports.get(user) ?? null;
}

const BRAND = "Northstone Trust Bank";
const NAVY = "#062A52";
const ACCENT = "#046BD4";

function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function toLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : "en";
}

// ---------- localized strings ----------

type EmailStrings = {
  footerQuestions: string; // "Questions? Contact ..."
  footerAutomated: string;
  welcome: { subject: string; title: string; p1: string; p2: string; button: string; p3: string; ignore: string };
  kycReceived: { subject: string; title: string; p1: string; p2: string };
  approved: { subject: string; title: string; p1: string; button: string };
  rejected: { subject: string; title: string; p1: string; reasonLabel: string; p2: string };
  blocked: { subject: string; title: string; p1: string; p2: string };
  unblocked: { subject: string; title: string; p1: string; button: string };
  depositReceived: { subject: string; title: string; p1: string; p2: string };
  depositPosted: { subject: string; title: string; p1: string; p2: string; button: string };
  depositRejected: { subject: string; title: string; p1: string; reasonLabel: string; p2: string };
  proofRequest: { subject: string; title: string; p1: string; p2: string };
  accountCredited: { subject: string; title: string; p1: string; p2: string; button: string };
  accountDebited: { subject: string; title: string; p1: string; p2: string; button: string };
  passwordReset: { subject: string; title: string; p1: string; button: string; p2: string; ignore: string };
  loginCode: { subject: string; title: string; p1: string; p2: string; ignore: string };
};

const STRINGS: Record<Locale, EmailStrings> = {
  en: {
    footerQuestions: "Questions? Contact",
    footerAutomated: "This is an automated message from an unmonitored address.",
    welcome: {
      subject: `Welcome to ${BRAND} — verify your email`,
      title: "Welcome, {name}",
      p1: `Thank you for opening an account with ${BRAND}.`,
      p2: "First, please verify your email address:",
      button: "Verify my email",
      p3: "After verifying, you'll be asked to upload an identity document (ID card, driver's licence, or passport) to complete your application.",
      ignore: "If you did not create this account, you can safely ignore this email.",
    },
    kycReceived: {
      subject: `We received your documents — ${BRAND}`,
      title: "Application received, {name}",
      p1: "Your identity document has been received. Our team is reviewing your application — typically within one business day.",
      p2: "You will receive an email as soon as your account is approved.",
    },
    approved: {
      subject: `Your ${BRAND} account is approved`,
      title: "You're all set, {name}",
      p1: "Your account has been reviewed and approved. You now have full access to your client dashboard.",
      button: "Sign in to your account",
    },
    rejected: {
      subject: `Update on your ${BRAND} application`,
      title: "About your application, {name}",
      p1: "After reviewing your application, we are unable to open your account at this time.",
      reasonLabel: "Reason",
      p2: "If you believe this is a mistake or can provide additional documentation, please contact",
    },
    blocked: {
      subject: `Important: your ${BRAND} account has been restricted`,
      title: "Account restricted",
      p1: "Hello {name}, access to your account has been temporarily restricted while we review recent activity. Your funds and records remain safe.",
      p2: "Please contact us to resolve this:",
    },
    unblocked: {
      subject: `Your ${BRAND} account access is restored`,
      title: "Access restored",
      p1: "Hello {name}, the restriction on your account has been lifted. You can sign in as usual.",
      button: "Sign in",
    },
    depositReceived: {
      subject: `Deposit received — pending verification`,
      title: "Deposit received, {name}",
      p1: "We received your deposit of <strong>{amount}</strong> (reference {ref}).",
      p2: "Our team is verifying it now. Your balance will be credited and you'll receive a receipt as soon as it's confirmed — usually within one business day.",
    },
    depositPosted: {
      subject: `Deposit receipt — {amount} credited`,
      title: "Deposit credited, {name}",
      p1: "Your deposit of <strong>{amount}</strong> (reference {ref}) has been verified and credited.",
      p2: "Your new available balance is <strong>{balance}</strong>.",
      button: "View my account",
    },
    depositRejected: {
      subject: `About your deposit — action needed`,
      title: "About your deposit, {name}",
      p1: "We could not verify your deposit of <strong>{amount}</strong> (reference {ref}), so it has not been credited.",
      reasonLabel: "Reason",
      p2: "If you believe this is a mistake, reply with your proof of payment or contact",
    },
    proofRequest: {
      subject: `Proof needed for your deposit of {amount}`,
      title: "One more thing, {name}",
      p1: "To credit your deposit of <strong>{amount}</strong> (reference {ref}), we need proof of the payment — a transfer confirmation or receipt.",
      p2: "Simply reply to this email with a photo or PDF attached, and we'll take it from there.",
    },
    accountCredited: {
      subject: `Your account was credited {amount}`,
      title: "Credit applied, {name}",
      p1: "Your account has been credited with <strong>{amount}</strong> (reference {ref}). Reason: {reason}.",
      p2: "Your new available balance is <strong>{balance}</strong>.",
      button: "View my account",
    },
    accountDebited: {
      subject: `Your account was debited {amount}`,
      title: "Debit applied, {name}",
      p1: "A debit of <strong>{amount}</strong> (reference {ref}) has been applied to your account. Reason: {reason}.",
      p2: "Your new available balance is <strong>{balance}</strong>.",
      button: "View my account",
    },
    passwordReset: {
      subject: `Reset your ${BRAND} password`,
      title: "Password reset, {name}",
      p1: "We received a request to reset your password. Click below to choose a new one — this link expires in 1 hour.",
      button: "Reset my password",
      p2: "For your security, the link can be used only once.",
      ignore: "If you didn't request this, you can safely ignore this email; your password stays the same.",
    },
    loginCode: {
      subject: `Your ${BRAND} sign-in code`,
      title: "Your sign-in code, {name}",
      p1: "Use this code to finish signing in. It expires in {minutes} minutes and works once.",
      p2: "We will never ask you for this code by email, phone or chat.",
      ignore:
        "If you weren't trying to sign in, someone may have your password. Change it as soon as you can and tell us.",
    },
  },
  fr: {
    footerQuestions: "Des questions ? Contactez",
    footerAutomated: "Ceci est un message automatique envoyé depuis une adresse non surveillée.",
    welcome: {
      subject: `Bienvenue chez ${BRAND} — vérifiez votre e-mail`,
      title: "Bienvenue, {name}",
      p1: `Merci d'avoir ouvert un compte chez ${BRAND}.`,
      p2: "Commencez par vérifier votre adresse e-mail :",
      button: "Vérifier mon e-mail",
      p3: "Après la vérification, il vous sera demandé de téléverser un document d'identité (carte d'identité, permis de conduire ou passeport) pour finaliser votre demande.",
      ignore: "Si vous n'avez pas créé ce compte, vous pouvez ignorer cet e-mail.",
    },
    kycReceived: {
      subject: `Documents bien reçus — ${BRAND}`,
      title: "Demande reçue, {name}",
      p1: "Votre document d'identité a bien été reçu. Notre équipe examine votre demande — généralement sous un jour ouvré.",
      p2: "Vous recevrez un e-mail dès que votre compte sera approuvé.",
    },
    approved: {
      subject: `Votre compte ${BRAND} est approuvé`,
      title: "Tout est prêt, {name}",
      p1: "Votre compte a été examiné et approuvé. Vous avez désormais accès à votre espace client.",
      button: "Accéder à mon compte",
    },
    rejected: {
      subject: `Mise à jour de votre demande ${BRAND}`,
      title: "À propos de votre demande, {name}",
      p1: "Après examen de votre demande, nous ne pouvons pas ouvrir votre compte pour le moment.",
      reasonLabel: "Motif",
      p2: "Si vous pensez qu'il s'agit d'une erreur ou pouvez fournir des documents complémentaires, contactez",
    },
    blocked: {
      subject: `Important : votre compte ${BRAND} a été restreint`,
      title: "Compte restreint",
      p1: "Bonjour {name}, l'accès à votre compte a été temporairement restreint pendant que nous examinons une activité récente. Vos fonds et vos données restent en sécurité.",
      p2: "Veuillez nous contacter pour résoudre la situation :",
    },
    unblocked: {
      subject: `L'accès à votre compte ${BRAND} est rétabli`,
      title: "Accès rétabli",
      p1: "Bonjour {name}, la restriction sur votre compte a été levée. Vous pouvez vous connecter normalement.",
      button: "Se connecter",
    },
    depositReceived: {
      subject: `Dépôt reçu — en attente de vérification`,
      title: "Dépôt reçu, {name}",
      p1: "Nous avons bien reçu votre dépôt de <strong>{amount}</strong> (référence {ref}).",
      p2: "Notre équipe le vérifie actuellement. Votre solde sera crédité et vous recevrez un reçu dès confirmation — généralement sous un jour ouvré.",
    },
    depositPosted: {
      subject: `Reçu de dépôt — {amount} crédité`,
      title: "Dépôt crédité, {name}",
      p1: "Votre dépôt de <strong>{amount}</strong> (référence {ref}) a été vérifié et crédité.",
      p2: "Votre nouveau solde disponible est de <strong>{balance}</strong>.",
      button: "Voir mon compte",
    },
    depositRejected: {
      subject: `À propos de votre dépôt — action requise`,
      title: "À propos de votre dépôt, {name}",
      p1: "Nous n'avons pas pu vérifier votre dépôt de <strong>{amount}</strong> (référence {ref}), il n'a donc pas été crédité.",
      reasonLabel: "Motif",
      p2: "Si vous pensez qu'il s'agit d'une erreur, répondez avec votre preuve de paiement ou contactez",
    },
    proofRequest: {
      subject: `Justificatif requis pour votre dépôt de {amount}`,
      title: "Une dernière chose, {name}",
      p1: "Pour créditer votre dépôt de <strong>{amount}</strong> (référence {ref}), nous avons besoin d'une preuve du paiement — confirmation de virement ou reçu.",
      p2: "Répondez simplement à cet e-mail avec une photo ou un PDF en pièce jointe, et nous nous occupons du reste.",
    },
    accountCredited: {
      subject: `Votre compte a été crédité de {amount}`,
      title: "Crédit appliqué, {name}",
      p1: "Votre compte a été crédité de <strong>{amount}</strong> (référence {ref}). Motif : {reason}.",
      p2: "Votre nouveau solde disponible est de <strong>{balance}</strong>.",
      button: "Voir mon compte",
    },
    accountDebited: {
      subject: `Votre compte a été débité de {amount}`,
      title: "Débit appliqué, {name}",
      p1: "Un débit de <strong>{amount}</strong> (référence {ref}) a été appliqué à votre compte. Motif : {reason}.",
      p2: "Votre nouveau solde disponible est de <strong>{balance}</strong>.",
      button: "Voir mon compte",
    },
    passwordReset: {
      subject: `Réinitialisez votre mot de passe ${BRAND}`,
      title: "Réinitialisation du mot de passe, {name}",
      p1: "Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez ci-dessous pour en choisir un nouveau — ce lien expire dans 1 heure.",
      button: "Réinitialiser mon mot de passe",
      p2: "Pour votre sécurité, ce lien ne peut être utilisé qu'une seule fois.",
      ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail ; votre mot de passe reste inchangé.",
    },
    loginCode: {
      subject: `Votre code de connexion ${BRAND}`,
      title: "Votre code de connexion, {name}",
      p1: "Utilisez ce code pour terminer votre connexion. Il expire dans {minutes} minutes et ne fonctionne qu'une fois.",
      p2: "Nous ne vous demanderons jamais ce code par e-mail, téléphone ou chat.",
      ignore:
        "Si vous n'essayiez pas de vous connecter, quelqu'un possède peut-être votre mot de passe. Changez-le au plus vite et prévenez-nous.",
    },
  },
  de: {
    footerQuestions: "Fragen? Kontaktieren Sie",
    footerAutomated: "Dies ist eine automatische Nachricht von einer nicht überwachten Adresse.",
    welcome: {
      subject: `Willkommen bei ${BRAND} — bestätigen Sie Ihre E-Mail`,
      title: "Willkommen, {name}",
      p1: `Vielen Dank, dass Sie ein Konto bei ${BRAND} eröffnet haben.`,
      p2: "Bitte bestätigen Sie zunächst Ihre E-Mail-Adresse:",
      button: "E-Mail bestätigen",
      p3: "Nach der Bestätigung werden Sie gebeten, ein Ausweisdokument (Personalausweis, Führerschein oder Reisepass) hochzuladen, um Ihren Antrag abzuschließen.",
      ignore: "Falls Sie dieses Konto nicht erstellt haben, können Sie diese E-Mail ignorieren.",
    },
    kycReceived: {
      subject: `Dokumente erhalten — ${BRAND}`,
      title: "Antrag erhalten, {name}",
      p1: "Ihr Ausweisdokument ist eingegangen. Unser Team prüft Ihren Antrag — in der Regel innerhalb eines Werktags.",
      p2: "Sie erhalten eine E-Mail, sobald Ihr Konto freigegeben ist.",
    },
    approved: {
      subject: `Ihr ${BRAND}-Konto ist freigegeben`,
      title: "Alles bereit, {name}",
      p1: "Ihr Konto wurde geprüft und freigegeben. Sie haben jetzt vollen Zugriff auf Ihr Kunden-Dashboard.",
      button: "Jetzt anmelden",
    },
    rejected: {
      subject: `Neuigkeiten zu Ihrem ${BRAND}-Antrag`,
      title: "Zu Ihrem Antrag, {name}",
      p1: "Nach Prüfung Ihres Antrags können wir Ihr Konto derzeit nicht eröffnen.",
      reasonLabel: "Grund",
      p2: "Wenn Sie glauben, dass dies ein Irrtum ist, oder weitere Unterlagen vorlegen können, kontaktieren Sie",
    },
    blocked: {
      subject: `Wichtig: Ihr ${BRAND}-Konto wurde eingeschränkt`,
      title: "Konto eingeschränkt",
      p1: "Hallo {name}, der Zugriff auf Ihr Konto wurde vorübergehend eingeschränkt, während wir jüngste Aktivitäten prüfen. Ihre Gelder und Daten bleiben sicher.",
      p2: "Bitte kontaktieren Sie uns zur Klärung:",
    },
    unblocked: {
      subject: `Der Zugriff auf Ihr ${BRAND}-Konto ist wiederhergestellt`,
      title: "Zugriff wiederhergestellt",
      p1: "Hallo {name}, die Einschränkung Ihres Kontos wurde aufgehoben. Sie können sich wie gewohnt anmelden.",
      button: "Anmelden",
    },
    depositReceived: {
      subject: `Einzahlung eingegangen — wird geprüft`,
      title: "Einzahlung eingegangen, {name}",
      p1: "Wir haben Ihre Einzahlung von <strong>{amount}</strong> erhalten (Referenz {ref}).",
      p2: "Unser Team prüft sie gerade. Ihr Saldo wird gutgeschrieben und Sie erhalten eine Quittung, sobald sie bestätigt ist — in der Regel innerhalb eines Werktags.",
    },
    depositPosted: {
      subject: `Einzahlungsquittung — {amount} gutgeschrieben`,
      title: "Einzahlung gutgeschrieben, {name}",
      p1: "Ihre Einzahlung von <strong>{amount}</strong> (Referenz {ref}) wurde geprüft und gutgeschrieben.",
      p2: "Ihr neuer verfügbarer Saldo beträgt <strong>{balance}</strong>.",
      button: "Mein Konto ansehen",
    },
    depositRejected: {
      subject: `Zu Ihrer Einzahlung — Handlung erforderlich`,
      title: "Zu Ihrer Einzahlung, {name}",
      p1: "Wir konnten Ihre Einzahlung von <strong>{amount}</strong> (Referenz {ref}) nicht verifizieren, daher wurde sie nicht gutgeschrieben.",
      reasonLabel: "Grund",
      p2: "Wenn Sie glauben, dass dies ein Irrtum ist, antworten Sie mit Ihrem Zahlungsnachweis oder kontaktieren Sie",
    },
    proofRequest: {
      subject: `Nachweis für Ihre Einzahlung von {amount} benötigt`,
      title: "Eine Sache noch, {name}",
      p1: "Um Ihre Einzahlung von <strong>{amount}</strong> (Referenz {ref}) gutzuschreiben, benötigen wir einen Zahlungsnachweis — eine Überweisungsbestätigung oder einen Beleg.",
      p2: "Antworten Sie einfach auf diese E-Mail mit einem Foto oder PDF im Anhang, den Rest erledigen wir.",
    },
    accountCredited: {
      subject: `Ihrem Konto wurden {amount} gutgeschrieben`,
      title: "Gutschrift erfolgt, {name}",
      p1: "Ihrem Konto wurden <strong>{amount}</strong> gutgeschrieben (Referenz {ref}). Grund: {reason}.",
      p2: "Ihr neuer verfügbarer Saldo beträgt <strong>{balance}</strong>.",
      button: "Mein Konto ansehen",
    },
    accountDebited: {
      subject: `Ihr Konto wurde mit {amount} belastet`,
      title: "Belastung erfolgt, {name}",
      p1: "Ihr Konto wurde mit <strong>{amount}</strong> belastet (Referenz {ref}). Grund: {reason}.",
      p2: "Ihr neuer verfügbarer Saldo beträgt <strong>{balance}</strong>.",
      button: "Mein Konto ansehen",
    },
    passwordReset: {
      subject: `Setzen Sie Ihr ${BRAND}-Passwort zurück`,
      title: "Passwort zurücksetzen, {name}",
      p1: "Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Klicken Sie unten, um ein neues zu wählen — dieser Link läuft in 1 Stunde ab.",
      button: "Passwort zurücksetzen",
      p2: "Zu Ihrer Sicherheit kann der Link nur einmal verwendet werden.",
      ignore: "Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail; Ihr Passwort bleibt unverändert.",
    },
    loginCode: {
      subject: `Ihr ${BRAND}-Anmeldecode`,
      title: "Ihr Anmeldecode, {name}",
      p1: "Mit diesem Code schließen Sie die Anmeldung ab. Er läuft in {minutes} Minuten ab und gilt einmalig.",
      p2: "Wir fragen Sie niemals per E-Mail, Telefon oder Chat nach diesem Code.",
      ignore:
        "Wenn Sie sich nicht anmelden wollten, kennt jemand möglicherweise Ihr Passwort. Ändern Sie es schnellstmöglich und sagen Sie uns Bescheid.",
    },
  },
  es: {
    footerQuestions: "¿Preguntas? Contacte con",
    footerAutomated: "Este es un mensaje automático enviado desde una dirección no supervisada.",
    welcome: {
      subject: `Bienvenido a ${BRAND} — verifique su correo`,
      title: "Bienvenido, {name}",
      p1: `Gracias por abrir una cuenta en ${BRAND}.`,
      p2: "Primero, verifique su dirección de correo electrónico:",
      button: "Verificar mi correo",
      p3: "Tras la verificación, se le pedirá subir un documento de identidad (DNI, permiso de conducir o pasaporte) para completar su solicitud.",
      ignore: "Si usted no creó esta cuenta, puede ignorar este correo.",
    },
    kycReceived: {
      subject: `Documentos recibidos — ${BRAND}`,
      title: "Solicitud recibida, {name}",
      p1: "Hemos recibido su documento de identidad. Nuestro equipo está revisando su solicitud — normalmente en un día laborable.",
      p2: "Recibirá un correo en cuanto su cuenta sea aprobada.",
    },
    approved: {
      subject: `Su cuenta de ${BRAND} está aprobada`,
      title: "Todo listo, {name}",
      p1: "Su cuenta ha sido revisada y aprobada. Ya tiene acceso completo a su panel de cliente.",
      button: "Iniciar sesión",
    },
    rejected: {
      subject: `Novedades sobre su solicitud de ${BRAND}`,
      title: "Sobre su solicitud, {name}",
      p1: "Tras revisar su solicitud, no podemos abrir su cuenta en este momento.",
      reasonLabel: "Motivo",
      p2: "Si cree que se trata de un error o puede aportar documentación adicional, contacte con",
    },
    blocked: {
      subject: `Importante: su cuenta de ${BRAND} ha sido restringida`,
      title: "Cuenta restringida",
      p1: "Hola {name}, el acceso a su cuenta se ha restringido temporalmente mientras revisamos actividad reciente. Sus fondos y registros están a salvo.",
      p2: "Contacte con nosotros para resolverlo:",
    },
    unblocked: {
      subject: `El acceso a su cuenta de ${BRAND} está restablecido`,
      title: "Acceso restablecido",
      p1: "Hola {name}, la restricción de su cuenta se ha levantado. Puede iniciar sesión con normalidad.",
      button: "Iniciar sesión",
    },
    depositReceived: {
      subject: `Depósito recibido — pendiente de verificación`,
      title: "Depósito recibido, {name}",
      p1: "Hemos recibido su depósito de <strong>{amount}</strong> (referencia {ref}).",
      p2: "Nuestro equipo lo está verificando. Su saldo se abonará y recibirá un recibo en cuanto se confirme — normalmente en un día laborable.",
    },
    depositPosted: {
      subject: `Recibo de depósito — {amount} abonado`,
      title: "Depósito abonado, {name}",
      p1: "Su depósito de <strong>{amount}</strong> (referencia {ref}) ha sido verificado y abonado.",
      p2: "Su nuevo saldo disponible es <strong>{balance}</strong>.",
      button: "Ver mi cuenta",
    },
    depositRejected: {
      subject: `Sobre su depósito — se requiere acción`,
      title: "Sobre su depósito, {name}",
      p1: "No pudimos verificar su depósito de <strong>{amount}</strong> (referencia {ref}), por lo que no se ha abonado.",
      reasonLabel: "Motivo",
      p2: "Si cree que se trata de un error, responda con su comprobante de pago o contacte con",
    },
    proofRequest: {
      subject: `Se necesita justificante para su depósito de {amount}`,
      title: "Una cosa más, {name}",
      p1: "Para abonar su depósito de <strong>{amount}</strong> (referencia {ref}), necesitamos un comprobante del pago — confirmación de transferencia o recibo.",
      p2: "Simplemente responda a este correo con una foto o PDF adjunto, y nosotros nos encargamos del resto.",
    },
    accountCredited: {
      subject: `Su cuenta ha sido abonada con {amount}`,
      title: "Abono aplicado, {name}",
      p1: "Su cuenta ha sido abonada con <strong>{amount}</strong> (referencia {ref}). Motivo: {reason}.",
      p2: "Su nuevo saldo disponible es <strong>{balance}</strong>.",
      button: "Ver mi cuenta",
    },
    accountDebited: {
      subject: `Su cuenta ha sido debitada con {amount}`,
      title: "Cargo aplicado, {name}",
      p1: "Se ha aplicado un cargo de <strong>{amount}</strong> (referencia {ref}) a su cuenta. Motivo: {reason}.",
      p2: "Su nuevo saldo disponible es <strong>{balance}</strong>.",
      button: "Ver mi cuenta",
    },
    passwordReset: {
      subject: `Restablezca su contraseña de ${BRAND}`,
      title: "Restablecer contraseña, {name}",
      p1: "Recibimos una solicitud para restablecer su contraseña. Haga clic abajo para elegir una nueva — este enlace caduca en 1 hora.",
      button: "Restablecer mi contraseña",
      p2: "Por su seguridad, el enlace solo puede usarse una vez.",
      ignore: "Si no solicitó esto, ignore este correo; su contraseña permanece igual.",
    },
    loginCode: {
      subject: `Su código de acceso de ${BRAND}`,
      title: "Su código de acceso, {name}",
      p1: "Use este código para terminar de iniciar sesión. Caduca en {minutes} minutos y sirve una sola vez.",
      p2: "Nunca le pediremos este código por correo, teléfono ni chat.",
      ignore:
        "Si no estaba intentando entrar, puede que alguien tenga su contraseña. Cámbiela cuanto antes y avísenos.",
    },
  },
};

function fillName(template: string, name: string) {
  return template.replace("{name}", name);
}

function fillVars(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// ---------- shell ----------

function layout(strings: EmailStrings, title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e3e7ee;">
    <div style="background:${NAVY};padding:24px 32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">${BRAND}</span>
    </div>
    <div style="padding:32px;color:#1a2233;font-size:15px;line-height:1.6;">
      <h2 style="margin:0 0 16px;color:${NAVY};font-size:18px;">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:16px 32px;background:#f4f6f9;color:#6b7280;font-size:12px;line-height:1.5;">
      ${BRAND} &middot; northstonetrustbank.com<br/>
      ${strings.footerQuestions} <a href="mailto:support@northstonetrustbank.com" style="color:${NAVY};">support@northstonetrustbank.com</a>.<br/>
      ${strings.footerAutomated}
    </div>
  </div>
</body>
</html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${href}" style="background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:999px;display:inline-block;">${label}</a></p>`;
}

// ---------- transport ----------

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
};

/**
 * Sends an email via Resend when RESEND_API_KEY is configured; otherwise
 * prints it to the terminal. Every attempt is recorded in EmailLog.
 */
export async function sendEmail({ to, subject, html, from, replyTo }: SendArgs) {
  const fromAddress = from ?? process.env.EMAIL_FROM ?? `noreply@northstonetrustbank.com`;
  const replyToAddress = replyTo ?? process.env.EMAIL_REPLY_TO;

  const transport = getSmtpTransport(fromAddress);
  const apiKey = process.env.RESEND_API_KEY;

  // No transport configured — log to console/DB so dev never breaks.
  if (!transport && !apiKey) {
    console.log(
      `\n[DEV EMAIL] to: ${to}\n[DEV EMAIL] from: ${fromAddress}\n[DEV EMAIL] subject: ${subject}\n` +
        `[DEV EMAIL] (configure SMTP_* or RESEND_API_KEY in .env to send for real)\n`
    );
    await db.emailLog.create({
      data: { toAddress: to, fromAddress, subject, status: "DEV_LOGGED" },
    });
    return { ok: true as const };
  }

  try {
    // Preferred: send through the company's own SMTP server.
    if (transport) {
      await transport.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        replyTo: replyToAddress,
      });
    } else {
      const resend = new Resend(apiKey!);
      const { error } = await resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
        replyTo: replyToAddress,
      });
      if (error) throw new Error(error.message);
    }
    await db.emailLog.create({
      data: { toAddress: to, fromAddress, subject, status: "SENT" },
    });
    return { ok: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await db.emailLog.create({
      data: { toAddress: to, fromAddress, subject, status: "FAILED", error: message },
    });
    console.error(`Email to ${to} failed: ${message}`);
    return { ok: false as const, error: message };
  }
}

// ---------- admin broadcasts (plain text → branded HTML) ----------

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Turns an admin's plain-text message into paragraphs inside the brand shell. */
function plainToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export async function sendBroadcastEmail(
  to: string,
  subject: string,
  bodyText: string,
  opts?: { from?: string; replyTo?: string; locale?: string }
) {
  const s = STRINGS[toLocale(opts?.locale)];
  return sendEmail({
    to,
    subject,
    from: opts?.from,
    replyTo: opts?.replyTo,
    html: layout(s, escapeHtml(subject), plainToHtml(bodyText)),
  });
}

// ---------- templates ----------

export async function sendWelcomeEmail(
  to: string,
  firstName: string,
  verifyToken: string,
  locale?: string
) {
  const s = STRINGS[toLocale(locale)];
  const link = `${appUrl()}/verify?token=${verifyToken}`;
  return sendEmail({
    to,
    subject: s.welcome.subject,
    html: layout(
      s,
      fillName(s.welcome.title, firstName),
      `<p>${s.welcome.p1}</p>
       <p>${s.welcome.p2}</p>
       ${button(link, s.welcome.button)}
       <p>${s.welcome.p3}</p>
       <p>${s.welcome.ignore}</p>`
    ),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetToken: string,
  locale?: string
) {
  const s = STRINGS[toLocale(locale)];
  const link = `${appUrl()}/reset-password?token=${resetToken}`;
  return sendEmail({
    to,
    subject: s.passwordReset.subject,
    html: layout(
      s,
      fillName(s.passwordReset.title, firstName),
      `<p>${s.passwordReset.p1}</p>
       ${button(link, s.passwordReset.button)}
       <p>${s.passwordReset.p2}</p>
       <p>${s.passwordReset.ignore}</p>`
    ),
  });
}

/** The one-time code for clients who have turned two-factor on. */
export async function sendLoginCodeEmail(
  to: string,
  firstName: string,
  code: string,
  locale: string | undefined,
  minutes: number
) {
  const s = STRINGS[toLocale(locale)];
  return sendEmail({
    to,
    subject: s.loginCode.subject,
    html: layout(
      s,
      fillName(s.loginCode.title, firstName),
      `<p>${s.loginCode.p1.replace("{minutes}", String(minutes))}</p>
       <p style="margin:28px 0;text-align:center;font-family:ui-monospace,Menlo,Consolas,monospace;
                 font-size:34px;font-weight:700;letter-spacing:10px;color:#062A52">${code}</p>
       <p>${s.loginCode.p2}</p>
       <p>${s.loginCode.ignore}</p>`
    ),
  });
}

export async function sendKycReceivedEmail(to: string, firstName: string, locale?: string) {
  const s = STRINGS[toLocale(locale)];
  return sendEmail({
    to,
    subject: s.kycReceived.subject,
    html: layout(
      s,
      fillName(s.kycReceived.title, firstName),
      `<p>${s.kycReceived.p1}</p><p>${s.kycReceived.p2}</p>`
    ),
  });
}

export async function sendAccountApprovedEmail(to: string, firstName: string, locale?: string) {
  const s = STRINGS[toLocale(locale)];
  return sendEmail({
    to,
    subject: s.approved.subject,
    html: layout(
      s,
      fillName(s.approved.title, firstName),
      `<p>${s.approved.p1}</p>${button(`${appUrl()}/login`, s.approved.button)}`
    ),
  });
}

export async function sendAccountRejectedEmail(
  to: string,
  firstName: string,
  reason: string,
  locale?: string
) {
  const s = STRINGS[toLocale(locale)];
  return sendEmail({
    to,
    subject: s.rejected.subject,
    html: layout(
      s,
      fillName(s.rejected.title, firstName),
      `<p>${s.rejected.p1}</p>
       <p><strong>${s.rejected.reasonLabel}:</strong> ${reason}</p>
       <p>${s.rejected.p2} <a href="mailto:support@northstonetrustbank.com">support@northstonetrustbank.com</a>.</p>`
    ),
  });
}

export async function sendAccountBlockedEmail(to: string, firstName: string, locale?: string) {
  const s = STRINGS[toLocale(locale)];
  return sendEmail({
    to,
    subject: s.blocked.subject,
    html: layout(
      s,
      s.blocked.title,
      `<p>${fillName(s.blocked.p1, firstName)}</p>
       <p>${s.blocked.p2} <a href="mailto:support@northstonetrustbank.com">support@northstonetrustbank.com</a></p>`
    ),
  });
}

export async function sendDepositReceivedEmail(
  to: string,
  firstName: string,
  locale: string | undefined,
  amount: string,
  ref: string
) {
  const s = STRINGS[toLocale(locale)];
  const vars = { name: firstName, amount, ref };
  return sendEmail({
    to,
    subject: fillVars(s.depositReceived.subject, vars),
    html: layout(
      s,
      fillVars(s.depositReceived.title, vars),
      `<p>${fillVars(s.depositReceived.p1, vars)}</p><p>${s.depositReceived.p2}</p>`
    ),
  });
}

export async function sendDepositPostedEmail(
  to: string,
  firstName: string,
  locale: string | undefined,
  amount: string,
  ref: string,
  balance: string
) {
  const s = STRINGS[toLocale(locale)];
  const vars = { name: firstName, amount, ref, balance };
  return sendEmail({
    to,
    subject: fillVars(s.depositPosted.subject, vars),
    html: layout(
      s,
      fillVars(s.depositPosted.title, vars),
      `<p>${fillVars(s.depositPosted.p1, vars)}</p>
       <p>${fillVars(s.depositPosted.p2, vars)}</p>
       ${button(`${appUrl()}/dashboard`, s.depositPosted.button)}`
    ),
  });
}

export async function sendDepositRejectedEmail(
  to: string,
  firstName: string,
  locale: string | undefined,
  amount: string,
  ref: string,
  reason: string
) {
  const s = STRINGS[toLocale(locale)];
  const vars = { name: firstName, amount, ref };
  return sendEmail({
    to,
    subject: fillVars(s.depositRejected.subject, vars),
    html: layout(
      s,
      fillVars(s.depositRejected.title, vars),
      `<p>${fillVars(s.depositRejected.p1, vars)}</p>
       <p><strong>${s.depositRejected.reasonLabel}:</strong> ${reason}</p>
       <p>${s.depositRejected.p2} <a href="mailto:support@northstonetrustbank.com">support@northstonetrustbank.com</a>.</p>`
    ),
  });
}

export async function sendProofRequestEmail(
  to: string,
  firstName: string,
  locale: string | undefined,
  amount: string,
  ref: string
) {
  const s = STRINGS[toLocale(locale)];
  const vars = { name: firstName, amount, ref };
  return sendEmail({
    to,
    subject: fillVars(s.proofRequest.subject, vars),
    html: layout(
      s,
      fillVars(s.proofRequest.title, vars),
      `<p>${fillVars(s.proofRequest.p1, vars)}</p><p>${s.proofRequest.p2}</p>`
    ),
    replyTo: "support@northstonetrustbank.com",
  });
}

export async function sendAdjustmentEmail(
  to: string,
  firstName: string,
  locale: string | undefined,
  direction: "CREDIT" | "DEBIT",
  amount: string,
  ref: string,
  reason: string,
  balance: string
) {
  const s = STRINGS[toLocale(locale)];
  const tpl = direction === "CREDIT" ? s.accountCredited : s.accountDebited;
  const vars = { name: firstName, amount, ref, reason, balance };
  return sendEmail({
    to,
    subject: fillVars(tpl.subject, vars),
    html: layout(
      s,
      fillVars(tpl.title, vars),
      `<p>${fillVars(tpl.p1, vars)}</p>
       <p>${fillVars(tpl.p2, vars)}</p>
       ${button(`${appUrl()}/dashboard`, tpl.button)}`
    ),
  });
}

export async function sendAccountUnblockedEmail(to: string, firstName: string, locale?: string) {
  const s = STRINGS[toLocale(locale)];
  return sendEmail({
    to,
    subject: s.unblocked.subject,
    html: layout(
      s,
      s.unblocked.title,
      `<p>${fillName(s.unblocked.p1, firstName)}</p>${button(`${appUrl()}/login`, s.unblocked.button)}`
    ),
  });
}

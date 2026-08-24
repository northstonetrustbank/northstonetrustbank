/**
 * A short, human description of a device from its user-agent string —
 * "Chrome on Windows", "Safari on iPhone". Deliberately coarse: enough for a
 * client to recognise their own device in the session list, not enough to
 * fingerprint them. No IP address is stored anywhere.
 */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent;

  const os =
    /Windows NT/i.test(ua) ? "Windows"
    : /iPhone/i.test(ua) ? "iPhone"
    : /iPad/i.test(ua) ? "iPad"
    : /Android/i.test(ua) ? "Android"
    : /Mac OS X/i.test(ua) ? "Mac"
    : /Linux/i.test(ua) ? "Linux"
    : null;

  // Order matters: Edge and Opera both claim to be Chrome, and Chrome claims
  // to be Safari, so the most specific match has to be tested first.
  const browser =
    /Edg\//i.test(ua) ? "Edge"
    : /OPR\//i.test(ua) || /Opera/i.test(ua) ? "Opera"
    : /SamsungBrowser/i.test(ua) ? "Samsung Internet"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Safari\//i.test(ua) ? "Safari"
    : null;

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  return "Unknown device";
}

import disposableDomains from "./disposable-domains.json";

const domainSet = new Set(disposableDomains as string[]);

/**
 * Check if an email uses a known disposable/temporary email domain.
 * Allows Gmail/Outlook "+" aliases (those are legitimate).
 * Blocks "+" aliases only if the base domain is disposable.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return domainSet.has(domain);
}

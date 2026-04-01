/**
 * Design Validator — Sprint 0
 *
 * Checks email HTML for rendering issues before sending.
 * Catches: missing unsubscribe, broken links, oversized HTML, missing alt text.
 */

export type DesignValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Validate email HTML design before sending.
 */
export function validateDesign(html: string): DesignValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!html || html.trim().length === 0) {
    errors.push("Email HTML is empty");
    return { valid: false, errors, warnings };
  }

  // 1. Unsubscribe link (CASL/CAN-SPAM mandatory)
  const hasUnsubscribe =
    html.toLowerCase().includes("unsubscribe") &&
    (html.includes("href") || html.includes("HREF"));
  if (!hasUnsubscribe) {
    errors.push(
      "Missing unsubscribe link — required by CASL and CAN-SPAM"
    );
  }

  // 2. Physical address (CASL/CAN-SPAM)
  // Check for common address patterns (street number + name)
  const addressPattern = /\d+\s+\w+\s+(St|Ave|Blvd|Dr|Rd|Way|Cres|Pl|Ct)/i;
  const hasAddress = addressPattern.test(html);
  if (!hasAddress) {
    warnings.push(
      "No physical address detected in footer — required for CASL/CAN-SPAM compliance"
    );
  }

  // 3. All images have alt text
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  let missingAlt = 0;
  for (const img of imgTags) {
    if (!img.includes("alt=") || img.match(/alt=["']\s*["']/)) {
      missingAlt++;
    }
  }
  if (missingAlt > 0) {
    warnings.push(
      `${missingAlt} image(s) missing alt text — affects accessibility and image-blocked clients`
    );
  }

  // 4. All links have href (not empty or undefined)
  const linkTags = html.match(/<a[^>]*>/gi) || [];
  let brokenLinks = 0;
  for (const link of linkTags) {
    const hrefMatch = link.match(/href=["']([^"']*)["']/i);
    if (!hrefMatch) {
      brokenLinks++;
    } else {
      const href = hrefMatch[1];
      if (
        !href ||
        href === "#" ||
        href === "undefined" ||
        href === "null" ||
        href === ""
      ) {
        // # is OK for placeholder CTAs in drafts, but flag it
        if (href === "#") {
          warnings.push("Link with href='#' found — placeholder, not a real URL");
        } else if (href !== "#") {
          brokenLinks++;
        }
      }
    }
  }
  if (brokenLinks > 0) {
    errors.push(
      `${brokenLinks} link(s) have broken or missing href`
    );
  }

  // 5. CTA button exists
  const hasCTA =
    html.includes("display:inline-block") ||
    html.includes("display: inline-block") ||
    html.toLowerCase().includes("button") ||
    html.includes("border-radius") && html.includes("padding");
  if (!hasCTA) {
    warnings.push("No CTA button detected — email may lack a clear call to action");
  }

  // 6. File size check (Gmail clips at 102KB)
  const sizeKB = Buffer.byteLength(html, "utf8") / 1024;
  if (sizeKB > 100) {
    errors.push(
      `Email HTML is ${Math.round(sizeKB)}KB — exceeds 100KB limit (Gmail will clip)`
    );
  } else if (sizeKB > 80) {
    warnings.push(
      `Email HTML is ${Math.round(sizeKB)}KB — approaching 100KB Gmail clip limit`
    );
  }

  // 7. Basic HTML structure
  if (!html.includes("<html") && !html.includes("<HTML")) {
    warnings.push("Missing <html> tag — may render inconsistently");
  }
  if (!html.includes("<body") && !html.includes("<BODY")) {
    warnings.push("Missing <body> tag");
  }

  // 8. Dark mode meta tag
  if (!html.includes("color-scheme") && !html.includes("prefers-color-scheme")) {
    warnings.push(
      "No dark mode support — email may look bad in dark mode email clients"
    );
  }

  // 9. Viewport meta (mobile rendering)
  if (!html.includes("viewport")) {
    warnings.push(
      "Missing viewport meta tag — mobile rendering may be incorrect"
    );
  }

  // 10. Max width check (email should be 600px max)
  if (!html.includes("600") && !html.includes("max-width")) {
    warnings.push(
      "No max-width constraint found — email may be too wide on desktop"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

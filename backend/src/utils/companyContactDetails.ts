import { CompanyContactAddress, CompanyContactDetails, CompanyContactItem } from "../types/agent.types.js";

const EMPTY_VALUES = new Set([
  "",
  "n/a",
  "na",
  "none",
  "unknown",
  "not available",
  "not publicly available",
  "null",
  "undefined"
]);

const cleanValue = (value?: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  if (EMPTY_VALUES.has(normalized.toLowerCase())) return undefined;
  return normalized;
};

const cleanUrl = (value?: string | null): string | undefined => {
  const normalized = cleanValue(value);
  if (!normalized) return undefined;
  try {
    const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
    return new URL(withProtocol).toString();
  } catch {
    return undefined;
  }
};

const dedupeByKey = <T>(items: T[], getKey: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sanitizeContactItems = (items: unknown): CompanyContactItem[] => {
  if (!Array.isArray(items)) return [];
  const mappedItems: Array<CompanyContactItem | undefined> = items.map((item) => {
    const label = cleanValue((item as { label?: string })?.label);
    const value = cleanValue((item as { value?: string })?.value);
    if (!value) return undefined;
    return {
      label: label ?? "Official",
      value,
      sourceUrl: cleanUrl((item as { sourceUrl?: string })?.sourceUrl)
    };
  });
  return dedupeByKey(
    mappedItems.filter((item): item is CompanyContactItem => item !== undefined),
    (item) => `${item.label.toLowerCase()}::${item.value.toLowerCase()}`
  );
};

const sanitizeAddresses = (items: unknown): CompanyContactAddress[] => {
  if (!Array.isArray(items)) return [];
  const mappedItems: Array<CompanyContactAddress | undefined> = items.map((item) => {
    const label = cleanValue((item as { label?: string })?.label);
    const value = cleanValue((item as { value?: string })?.value);
    if (!value) return undefined;
    return {
      label: label ?? "Official Address",
      value,
      sourceUrl: cleanUrl((item as { sourceUrl?: string })?.sourceUrl)
    };
  });
  return dedupeByKey(
    mappedItems.filter((item): item is CompanyContactAddress => item !== undefined),
    (item) => `${item.label.toLowerCase()}::${item.value.toLowerCase()}`
  );
};

export const sanitizeCompanyContactDetails = (details: unknown): CompanyContactDetails | undefined => {
  if (!details || typeof details !== "object") return undefined;

  const sanitized: CompanyContactDetails = {
    officialContactPageUrl: cleanUrl((details as { officialContactPageUrl?: string })?.officialContactPageUrl),
    addresses: sanitizeAddresses((details as { addresses?: unknown[] })?.addresses),
    phoneNumbers: sanitizeContactItems((details as { phoneNumbers?: unknown[] })?.phoneNumbers),
    emails: sanitizeContactItems((details as { emails?: unknown[] })?.emails)
  };

  if (
    !sanitized.officialContactPageUrl &&
    sanitized.addresses.length === 0 &&
    sanitized.phoneNumbers.length === 0 &&
    sanitized.emails.length === 0
  ) {
    return undefined;
  }

  return sanitized;
};

export const extractCompanyContactSourceUrls = (details?: CompanyContactDetails): string[] => {
  if (!details) return [];
  return dedupeByKey(
    [
      details.officialContactPageUrl,
      ...details.addresses.map((item) => item.sourceUrl),
      ...details.phoneNumbers.map((item) => item.sourceUrl),
      ...details.emails.map((item) => item.sourceUrl)
    ].filter((item): item is string => Boolean(item)),
    (item) => item
  );
};

const labelScore = (label: string, patterns: RegExp[]): number => {
  const normalized = label.toLowerCase();
  return patterns.reduce((score, pattern, index) => (
    pattern.test(normalized) ? score + (patterns.length - index) : score
  ), 0);
};

const pickBestContactItem = (items: CompanyContactItem[], preferredPatterns: RegExp[]): CompanyContactItem | undefined =>
  [...items].sort((left, right) => {
    const scoreDiff = labelScore(right.label, preferredPatterns) - labelScore(left.label, preferredPatterns);
    if (scoreDiff !== 0) return scoreDiff;
    return left.label.localeCompare(right.label);
  })[0];

const PRIMARY_EMAIL_LABELS = [/general|sales|contact|office/i, /support|helpdesk/i, /compliance|investor/i, /hr|jobs/i];
const PRIMARY_PHONE_LABELS = [/registered|head office|hq|switchboard|office/i, /general|sales|contact/i, /support|helpdesk/i, /mobile|toll[- ]?free/i];

export const pickPrimaryCompanyEmail = (
  details?: CompanyContactDetails,
  fallback?: string
): string | undefined => pickBestContactItem(details?.emails ?? [], PRIMARY_EMAIL_LABELS)?.value ?? cleanValue(fallback);

export const pickPrimaryCompanyPhone = (
  details?: CompanyContactDetails,
  fallback?: string
): string | undefined => pickBestContactItem(details?.phoneNumbers ?? [], PRIMARY_PHONE_LABELS)?.value ?? cleanValue(fallback);

export const hasStructuredCompanyContacts = (details?: CompanyContactDetails): boolean => {
  if (!details) return false;
  return details.addresses.length > 0 &&
    details.phoneNumbers.length > 0 &&
    details.emails.length > 0 &&
    extractCompanyContactSourceUrls(details).length > 0;
};

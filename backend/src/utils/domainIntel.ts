import { promises as dns } from "dns";

export interface DomainIntel {
  emailDomain: string;
  hasMx: boolean;
  emailProvider: string;
  mxHosts: string[];
}

const PROVIDER_MAP: Array<[RegExp, string]> = [
  [/google\.com$/i,        "Google Workspace"],
  [/googlemail\.com$/i,    "Google Workspace"],
  [/outlook\.com$/i,       "Microsoft 365"],
  [/hotmail\.com$/i,       "Microsoft 365"],
  [/microsoft\.com$/i,     "Microsoft 365"],
  [/protection\.outlook\.com$/i, "Microsoft 365"],
  [/zoho\.com$/i,          "Zoho Mail"],
  [/yahoodns\.net$/i,      "Yahoo Mail"],
  [/mimecast\.com$/i,      "Mimecast (Self-hosted)"],
  [/proofpoint\.com$/i,    "Proofpoint (Self-hosted)"],
  [/amazonses\.com$/i,     "Amazon SES"],
  [/mailgun\.org$/i,       "Mailgun"],
  [/sendgrid\.net$/i,      "SendGrid"],
];

const detectProvider = (mxHosts: string[]): string => {
  for (const host of mxHosts) {
    for (const [pattern, name] of PROVIDER_MAP) {
      if (pattern.test(host)) return name;
    }
  }
  return mxHosts.length > 0 ? "Self-hosted / Custom" : "Unknown";
};

const normaliseDomain = (raw: string): string => {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
};

export const getDomainIntel = async (companyDomain: string): Promise<DomainIntel> => {
  const emailDomain = normaliseDomain(companyDomain);
  try {
    const records = await dns.resolveMx(emailDomain);
    const mxHosts = records
      .sort((a, b) => a.priority - b.priority)
      .map(r => r.exchange.replace(/\.$/,"").toLowerCase());
    return { emailDomain, hasMx: true, emailProvider: detectProvider(mxHosts), mxHosts };
  } catch {
    return { emailDomain, hasMx: false, emailProvider: "Unknown", mxHosts: [] };
  }
};

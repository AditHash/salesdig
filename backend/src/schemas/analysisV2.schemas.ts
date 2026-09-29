import { RunAnalysisInput } from "../types/agent.types.js";

const normalizeCustomerName = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const normalizeCompanyDomain = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  const raw = value.trim().toLowerCase();
  if (!raw) {
    return "";
  }

  try {
    const withScheme = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch (_error) {
    return raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();
  }
};

const isValidDomain = (domain: string): boolean => {
  if (!domain || domain.length < 4) {
    return false;
  }
  if (domain.includes(" ") || domain.includes("..")) {
    return false;
  }
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain);
};

export const parseRunAnalysisInput = (input: unknown): RunAnalysisInput => {
  const body = (input || {}) as Record<string, unknown>;
  const customerName = normalizeCustomerName(body.customerName);
  const companyDomain = normalizeCompanyDomain(body.companyDomain);

  if (!customerName || customerName.length < 2) {
    throw new Error("customerName is required and must be at least 2 characters.");
  }
  if (!isValidDomain(companyDomain)) {
    throw new Error("companyDomain is required and must be a valid domain (e.g., infosys.com).");
  }

  return {
    customerName,
    companyDomain
  };
};

import { ZOHO_CATALOG } from "./zohoCatalog.js";

export const DEFAULT_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

export interface WorkspaceSettings {
  companyName: string;
  productName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  companyDescription: string;
  primaryCloudProvider: string;
  salesServices: string[];
  partnerProducts: string[];
  enabledRecommendations: {
    awsFunding: boolean;
    partnerProducts: boolean;
  };
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  companyName: "Workmates",
  productName: "Cloud Catalyst",
  tagline: "Company research and sales intelligence",
  primaryColor: "#4f52d3",
  accentColor: "#f5a623",
  companyDescription: "Workmates is a cloud consulting and AWS partner company.",
  primaryCloudProvider: "AWS",
  salesServices: [
    "Cloud migration",
    "Infrastructure and application modernization",
    "Database modernization",
    "Disaster recovery and backup",
    "Security assessment and managed security",
    "Cloud cost optimization",
    "DevOps and FinOps",
    "Generative AI solutions",
    "AWS managed services",
    "Zoho implementation and managed services"
  ],
  partnerProducts: ZOHO_CATALOG.flatMap(category => category.products.map(product =>
    `${product.name}: ${product.businessUse}`
  )),
  enabledRecommendations: {
    awsFunding: true,
    partnerProducts: true
  }
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

export const parseWorkspaceSettings = (value: unknown): WorkspaceSettings => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("settings must be an object");
  }

  const input = value as Record<string, unknown>;
  const enabled = input.enabledRecommendations as Record<string, unknown> | undefined;
  const stringField = (key: keyof WorkspaceSettings, maxLength: number): string => {
    const field = input[key];
    if (typeof field !== "string" || !field.trim() || field.length > maxLength || /[\u0000-\u001f\u007f]/.test(field)) {
      throw new Error(`${key} must be a non-empty string of at most ${maxLength} characters`);
    }
    return field.trim();
  };
  const stringList = (key: "salesServices" | "partnerProducts", maxItems: number, maxLength: number): string[] => {
    const field = input[key];
    if (!Array.isArray(field) || field.length > maxItems || field.some(item =>
      typeof item !== "string" || !item.trim() || item.length > maxLength
    )) {
      throw new Error(`${key} must contain at most ${maxItems} non-empty strings`);
    }
    return [...new Set(field.map(item => (item as string).trim()))];
  };

  if (!isHexColor(input.primaryColor) || !isHexColor(input.accentColor)) {
    throw new Error("primaryColor and accentColor must be six-digit hex colors");
  }
  if (!enabled || typeof enabled.awsFunding !== "boolean" || typeof enabled.partnerProducts !== "boolean") {
    throw new Error("enabledRecommendations must define boolean awsFunding and partnerProducts values");
  }

  return {
    companyName: stringField("companyName", 80),
    productName: stringField("productName", 80),
    tagline: stringField("tagline", 160),
    primaryColor: input.primaryColor,
    accentColor: input.accentColor,
    companyDescription: stringField("companyDescription", 1000),
    primaryCloudProvider: stringField("primaryCloudProvider", 50),
    salesServices: stringList("salesServices", 30, 120),
    partnerProducts: stringList("partnerProducts", 200, 300),
    enabledRecommendations: {
      awsFunding: enabled.awsFunding,
      partnerProducts: enabled.partnerProducts
    }
  };
};

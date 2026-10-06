import { postgres } from "../config/postgres.js";

export type OnboardingStatus = "not_started" | "in_progress" | "complete";

export interface CompanyProfile {
  companyName: string;
  website: string;
  companyDescription: string;
  industriesServed: string[];
  idealCustomerProfile: string;
  differentiators: string[];
  onboardingStatus: OnboardingStatus;
  version: number;
  updatedAt: string | null;
}

export class ProfileValidationError extends Error {}

const stringField = (value: unknown, name: string, max: number, required = false): string => {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new ProfileValidationError(`${name} must be a string of at most ${max} characters`);
  }
  const trimmed = value.trim();
  if (required && trimmed.length < 2) throw new ProfileValidationError(`${name} must contain at least 2 characters`);
  return trimmed;
};

const listField = (value: unknown, name: string): string[] => {
  if (!Array.isArray(value) || value.length > 20) {
    throw new ProfileValidationError(`${name} must contain at most 20 items`);
  }
  return [...new Set(value.map(item => stringField(item, name, 120, true)))];
};

const websiteField = (value: unknown): string => {
  const raw = stringField(value, "website", 255);
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password || url.href.length > 255) {
      throw new Error("invalid website");
    }
    return url.href;
  } catch {
    throw new ProfileValidationError("website must be a valid HTTP or HTTPS URL");
  }
};

export const parseCompanyProfilePatch = (value: unknown): Partial<CompanyProfile> & { version: number } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProfileValidationError("Profile must be an object");
  const input = value as Record<string, unknown>;
  const keys = ["companyName", "website", "companyDescription", "industriesServed", "idealCustomerProfile", "differentiators", "onboardingStatus", "version"];
  if (Object.keys(input).some(key => !keys.includes(key))) throw new ProfileValidationError("Profile contains an unknown field");
  if (!Number.isSafeInteger(input.version) || (input.version as number) < 0) throw new ProfileValidationError("version must be a non-negative integer");
  if (Object.keys(input).length < 2) throw new ProfileValidationError("At least one profile field is required");
  const patch: Partial<CompanyProfile> & { version: number } = { version: input.version as number };
  if ("companyName" in input) patch.companyName = stringField(input.companyName, "companyName", 80, true);
  if ("website" in input) patch.website = websiteField(input.website);
  if ("companyDescription" in input) patch.companyDescription = stringField(input.companyDescription, "companyDescription", 1000);
  if ("industriesServed" in input) patch.industriesServed = listField(input.industriesServed, "industriesServed");
  if ("idealCustomerProfile" in input) patch.idealCustomerProfile = stringField(input.idealCustomerProfile, "idealCustomerProfile", 1000);
  if ("differentiators" in input) patch.differentiators = listField(input.differentiators, "differentiators");
  if ("onboardingStatus" in input) {
    if (!(["in_progress", "complete"] as unknown[]).includes(input.onboardingStatus)) {
      throw new ProfileValidationError("onboardingStatus must be in_progress or complete");
    }
    patch.onboardingStatus = input.onboardingStatus as OnboardingStatus;
  }
  return patch;
};

interface ProfileRow {
  settings: { companyName: string; companyDescription: string };
  website: string;
  industries_served: string[];
  ideal_customer_profile: string;
  differentiators: string[];
  onboarding_status: OnboardingStatus;
  profile_version: number;
  profile_updated_at: Date | null;
}

const profileFromRow = (row: ProfileRow): CompanyProfile => ({
  companyName: row.settings.companyName,
  website: row.website,
  companyDescription: row.settings.companyDescription,
  industriesServed: row.industries_served,
  idealCustomerProfile: row.ideal_customer_profile,
  differentiators: row.differentiators,
  onboardingStatus: row.onboarding_status,
  version: row.profile_version,
  updatedAt: row.profile_updated_at?.toISOString() ?? null
});

export const getCompanyProfile = async (userId: string, workspaceId: string): Promise<CompanyProfile | null> => {
  const result = await postgres.query<ProfileRow>(
    `SELECT w.* FROM workspaces w JOIN users u ON u.workspace_id = w.id
     WHERE u.id = $1 AND w.id = $2 AND NOT u.is_blocked`,
    [userId, workspaceId]
  );
  return result.rows[0] ? profileFromRow(result.rows[0]) : null;
};

export const updateCompanyProfile = async (userId: string, workspaceId: string, patch: Partial<CompanyProfile> & { version: number }): Promise<CompanyProfile | "forbidden" | "stale" | null> => {
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const access = await client.query<{ role: string }>(
      `SELECT u.role FROM users u WHERE u.id = $1 AND u.workspace_id = $2 AND NOT u.is_blocked`,
      [userId, workspaceId]
    );
    if (!access.rows[0]) { await client.query("ROLLBACK"); return null; }
    if (access.rows[0].role !== "admin") { await client.query("ROLLBACK"); return "forbidden"; }
    const current = await client.query<ProfileRow>("SELECT * FROM workspaces WHERE id = $1 FOR UPDATE", [workspaceId]);
    if (!current.rows[0]) { await client.query("ROLLBACK"); return null; }
    const previous = profileFromRow(current.rows[0]);
    if (previous.version !== patch.version) { await client.query("ROLLBACK"); return "stale"; }
    const next = { ...previous, ...patch };
    if (next.onboardingStatus === "complete" && (!next.companyName || !next.website || !next.companyDescription)) {
      throw new ProfileValidationError("Company name, website, and description are required to complete onboarding");
    }
    const updated = await client.query<ProfileRow>(
      `UPDATE workspaces SET
         settings = settings || jsonb_build_object('companyName', $2::text, 'companyDescription', $3::text),
         website = $4, industries_served = $5, ideal_customer_profile = $6,
         differentiators = $7, onboarding_status = $8,
         profile_version = profile_version + 1, profile_updated_at = now(), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [workspaceId, next.companyName, next.companyDescription, next.website, next.industriesServed,
        next.idealCustomerProfile, next.differentiators, next.onboardingStatus]
    );
    await client.query("COMMIT");
    return profileFromRow(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

import { postgres } from "../config/postgres.js";
import { parseWorkspaceSettings, type WorkspaceSettings } from "../config/workspaceDefaults.js";

const preferenceKeys = [
  "tagline", "primaryColor", "accentColor", "primaryCloudProvider",
  "salesServices", "partnerProducts", "enabledRecommendations"
] as const;

export class WorkspacePreferencesValidationError extends Error {}

export const updateWorkspacePreferences = async (
  workspaceId: string,
  input: unknown
): Promise<WorkspaceSettings | null> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new WorkspacePreferencesValidationError("preferences must be an object");
  }
  const patch = input as Record<string, unknown>;
  const keys = Object.keys(patch);
  if (!keys.length || keys.some(key => !(preferenceKeys as readonly string[]).includes(key))) {
    throw new WorkspacePreferencesValidationError("preferences must contain only editable company settings");
  }

  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ settings: WorkspaceSettings }>(
      "SELECT settings FROM workspaces WHERE id = $1 FOR UPDATE", [workspaceId]
    );
    if (!current.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    let validated: WorkspaceSettings;
    try {
      validated = parseWorkspaceSettings({ ...current.rows[0].settings, ...patch });
    } catch (error) {
      throw new WorkspacePreferencesValidationError(error instanceof Error ? error.message : "Invalid company settings");
    }
    const saved = await client.query<{ settings: WorkspaceSettings }>(
      "UPDATE workspaces SET settings = $2::jsonb, updated_at = now() WHERE id = $1 RETURNING settings",
      [workspaceId, JSON.stringify(validated)]
    );
    await client.query("COMMIT");
    return saved.rows[0].settings;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

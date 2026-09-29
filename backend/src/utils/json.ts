export const extractJSONObject = (text: string): string => {
  let clean = text.trim();
  clean = clean.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }
  clean = clean.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  return clean;
};

export const parseJsonOrThrow = <T>(text: string, context: string): T => {
  try {
    const jsonString = extractJSONObject(text);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON for ${context}: ${details}`);
  }
};


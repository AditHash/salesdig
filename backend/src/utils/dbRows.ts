export const mapDbRow = <T = Record<string, any>>(row?: Record<string, any>): T | null => {
  if (!row) return null;
  const mapped = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value])
  );
  if (typeof mapped.id === "string") mapped._id = mapped.id;
  return mapped as T;
};

export const mapDbRows = <T = Record<string, any>>(rows: Record<string, any>[]): T[] =>
  rows.map(row => mapDbRow<T>(row)!);

/**
 * JSON-safe clone that stringifies bigint amounts.
 */
export function serializePayroll(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serializePayroll);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, serializePayroll(nested)]),
    );
  }
  return value;
}

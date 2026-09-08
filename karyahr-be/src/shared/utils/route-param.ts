import { ValidationError } from "../errors/app-error";

/**
 * Reads a single Express route param. Express 5 types params as `string | string[]`.
 */
export function routeParam(
  value: string | string[] | undefined,
  name: string,
): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new ValidationError(`Invalid route parameter: ${name}`);
}

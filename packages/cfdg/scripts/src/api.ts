// #region D1 helpers

import { Address, State } from "cfdg/types/v1";
import { STATES } from "cfdg/types/v1/constants";

/**
 * Normalizes a string value by converting it to a string and trimming whitespace.
 * @param value - The value to normalize.
 * @param limit - An optional limit for the string length. Must be a positive number. If provided, the string will be truncated to this length.
 * @returns The normalized string.
 */
export function normalizeString(value: unknown, limit?: number): string {
  if (limit !== undefined && limit > 0)
    return String(value ?? "")
      .trim()
      .slice(0, limit);
  return String(value ?? "").trim();
}

/**
 * Normalizes a number value by converting it to a number and ensuring it is finite.
 * @param value - The value to normalize.
 * @param min - An optional minimum value. If provided, the normalized number will not be less than this value.
 * @param max - An optional maximum value. If provided, the normalized number will not be greater than this value.
 * @returns The normalized number, or 0 if the value is not finite.
 */
export function normalizeNumber(
  value: unknown,
  min?: number,
  max?: number,
): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

/**
 * Normalizes a boolean value by checking if it is true, the string 'true', or the number 1.
 * @param value - The value to normalize.
 * @returns The normalized boolean value.
 */
export function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "true" || normalizeNumber(value) === 1;
}

/**
 * Normalizes an array of values by converting each entry to a string, trimming whitespace, and filtering out any empty strings. If the input value is not an array, it returns an empty array.
 * @param value - The value to normalize.
 * @returns The normalized array of strings.
 */
export function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => normalizeString(entry)).filter(Boolean)
    : [];
}

/**
 * Normalizes a JSON string by parsing it into an object of type T. Returns null if parsing fails.
 * @param value - The JSON string to normalize.
 * @returns The parsed object of type T, or null if parsing fails.
 */
export function normalizeJson<T>(value: unknown): T | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Normalizes a value by converting it to a string, trimming whitespace, and matching it against an array of allowed values. If no match is found, it returns a default value.
 * @param value - The value to normalize.
 * @param allowedValues - An array of allowed values.
 * @param defaultValue - The default value to return if no match is found.
 * @example
 * ```ts
 * const status = normalizeType('pending', ['pending', 'succeeded', 'failed'], 'pending');
 * ```
 * @returns The normalized value.
 */
export function normalizeType<T>(
  value: unknown,
  allowedValues: readonly T[],
  defaultValue: T,
): T {
  const normalized = normalizeString(value).toLowerCase();
  const matched = allowedValues.find((candidate) => candidate === normalized);
  return matched ?? defaultValue;
}

/**
 * Converts a set of address components into an Address object. If any of the components are invalid, it returns null.
 * @param line1 - The first line of the address.
 * @param line2 - The second line of the address.
 * @param city - The city of the address.
 * @param state - The state of the address.
 * @param postalCode - The postal code of the address.
 * @returns The normalized Address object, or null if any component is invalid.
 */
export function normalizeAddress(
  line1: unknown,
  line2: unknown,
  city: unknown,
  state: unknown,
  postalCode: unknown,
): Address | null {
  try {
    return {
      line1: normalizeString(line1),
      line2: normalizeString(line2) || null,
      city: normalizeString(city),
      state: normalizeType<State>(
        state,
        Object.keys(STATES) as State[],
        "FL" as State,
      ),
      zip: normalizeString(postalCode),
    };
  } catch {
    return null;
  }
}

/**
 * Compacts a record by removing any keys with undefined, null, or empty string values. This is useful for cleaning up objects before serialization or storage.
 * @param record - The record to compact.
 * @returns A new record with only the keys that have defined, non-null, and non-empty string values.
 * @example
 * ```ts
 * const input = { a: 1, b: undefined, c: null, d: '', e: 'hello' }
 * const compacted = compactRecord(input)
 * // compacted will be { a: 1, e: 'hello' }
 * ```
 */
export function compactRecord<T extends Record<string, unknown>>(
  record: T,
): Partial<T> {
  const compacted: Partial<T> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined && value !== null && value !== "") {
      compacted[key as keyof T] = value as T[keyof T];
    }
  }
  return compacted;
}

/**
 * Converts a request body to an object of type T. If the body is a JSON string, it parses it; if it's already an object, it casts it.
 * @param body - The request body to convert.
 * @returns The converted object of type T, or null if the conversion fails.
 */
export function convertBodyToObject<T>(body: unknown): T | null {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as T;
    }
    catch {
      return null;
    }
  }
  if (typeof body === "object" && body !== null) {
    return body as T;
  }
  return null;
}

/**
 * Parses the JSON body of a Request object. If the Content-Type header is not 'application/json', it throws an error.
 * @param request - The Request object to parse.
 * @returns A promise that resolves to the parsed JSON object.
 * @throws {Error} If the Content-Type header is not 'application/json'.
 * @example
 * ```ts
 * const request = new Request('/api/data', { method: 'POST', body: JSON.stringify({ key: 'value' }), headers: { 'Content-Type': 'application/json' } });
 * const data = await parseJsonBody(request);
 * // data will be { key: 'value' }
 * ```
 */
export function parseJsonBody(request: Request): Promise<any> {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  return request.json();
}

/**
 * Checks whether a given value is a valid integer within an optional range. If the value is not a valid integer or falls outside the specified range, it returns null.
 * @param value - The value to validate.
 * @param min - An optional minimum value. If provided, the integer must be greater than or equal to this value.
 * @param max - An optional maximum value. If provided, the integer must be less than or equal to this value.
 * @returns The validated integer if it is valid and within the specified range; otherwise, null.
 */
export function validateInt(
  value: unknown,
  min?: number,
  max?: number,
): number | null {
  const num = Number(value);
  if (!Number.isInteger(num)) return null;
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;
  return num;
}

/**
 * Gets the current date and time as an ISO 8601 string. This function is useful for generating timestamps in a standardized format.
 * @returns The current date and time in ISO 8601 format.
 */
export function getIsoStringNow(): string {
  return new Date().toISOString();
}

export function formatAddress(address?: {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): string {
  if (!address) return "";
  const { line1, line2, city, state, postalCode, country } = address;
  const parts = [line1, line2, city, state, postalCode, country].filter(
    Boolean,
  );
  return parts.join(", ");
}
// #endregion

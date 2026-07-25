// #region D1 helpers

/** 
 * Normalizes a string value by converting it to a string and trimming whitespace.
 * @param value - The value to normalize.
 * @param limit - An optional limit for the string length. Must be a positive number. If provided, the string will be truncated to this length.
 * @returns The normalized string.
 */
export function normalizeString(value: unknown, limit?: number): string {
    if (limit !== undefined && limit > 0)
        return String(value ?? '').trim().slice(0, limit);
  return String(value ?? '').trim();
}

/** 
 * Normalizes a number value by converting it to a number and ensuring it is finite.
 * @param value - The value to normalize.
 * @param min - An optional minimum value. If provided, the normalized number will not be less than this value.
 * @param max - An optional maximum value. If provided, the normalized number will not be greater than this value.
 * @returns The normalized number, or 0 if the value is not finite.
 */
export function normalizeNumber(value: unknown, min?: number, max?: number): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

/**
 * Normalizes an array of values by converting each entry to a string, trimming whitespace, and filtering out any empty strings. If the input value is not an array, it returns an empty array.
 * @param value - The value to normalize.
 * @returns The normalized array of strings.
 */
export function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => normalizeString(entry)).filter(Boolean) : [];
}

/**
 * Normalizes a boolean value by checking if it is true, the string 'true', or the number 1.
 * @param value - The value to normalize.
 * @returns The normalized boolean value.
 */
export function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 'true' || normalizeNumber(value) === 1;
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
export function normalizeType<T>(value: unknown, allowedValues: readonly T[], defaultValue: T): T {
  const normalized = normalizeString(value).toLowerCase();
  const matched = allowedValues.find((candidate) => candidate === normalized);
  return matched ?? defaultValue;
}

// #endregion
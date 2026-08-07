/**
 * Generates a UUID (Universally Unique Identifier) using the Web Crypto API.
 * @param includeHyphens - Whether to include hyphens in the UUID. Format is 8-4-4-4-12.
 * @param length - Optional length of the UUID. If not provided, a standard 256-bit UUID will be generated.
 * @returns A string representing the generated UUID.
 */
export function generateUUID(
  format: "128bit" | "256bit" = "256bit",
  includeHyphens: boolean = true,
): string {
  // Generate a 256-bit UUID using crypto.getRandomValues
  const array = new Uint8Array(format === "128bit" ? 16 : 32); // 16 bytes = 128 bits, 32 bytes = 256 bits
  crypto.getRandomValues(array);
  let hexString = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (includeHyphens) {
    if (format === "128bit") {
      // Insert hyphens at standard UUID positions (8-4-4-4-12)
      hexString = `${hexString.slice(0, 8)}-${hexString.slice(8, 12)}-${hexString.slice(12, 16)}-${hexString.slice(16, 20)}-${hexString.slice(20)}`;
    } else {
      // Insert hyphens at standard UUID positions (8-4-4-16)
      hexString = `${hexString.slice(0, 8)}-${hexString.slice(8, 12)}-${hexString.slice(12, 16)}-${hexString.slice(16)}`;
    }
  }
  return hexString;
}

/**
 * Generate a random string of specified length using the Web Crypto API.
 * @param length - The length of the random string to generate.
 * @returns A random string of the specified length.
 */
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

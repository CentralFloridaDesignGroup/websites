// Utility scripts and helpers
// Add shared utility functions here

export * as Dates from "./dates";
export * as Numbers from "./numbers";
export * as Calculator from "./calculator";
export * as Geodesy from "./geodesy";

export {
  compileClasses,
  isRequired,
  getRequiredMessage,
  getRegexPattern,
  getRegexMessage,
  classValueToString,
} from "./ui";

export {
  normalizeString,
  normalizeNumber,
  normalizeStringArray,
  normalizeBoolean,
  normalizeJson,
  normalizeType,
  normalizeAddress,
  compactRecord,
  convertBodyToObject,
  parseJsonBody,
  validateInt,
  getIsoStringNow,
  formatAddress,
} from "./api";

export { generateUUID, generateRandomString } from "./crypto";

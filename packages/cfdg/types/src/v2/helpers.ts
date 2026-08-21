import { STATES } from "./constants";
import type { Address, State } from "./common";

export function normalizeString(value: unknown, limit?: number): string { return String(value ?? "").trim().slice(0, limit); }
export function normalizeNumber(value: unknown, typeOrMin?: "int" | "float" | number, max?: number): number { const parsed = Number(value ?? 0); if (!Number.isFinite(parsed)) return 0; if (typeof typeOrMin === "number") return Math.max(typeOrMin, Math.min(max ?? Infinity, parsed)); return typeOrMin === "int" ? Math.floor(parsed) : parsed; }
export function normalizeBoolean(value: unknown): boolean { return value === true || value === "true" || normalizeNumber(value) === 1; }
export function normalizeJson<T>(value: unknown): T | null { try { return typeof value === "string" ? JSON.parse(value) as T : null; } catch { return null; } }
export function normalizeType<T>(value: unknown, allowed: readonly T[], fallback: T): T { return allowed.find((item) => item === normalizeString(value).toLowerCase()) ?? fallback; }
export function normalizeAddress(line1: unknown, line2: unknown, city: unknown, state: unknown, postalCode: unknown): Address { return { line1: normalizeString(line1), line2: normalizeString(line2) || null, city: normalizeString(city), state: normalizeType<State>(state, Object.keys(STATES) as State[], "FL" as State), zip: normalizeString(postalCode) }; }

import { STATES } from "./constants";

export type State = keyof typeof STATES;
export type Address = { line1: string; line2: string | null; city: string; state: State; zip: string };
export type R2FileRecord = { id: string; key: string; name: string; description: string | null; type: string; sizeBytes: number; active: boolean; createdTime: string; updatedTime: string; createdBy: string; updatedBy: string };
export type Unknown<T> = { [K in keyof T]: unknown };
export type UnknownPartial<T> = { [K in keyof T]?: unknown };

import { STATES } from "./constants";

export type State = keyof typeof STATES;

/** A physical mailing address. */
export type Address = {
  /** Street address line 1. */
  line1: string;
  /** Street address line 2. Typically optional. */
  line2: string | null;
  /** City name. */
  city: string;
  /** State or province code. */
  state: State;
  /** Postal or ZIP code. */
  zip: string;
};

/** A common representation of a file stored in R2. */
export type R2FileRecord = {
    /** The unique identifier of the file in R2. */
    id: string;
    /** The R2 key of the file. */
    key: string;
    /** The name of the file. */
    name: string;
    /** A brief description of the file. */
    description: string | null;
    /** The MIME type of the file. */
    type: string;
    /** The size of the file in bytes. */
    sizeBytes: number;
    /** Whether the file is active. */
    active: boolean;
    /** The time the file was created. */
    createdTime: string;
    /** The time the file was last updated. */
    updatedTime: string;
    /** The user who created the file. */
    createdBy: string;
    /** The user who last updated the file. */
    updatedBy: string;
}

/** A type that maps all properties of T to unknown. */
export type Unknown<T> = {
  [K in keyof T]: unknown;
}

/** A type that maps all properties of T to unknown, but allows for partial objects. */
export type UnknownPartial<T> = {
  [K in keyof T]?: unknown;
}

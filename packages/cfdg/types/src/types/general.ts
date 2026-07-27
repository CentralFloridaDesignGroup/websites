import { STATES } from "../constants";

export type State = keyof typeof STATES

/** Generic Address type */
export type Address = {
  /** Street address line 1. */
  line1: string;
  /** Street address line 2. Typically optional */
  line2: string;
  /** City name. */
  city: string;
  /** State or province code. */
  state: State;
  /** Postal or ZIP code. */
  postalCode: string;
};
/** V1 history entry for a calculation */
export interface HistoryEntry {
  /** Unique identifier for the history entry */
  id: string;
  /** Timestamp of when the calculation was performed */
  time: string;
  /** The equation that was calculated */
  equation: string;
  /** The result of the calculation */
  result: string;
}

/** Result of a calculation */
export interface CalculationResult {
  /** Indicates whether the calculation was successful */
  success: boolean;
  /** The result of the calculation, if successful */
  value?: number;
  /** An error message, if the calculation failed */
  error?: string;
}

/** Validation error for a specific field */
export interface ValidationError {
  /** The name of the field that has the validation error */
  field: string;
  /** The validation error message */
  message: string;
}

export interface HistoryEntry {
  id: string;
  time: string;
  equation: string;
  result: string;
}

export interface CalculationResult {
  success: boolean;
  value?: number;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
import { HistoryEntry } from "cfdg/types/v1";

/** Shared key press event type @deprecated This module is being sunset. Migrate to new home before this is deleted. */
type KeyPressEvent = {
  key: string;
  preventDefault: () => void;
};

/**
 * Format current time as HH:MM:SS
 * @deprecated This module is being sunset. Migrate to new home before this is deleted.
 */
export function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit", 
    second: "2-digit",
    hour12: false 
  });
}

/**
 * Handle Enter key press to trigger calculation
 * @deprecated This module is being sunset. Migrate to new home before this is deleted.
 */
export function handleKeyPress(event: KeyPressEvent, callback: () => void): void {
  if (event.key === "Enter") {
    event.preventDefault();
    callback();
  }
}

/**
 * Export history to CSV file
 * @deprecated This module is being sunset. Migrate to new home before this is deleted.
 */
export function exportHistoryToCSV(history: HistoryEntry[], filename: string): void {
  const globalScope = globalThis as {
    alert?: (message?: string) => void;
    document?: {
      body?: { appendChild: (node: unknown) => void; removeChild: (node: unknown) => void };
      createElement: (tagName: string) => {
        setAttribute: (name: string, value: string) => void;
        style: { visibility: string };
        click: () => void;
      };
    };
    URL?: {
      createObjectURL?: (blob: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };
  };

  // Check if we're in a browser-like environment
  if (!globalScope.document) {
    console.error("exportHistoryToCSV can only be used in a browser environment");
    return;
  }

  if (history.length === 0) {
    if (typeof globalScope.alert === "function") {
      globalScope.alert("No history to export");
    }
    return;
  }

  // Create CSV content
  const headers = ["Time", "Equation", "Result"];
  const rows = history.map(entry => [
    entry.time,
    entry.equation,
    entry.result
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  const documentRef = globalScope.document;
  const urlRef = globalScope.URL;

  if (!documentRef.body) {
    console.error("document.body is not available");
    return;
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = documentRef.createElement("a");
  
  // Check if URL.createObjectURL is available
  if (!urlRef || typeof urlRef.createObjectURL !== "function") {
    console.error("URL.createObjectURL is not available");
    return;
  }
  
  const url = urlRef.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  documentRef.body.appendChild(link);
  link.click();
  documentRef.body.removeChild(link);
  
  // Clean up the object URL
  if (typeof urlRef.revokeObjectURL === "function") {
    urlRef.revokeObjectURL(url);
  }
}

/**
 * Generate unique ID for history entries
 * @deprecated This module is being sunset. Migrate to new home before this is deleted.
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

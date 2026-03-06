import { useState, useEffect } from "react";
import { Button, Textbox } from "@wps/input";
import { Trash2 } from "lucide-react";
import { Calculator, type HistoryEntry } from "@wps/scripts";
import { showNotification } from "@wps/layout";

/**
 * Invert Calculator Component
 * Calculates invert elevation from rim elevation, measure down distance, and measure angle
 */
export function InvertCalculator(): React.JSX.Element {

  // Form state
  const [rimElevation, setRimElevation] = useState<string>("");
  const [measureDown, setMeasureDown] = useState<string>("");
  const [measureAngle, setMeasureAngle] = useState<string | null>("");
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    document.title = "Invert Calculator - The Compass"
  }, [])

  /**
   * Calculate invert elevation
   * Formula: Invert = Rim - (MeasureDown / cos(Angle))
   * When angle is 0° (straight down), cos(0) = 1, so Invert = Rim - MeasureDown
   */
  const calculateInvert = () => {

    // Validate basic information.
    const rim = parseFloat(rimElevation);
    const measure = parseFloat(measureDown);

    // Validate parsed values
    if (isNaN(rim) || isNaN(measure)) {
      showNotification({
        title: "Input Error",
        body: "Please enter valid numbers",
        style: "danger",
      });
      return;
    }

    // Validate measure down is positive
    if (measure <= 0) {
      showNotification({
        title: "Input Error",
        body: <p><strong>Measure Down Distance</strong> must be positive and above 0.</p>,
        style: "danger",
      });
      return;
    }

    // Check if angle exists. If it doesn't, assume 0 (plumb straight down)

    const angle = measureAngle ? parseFloat(measureAngle) : 0;

    // Convert angle to radians
    const angleRadians = (angle * Math.PI) / 180;

    // Calculate vertical distance
    // If angle is 0 (straight down), cos(0) = 1, so verticalDistance = measure
    // If angle > 0 (measuring at angle), we need to account for the slope
    const cosAngle = Math.cos(angleRadians);

    // Prevent division by zero or very small values
    if (Math.abs(cosAngle) < 0.0001) {
      showNotification({
        title: "Input Error",
        body: "Angle is too close to 90 degrees - invalid for invert calculation",
        style: "danger",
      });
      return;
    }

    const verticalDistance = measure * cosAngle;

    // Calculate invert elevation
    const invertElevation = rim - verticalDistance;

    // Create equation string
    let equation: string;
    if (angle === 0) {
      equation = `${Calculator.formatNumber(rim)} - ${Calculator.formatNumber(measure)}`;
    } else {
      equation = `${Calculator.formatNumber(rim)} - (${Calculator.formatNumber(measure)} * cos(${Calculator.formatNumber(angle)}°))`;
    }

    // Add to history
    const newEntry: HistoryEntry = {
      id: Calculator.generateId(),
      time: Calculator.formatTime(),
      equation: equation,
      result: Calculator.formatNumber(invertElevation),
    };

    setHistory([...history, newEntry]);

    // Clear the inputs by updating state - Textbox will sync automatically
    setMeasureDown("");
    setMeasureAngle("");

    // Focus back on Measure Down input for quick entry
    const measureDownInput = document.querySelector<HTMLInputElement>('input[name="measureDown"]') as HTMLInputElement;
    measureDownInput?.focus();
  };

  /**
   * Clear form inputs
   */
  const clearForm = () => {
    setRimElevation("");
    setMeasureDown("");
    setMeasureAngle("");
  };

  /**
   * Clear calculation history
   */
  const clearHistory = () => {
    if (history.length === 0) {
      showNotification({
        title: "History",
        body: "History is already empty",
        style: "info",
      });
      return;
    }
    if (confirm("Are you sure you want to clear all history?")) {
      setHistory([]);
    }
  };

  /**
   * Delete a single history entry
   */
  const deleteHistoryEntry = (id: string) => {
    setHistory(history.filter((entry) => entry.id !== id));
  };

  /**
   * Export history to CSV
   */
  const exportHistory = () => {
    Calculator.exportHistoryToCSV(history, `invert-calculator-history-${Date.now()}.csv`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className={`mb-6 p-4 border-l-4 ${showInstructions ? 'block border-nile-blue bg-nile-blue/10' : 'hidden'}`} >
        <h1 className="text-3xl font-bold text-nile-blue">Instructions</h1>
        <p className="text-gray-700 mt-2">Calculate the invert elevation based on rim elevation, measure down distance, and measure angle.</p>
        <ul className="list-disc list-inside mt-2 text-gray-700">
          <li>Enter the <strong>Rim Elevation</strong> (top of the manhole or structure).</li>
          <li>Enter the <strong>Measure Down Distance</strong> (distance from rim to invert along the pipe centerline).</li>
          <li>Optionally, enter the <strong>Measure Angle</strong> (angle from plumb). If left blank, it is assumed to be 0° (straight down).</li>
          <li>Click <strong>Calculate</strong> to compute the invert elevation and add it to the history.</li>
          <li>Use the <strong>Export History</strong> button to download your calculations as a CSV file.</li>
        </ul>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Input Form */}
        <div className="md:col-span-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold mb-4 text-nile-blue">Invert Calculator</h2>
            <Button
              label={showInstructions ? "Hide Instructions" : "Show Instructions"}
              style={showInstructions ? "secondary" : "primary"}
              size="small"
              onClick={() => setShowInstructions(!showInstructions)}
            />
          </div>
          <div className="space-y-4">
            <Textbox
              field="rimElevation"
              label="Rim Elevation"
              type="number"
              placeholder="0.00"
              defaultValue={rimElevation}
              onValidChange={(_, value) => setRimElevation(value)}
            />

            <Textbox
              field="measureDown"
              label="Measure Down Distance"
              type="number"
              placeholder="0.00"
              defaultValue={measureDown}
              onValidChange={(_, value) => setMeasureDown(value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  calculateInvert();
                }
              }}
            />

            <Textbox
              field="measureAngle"
              label="Measure Angle (degrees from plumb)"
              type="number"
              placeholder="0.00"
              defaultValue={measureAngle ?? ""}
              onValidChange={(_field, value) => setMeasureAngle(value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  calculateInvert();
                }
              }}
            />

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                label="Calculate"
                style="primary"
                onClick={calculateInvert}
              />
              <Button
                label="Clear"
                style="secondary"
                onClick={clearForm}
              />
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="md:col-span-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-nile-blue">History</h3>
            <div className="flex gap-2">
              <Button
                label="Export History"
                style="secondary"
                size="small"
                onClick={exportHistory}
              />
              <Button
                label="Clear History"
                style="danger"
                size="small"
                onClick={clearHistory}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead className="bg-mercury">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-nile-blue hidden md:table-cell w-[10%]">
                    Time
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-nile-blue w-[55%]">
                    Equation
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-nile-blue w-[25%]">
                    Result
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-nile-blue w-16">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No calculations yet. Enter values and click Calculate to begin.
                    </td>
                  </tr>
                ) : (
                  history.map((entry) => (
                    <tr key={entry.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm hidden md:table-cell">{entry.time}</td>
                      <td className="px-4 py-2 text-sm">{entry.equation}</td>
                      <td className="px-4 py-2 text-sm font-semibold">{entry.result}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => deleteHistoryEntry(entry.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          aria-label="Delete entry"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .container {
            max-width: 100%;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

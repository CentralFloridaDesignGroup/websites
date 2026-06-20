import { useState, useEffect } from "react";
import { Button, Textbox, Checkbox } from "@wps/input";
import { Trash2 } from "lucide-react";
import { Calculator, type HistoryEntry } from "@wps/scripts";
import { showNotification } from "@wps/layout";

/**
 * Slope Calculator Component
 * Calculates slope percentage from start elevation, end elevation, and 2D distance
 */
export function SlopeCalculator(): React.JSX.Element {
  // Form state
  const [startElevation, setStartElevation] = useState<string>("");
  const [endElevation, setEndElevation] = useState<string>("");
  const [distance2D, setDistance2D] = useState<string>("");
  const [absoluteCalc, setAbsoluteCalc] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);



  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    document.title = "Slope Calculator - The Compass";
  }, []);

  /**
   * Calculate slope percentage
   */
  const calculateSlope = () => {
    // Validate all inputs are filled
    if (!startElevation || !endElevation || !distance2D) {
      showNotification({
        title: "Input Error",
        body: "Please fill in all fields",
        style: "danger",
      });
      return;
    }

    const start = parseFloat(startElevation);
    const end = parseFloat(endElevation);
    const dist = parseFloat(distance2D);

    // Validate parsed values
    if (isNaN(start) || isNaN(end) || isNaN(dist)) {
      showNotification({
        title: "Input Error",
        body: "Please enter valid numbers",
        style: "danger",
      });
      return;
    }

    // Prevent division by zero
    if (dist === 0) {
      showNotification({
        title: "Input Error",
        body: "Distance cannot be zero",
        style: "danger",
      });
      return;
    }

    // Calculate slope
    const elevationChange = start - end; // Note: slope formula uses (start - end) so positive slope indicates a decline
    let slope = (elevationChange / dist) * 100;

    // Apply absolute value if checkbox is selected
    if (absoluteCalc) {
      slope = Math.abs(slope);
    }

    // Create equation string
    const equation = absoluteCalc
      ? `|${Calculator.formatNumber(start)} - ${Calculator.formatNumber(end)}| / ${Calculator.formatNumber(dist)} × 100`
      : `(${Calculator.formatNumber(start)} - ${Calculator.formatNumber(end)}) / ${Calculator.formatNumber(dist)} × 100`;

    // Add to history
    const newEntry: HistoryEntry = {
      id: Calculator.generateId(),
      time: Calculator.formatTime(),
      equation: equation,
      result: `${Calculator.formatNumber(slope)}%`,
    };

    setHistory([...history, newEntry]);
  };

  /**
   * Clear form inputs
   */
  const clearForm = () => {
    setStartElevation("");
    setEndElevation("");
    setDistance2D("");
    setAbsoluteCalc(false);
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
    Calculator.exportHistoryToCSV(history, `slope-calculator-history-${Date.now()}.csv`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className={`mb-6 p-4 border-l-4 ${showInstructions ? "block border-nile-blue bg-nile-blue/10" : "hidden"}`}>
        <h2 className="text-xl font-bold mb-2 text-nile-blue">Instructions</h2>
        <p className="text-gray-800">
          The Slope Calculator computes slope percentage from a start elevation, end elevation, and 2D distance.
          Enter all values, then click "Calculate" to add the result to history. Enable "Absolute Slope Calculation"
          to report the slope magnitude without sign.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Input Form */}
        <div className="md:col-span-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold mb-4 text-nile-blue">Slope Calculator</h2>
            <Button
              label={showInstructions ? "Hide Instructions" : "Show Instructions"}
              style={showInstructions ? "secondary" : "primary"}
              size="small"
              onClick={() => setShowInstructions(!showInstructions)}
            />
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Textbox
                field="startElevation"
                label="Start Elevation"
                type="number"
                placeholder="0.00"
                defaultValue={startElevation}
                onValidChange={(_, value) => setStartElevation(value)}
              />
              
              <Textbox
                field="endElevation"
                label="End Elevation"
                type="number"
                placeholder="0.00"
                defaultValue={endElevation}
                onValidChange={(_, value) => setEndElevation(value)}
              />
            </div>

            <Textbox
              field="distance2D"
              label="2D Distance"
              type="number"
              placeholder="0.00"
              defaultValue={distance2D}
              onValidChange={(_, value) => setDistance2D(value)}
            />

            <div className="pt-2">
              <Checkbox
                id="absoluteCalc"
                type="switch"
                label="Absolute Slope Calculation"
                checked={absoluteCalc}
                onChange={(e) => setAbsoluteCalc(e.target.checked)}
              />
              <p className="text-sm text-gray-600 mt-1">
                Toggle off for relative slope, on for absolute slope
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                label="Calculate"
                style="primary"
                onClick={calculateSlope}
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

import { useState, useEffect } from "react";
import { Button, Textbox } from "@wps/input";
import { Trash2 } from "lucide-react";
import { Calculator, type HistoryEntry } from "@wps/scripts";
import { showNotification } from "@wps/layout";

/**
 * Prorate Calculator Component
 * Calculates end elevation from start elevation, 2D distance, slope, and direction
 */
export function ProrateCalculator(): React.JSX.Element {

  // Form state
  const [startElevation, setStartElevation] = useState<string>("");
  const [distance2D, setDistance2D] = useState<string>("");
  const [slope, setSlope] = useState<string>("");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [showInstructions, setShowInstructions] = useState<boolean>(false);



  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Set breadcrumbs on mount
  useEffect(() => {
    document.title = "Prorate Calculator - The Compass";
  }, []);

  /**
   * Calculate end elevation based on prorate
   */
  const calculateProrate = () => {
    // Validate all inputs are filled
    if (!startElevation || !distance2D || !slope) {
      showNotification({
        title: "Input Error",
        body: "Please fill in all fields",
        style: "danger",
      });
      return;
    }

    const start = parseFloat(startElevation);
    const dist = parseFloat(distance2D);
    const slopePercent = parseFloat(slope);

    // Validate parsed values
    if (isNaN(start) || isNaN(dist) || isNaN(slopePercent)) {
      showNotification({
        title: "Input Error",
        body: "Please enter valid numbers",
        style: "danger",
      });
      return;
    }

    // Prevent invalid distance
    if (dist === 0) {
      showNotification({
        title: "Input Error",
        body: "Distance cannot be zero",
        style: "danger",
      });
      return;
    }

    // Calculate elevation change
    const elevationChange = (dist * slopePercent) / 100;

    // Calculate end elevation based on direction
    const endElevation = direction === "up"
      ? start + elevationChange
      : start - elevationChange;

    // Create equation string
    const operator = direction === "up" ? "+" : "-";
    const equation = `${Calculator.formatNumber(start)} ${operator} (${Calculator.formatNumber(dist)} × ${Calculator.formatNumber(slopePercent)}% / 100)`;

    // Add to history
    const newEntry: HistoryEntry = {
      id: Calculator.generateId(),
      time: Calculator.formatTime(),
      equation: equation,
      result: Calculator.formatNumber(endElevation),
    };

    setHistory([...history, newEntry]);
  };

  /**
   * Clear form inputs
   */
  const clearForm = () => {
    setStartElevation("");
    setDistance2D("");
    setSlope("");
    setDirection("up");
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
    Calculator.exportHistoryToCSV(history, `prorate-calculator-history-${Date.now()}.csv`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className={`mb-6 p-4 border-l-4 ${showInstructions ? "block border-nile-blue bg-nile-blue/10" : "hidden"}`}>
        <h2 className="text-xl font-bold mb-2 text-nile-blue">Instructions</h2>
        <p className="text-gray-800">
          The Prorate Calculator helps you determine the end elevation based on a starting elevation, 2D distance, slope percentage, and direction (up or down).
          Simply enter the required values and click "Calculate" to see the result. Your calculations will be saved in the history section for future reference.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Input Form */}
        <div className="md:col-span-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold mb-4 text-nile-blue">Prorate Calculator</h2>
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
                onValidChange={(_field, value) => setStartElevation(value)}
              />

              <Textbox
                field="distance2D"
                label="2D Distance"
                type="number"
                placeholder="0.00"
                defaultValue={distance2D}
                onValidChange={(_field, value) => setDistance2D(value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="slope" className="block text-sm/6 font-medium text-gray-900 text-start">
                  Slope
                </label>
                <div className="flex items-baseline border-b border-gray-300 focus-within:border-primary focus-within:border-b-2 transition">
                  <input
                    id="slope"
                    type="number"
                    placeholder="0.00"
                    value={slope}
                    onChange={(e) => setSlope(e.target.value)}
                    className="block w-full bg-gray-50/20 py-1 text-gray-900 placeholder:text-gray-400 focus:outline-none border-0"
                  />
                  <span className="text-gray-400 pr-0.5 py-1">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prorate Direction
                </label>
                <div className="flex flex-row gap-2">
                  <div className="flex-1">
                    <Button
                      label="Up"
                      size="small"
                      style={direction === "up" ? "primary" : "secondary"}
                      onClick={() => setDirection("up")}
                      properties={{ classNames: "w-full" }}
                    />
                  </div>
                  <div className="flex-1">
                    <Button
                      label="Down"
                      size="small"
                      style={direction === "down" ? "primary" : "secondary"}
                      onClick={() => setDirection("down")}
                      properties={{ classNames: "w-full" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                label="Calculate"
                style="primary"
                onClick={calculateProrate}
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

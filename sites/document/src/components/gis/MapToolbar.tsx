import { Expand } from "lucide-react";
import type { BasemapMode } from "./types";

type MapToolbarProps = {
  currentUser: string;
  addModeActive: boolean;
  uploadPanelOpen: boolean;
  tablePanelOpen: boolean;
  basemapMode: BasemapMode;
  onToggleAddMode: () => void;
  onToggleUploadPanel: () => void;
  onToggleTablePanel: () => void;
  onBasemapChange: (mode: BasemapMode) => void;
  onZoomExtents: () => void;
};

export function MapToolbar({
  currentUser,
  addModeActive,
  uploadPanelOpen,
  tablePanelOpen,
  basemapMode,
  onToggleAddMode,
  onToggleUploadPanel,
  onToggleTablePanel,
  onBasemapChange,
  onZoomExtents,
}: MapToolbarProps) {
  return (
    <div
      className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] justify-center left-2 right-2 z-[500] flex flex-col md:flex-row items-center gap-2 overflow-x-auto rounded-xl border border-slate-300 bg-white/95 p-2 shadow-md backdrop-blur sm:absolute sm:bottom-auto sm:left-auto sm:right-4 sm:top-2 sm:max-w-[calc(100%-1rem)] sm:rounded-md sm:bg-white sm:backdrop-blur-0 dark:bg-gray-700`}
    >
      <div
        className={`isolate inline-flex ${currentUser !== "unknown-user" && "border-b border-slate-300 pb-2 md:border-r md:border-b-0 md:pb-0 md:pr-3"}`}
      >
        <button
          type="button"
          className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 focus:z-10 cursor-pointer ${basemapMode === "street" ? "bg-primary text-white" : "bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500/50"}`}
          onClick={() => onBasemapChange("street")}
        >
          Street
        </button>
        <button
          type="button"
          className={`relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 focus:z-10 cursor-pointer ${basemapMode === "satellite" ? "bg-primary text-white" : "bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500/50"}`}
          onClick={() => onBasemapChange("satellite")}
        >
          Satellite
        </button>
        <button
          type="button"
          className="relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 focus:z-10 cursor-pointer bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500/50"
          onClick={onZoomExtents}
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>
      {currentUser !== "unknown-user" && (
        <div className={`isolate inline-flex pt-0`}>
          <button
            type="button"
            className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 focus:z-10 cursor-pointer border-r border-slate-300 ${addModeActive ? "bg-primary text-white" : "bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500/50"}`}
            onClick={onToggleAddMode}
          >
            {addModeActive ? "Cancel Add" : "Add Point"}
          </button>
          <button
            type="button"
            className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 focus:z-10 cursor-pointer ${uploadPanelOpen ? "bg-primary text-white" : "bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500/50"}`}
            onClick={onToggleUploadPanel}
          >
            {uploadPanelOpen ? "Cancel Upload" : "Upload CSV"}
          </button>
          <button
            type="button"
            className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 focus:z-10 cursor-pointer border-l border-slate-300 ${tablePanelOpen ? "bg-primary text-white" : "bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500/50"}`}
            onClick={onToggleTablePanel}
          >
            {tablePanelOpen ? "Close Table" : "Table Edit"}
          </button>
        </div>
      )}
    </div>
  );
}

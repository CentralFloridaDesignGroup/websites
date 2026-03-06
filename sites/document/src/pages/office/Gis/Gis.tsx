import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import {
  AddPointPanel,
  BulkEditTablePanel,
  EditPointPanel,
  GisDisclaimer,
  GisMap,
  MapToolbar,
  UploadPanel,
  useGisRecords,
  type BasemapMode,
  type CreateGisRecordInput,
  type GisRecord,
} from "../../../components/gis";

export default function GisMapPage() {
  const { accounts } = useMsal();
  const currentUser =
    accounts[0]?.name ?? accounts[0]?.username ?? "unknown-user";

  const {
    records,
    loading,
    error,
    selectedRecord,
    selectRecord,
    createRecord,
    updateRecord,
    importRecords,
    deleteRecord,
  } = useGisRecords(currentUser);

  const [addModeActive, setAddModeActive] = useState(false);
  const [basemapMode, setBasemapMode] = useState<BasemapMode>("street");
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tablePanelOpen, setTablePanelOpen] = useState(false);
  const [zoomExtentsTrigger, setZoomExtentsTrigger] = useState(0);

  useEffect(() => {
    document.title = "GIS - The Compass";
    if (currentUser === "unknown-user") {
      console.info("No user is logged in, GIS features limited to view-only mode.");
    };
  }, []);

  function onRequestEdit(record: GisRecord) {
    selectRecord(record.id);
    setEditOpen(true);
    setUploadOpen(false);
    setAddModeActive(false);
    setTablePanelOpen(false);
  }

  function onToggleAddMode() {
    setEditOpen(false);
    setUploadOpen(false);
    setTablePanelOpen(false);
    setAddModeActive((previous) => !previous);
  }

  function onToggleUploadPanel() {
    setAddModeActive(false);
    setEditOpen(false);
    setTablePanelOpen(false);
    setUploadOpen((previous) => !previous);
  }

  function onToggleTablePanel() {
    setAddModeActive(false);
    setEditOpen(false);
    setUploadOpen(false);
    setTablePanelOpen((previous) => !previous);
  }

  async function onSaveNewPoint(input: CreateGisRecordInput) {
    await createRecord(input);
    setAddModeActive(false);
  }

  async function onSaveEditedPoint(input: Parameters<typeof updateRecord>[0]) {
    await updateRecord(input);
  }

  return (
    <section className="w-full">
      <div className="relative h-screen min-h-0 overflow-hidden bg-slate-100 sm:min-h-[560px]">
        {loading ? (
          <div className="absolute inset-0 z-[650] flex items-center justify-center bg-slate-700/80 backdrop-blur-[2px]">
            <div className="rounded-xl bg-white p-8 shadow-xl flex flex-col items-center">
              <p className="mb-4 text-lg font-medium text-slate-700">Loading GIS data</p>
              <p className="mb-4 text-slate-500">Please wait...</p>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="absolute left-4 top-4 z-[650] max-w-md rounded bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
            {error}
          </div>
        ) : null}

        <GisMap
          currentUser={currentUser}
          records={records}
          basemapMode={basemapMode}
          center={[28.5851, -81.4616]}
          zoomExtentsTrigger={zoomExtentsTrigger}
          onRequestEdit={onRequestEdit}
        />

        <MapToolbar
          currentUser={currentUser}
          addModeActive={addModeActive}
          uploadPanelOpen={uploadOpen}
          tablePanelOpen={tablePanelOpen}
          basemapMode={basemapMode}
          onToggleAddMode={onToggleAddMode}
          onToggleUploadPanel={onToggleUploadPanel}
          onToggleTablePanel={onToggleTablePanel}
          onBasemapChange={setBasemapMode}
          onZoomExtents={() => setZoomExtentsTrigger((n) => n + 1)}
        />

        <EditPointPanel
          isOpen={editOpen}
          record={selectedRecord}
          currentUser={currentUser}
          onClose={() => setEditOpen(false)}
          onSave={onSaveEditedPoint}
          onDelete={deleteRecord}
        />

        <AddPointPanel
          isOpen={addModeActive}
          currentUser={currentUser}
          onClose={() => {
            setAddModeActive(false);
          }}
          onSave={onSaveNewPoint}
        />

        <UploadPanel
          isOpen={uploadOpen}
          currentUser={currentUser}
          onClose={() => setUploadOpen(false)}
          onImport={importRecords}
        />

        <BulkEditTablePanel
          isOpen={tablePanelOpen}
          currentUser={currentUser}
          records={records}
          onClose={() => setTablePanelOpen(false)}
          onSave={onSaveEditedPoint}
        />

        <GisDisclaimer markdownFile="/documents/gis/disclaimer.md" title="White Point Surveying & Mapping LLC - GIS Disclaimer Acknowledgment"/>
      </div>
    </section>
  );
}

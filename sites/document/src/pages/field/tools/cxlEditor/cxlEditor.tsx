import { useEffect, useState } from "react";
import { Button, Textbox } from "cfdg/input";
import { GisDisclaimer } from "../../../../components/gis";
import { Plus, Pencil, Copy, Trash2, Download, AlertTriangle, Mail } from "lucide-react";
import { CodeFormModal } from "./CodeFormModal";
import { type CodeEntry, newCodeEntry, SYMBOL_OPTIONS, DATASET_TYPE_OPTIONS } from "./types";
import { validateCodes, buildCxlXml, buildFilename } from "./cxlBuilder";

function symbolLabel(id: string): string {
  return SYMBOL_OPTIONS.find((s) => s.id === id)?.label ?? id;
}

function datasetTypeLabel(value: string): string {
  return DATASET_TYPE_OPTIONS.find((d) => d.value === value)?.key ?? value;
}

function cloneCode(code: CodeEntry): CodeEntry {
  return { ...code, fields: code.fields.map((f) => ({ ...f, values: [...f.values] })) };
}

export function CxlEditor() {
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [editingCode, setEditingCode] = useState<CodeEntry | null>(null);
  const [modalTitle, setModalTitle] = useState("Add Code");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    document.title = "CXL Code List Editor - The Compass";
  }, []);

  function openAddModal() {
    setModalTitle("Add Code");
    setEditingCode(newCodeEntry());
  }

  function openEditModal(code: CodeEntry) {
    setModalTitle(`Edit ${code.shortCode || "Code"}`);
    setEditingCode(cloneCode(code));
  }

  function closeModal() {
    setEditingCode(null);
  }

  function saveCode(code: CodeEntry) {
    setCodes((prev) => {
      const exists = prev.some((c) => c.id === code.id);
      return exists ? prev.map((c) => (c.id === code.id ? code : c)) : [...prev, code];
    });
    setEditingCode(null);
  }

  function duplicateCode(code: CodeEntry) {
    const copy = cloneCode(code);
    copy.id = crypto.randomUUID();
    copy.shortCode = code.shortCode ? `${code.shortCode}_COPY` : "";
    copy.fields = copy.fields.map((f) => ({ ...f, id: crypto.randomUUID() }));
    setCodes((prev) => [...prev, copy]);
  }

  function removeCode(code: CodeEntry) {
    if (!window.confirm(`Remove code "${code.shortCode || "(unnamed)"}"?`)) return;
    setCodes((prev) => prev.filter((c) => c.id !== code.id));
  }

  function handleGenerate() {
    const validationErrors = validateCodes(codes);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);

    const xml = buildCxlXml(listName, listDescription, codes);
    const filename = buildFilename(listName);
    const blob = new Blob([xml], { type: "application/xml" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <GisDisclaimer
        markdownFile="/documents/field/cxl-editor-disclaimer.md"
        cookieName="cxl-editor-disclaimer-acknowledged"
        title="CXL Code List Editor - Disclaimer"
      />

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-white">CXL Code List Editor</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Build a new CHC LandStar (.cxl) point-code library from scratch — add point codes, their
            attribute fields, and symbol styling, then download the finished file.
          </p>
        </div>
        <Button colorMode="auto"
          label="Report an Issue"
          icon={Mail}
          style="secondary"
          size="small"
          onClick={() => {
            window.location.href =
              "mailto:support@cfdgsoftware.com?subject=" +
              encodeURIComponent("CXL Code List Editor - Issue Report");
          }}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Code List Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textbox colorMode="auto"
            field="listName"
            label="List Name"
            value={listName}
            onValidChange={(_field, value) => setListName(value)}
            placeholder="e.g. Standard Boundary Codes"
          />
          <Textbox colorMode="auto"
            field="listDescription"
            label="Description (optional)"
            value={listDescription}
            onValidChange={(_field, value) => setListDescription(value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Point Codes</h2>
          <Button colorMode="auto" label="Add Code" icon={Plus} style="primary" size="medium" onClick={openAddModal} />
        </div>

        {codes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No codes yet. Click "Add Code" to create your first point code.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-4">Short Code</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Symbol</th>
                  <th className="py-2 pr-4">Fields</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {codes.map((code) => (
                  <tr key={code.id} className="text-gray-800 dark:text-gray-200">
                    <td className="py-2 pr-4 font-medium">{code.shortCode || "—"}</td>
                    <td className="py-2 pr-4">{code.description || "—"}</td>
                    <td className="py-2 pr-4">{code.category || "__no_category__"}</td>
                    <td className="py-2 pr-4">{datasetTypeLabel(code.datasetType)}</td>
                    <td className="py-2 pr-4">{symbolLabel(code.symbolStyleId)}</td>
                    <td className="py-2 pr-4">{code.fields.length}</td>
                    <td className="py-2 pr-4">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEditModal(code)}
                          className="text-gray-500 hover:text-primary dark:text-gray-400"
                          aria-label="Edit code"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateCode(code)}
                          className="text-gray-500 hover:text-primary dark:text-gray-400"
                          aria-label="Duplicate code"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeCode(code)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Remove code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-medium mb-2">
            <AlertTriangle className="w-5 h-5" />
            Fix the following before generating your file:
          </div>
          <ul className="list-disc pl-6 text-sm text-red-700 dark:text-red-300 space-y-1">
            {errors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. Generate</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Download the finished .cxl file, then import it into LandStar to test it before using it in
          the field.
        </p>
        <Button colorMode="auto" label="Download .cxl File" icon={Download} style="primary" size="medium" onClick={handleGenerate} />
      </div>

      {editingCode && (
        <CodeFormModal
          key={editingCode.id}
          title={modalTitle}
          isOpen={true}
          initialCode={editingCode}
          onSave={saveCode}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { Modal } from "cfdg/layout";
import { Button, Textbox, Checkbox } from "cfdg/input";
import { Plus, Trash2, X } from "lucide-react";
import {
  type CodeEntry,
  type FieldEntry,
  DATASET_TYPE_OPTIONS,
  FILED_TYPE_OPTIONS,
  ENTER_METHOD_OPTIONS,
  SYMBOL_OPTIONS,
  newFieldEntry,
} from "./types";

const selectClasses =
  "block w-full bg-gray-50/20 py-1 pl-2 text-gray-900 border-b border-gray-300 transition focus:border-primary focus:outline-none focus:border-primary focus:border-b-2 dark:bg-gray-700/75 dark:text-white dark:border-gray-600";

interface CodeFormModalProps {
  title: string;
  isOpen: boolean;
  initialCode: CodeEntry;
  onSave: (code: CodeEntry) => void;
  onClose: () => void;
}

export function CodeFormModal({ title, isOpen, initialCode, onSave, onClose }: CodeFormModalProps) {
  const [code, setCode] = useState<CodeEntry>(initialCode);
  const [error, setError] = useState<string | null>(null);

  function updateField(fieldId: string, patch: Partial<FieldEntry>) {
    setCode((c) => ({
      ...c,
      fields: c.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    }));
  }

  function addField() {
    setCode((c) => ({ ...c, fields: [...c.fields, newFieldEntry()] }));
  }

  function removeField(fieldId: string) {
    setCode((c) => ({ ...c, fields: c.fields.filter((f) => f.id !== fieldId) }));
  }

  function addFieldValue(fieldId: string, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCode((c) => ({
      ...c,
      fields: c.fields.map((f) =>
        f.id === fieldId && !f.values.includes(trimmed) ? { ...f, values: [...f.values, trimmed] } : f
      ),
    }));
  }

  function removeFieldValue(fieldId: string, value: string) {
    setCode((c) => ({
      ...c,
      fields: c.fields.map((f) =>
        f.id === fieldId ? { ...f, values: f.values.filter((v) => v !== value) } : f
      ),
    }));
  }

  function handleAccept() {
    if (!code.shortCode.trim()) {
      setError("Short code is required.");
      return;
    }
    if (!code.description.trim()) {
      setError("Description is required.");
      return;
    }
    setError(null);
    onSave(code);
  }

  return (
    <Modal
      title={title}
      isOpen={isOpen}
      onAccept={handleAccept}
      onClose={onClose}
      size="4xl"
      acceptText="Save Code"
    >
      <div className="space-y-6">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textbox colorMode="auto"
            field="shortCode"
            label="Short Code"
            required
            value={code.shortCode}
            onValidChange={(_field, value) => setCode((c) => ({ ...c, shortCode: value.toUpperCase() }))}
          />
          <Textbox colorMode="auto"
            field="category"
            label="Category (optional)"
            value={code.category}
            onValidChange={(_field, value) => setCode((c) => ({ ...c, category: value }))}
          />
        </div>

        <Textbox colorMode="auto"
          field="description"
          label="Description"
          required
          value={code.description}
          onValidChange={(_field, value) => setCode((c) => ({ ...c, description: value }))}
        />

        <div>
          <label className="mb-2 block text-sm/6 font-medium text-gray-900 dark:text-white">
            Feature Type
          </label>
          <div className="flex gap-6">
            {DATASET_TYPE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="datasetType"
                  checked={code.datasetType === option.value}
                  onChange={() => setCode((c) => ({ ...c, datasetType: option.value }))}
                />
                {option.key}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-sm/6 font-medium text-gray-900 dark:text-white">
              Symbol
            </label>
            <select
              className={selectClasses}
              value={code.symbolStyleId}
              onChange={(e) => setCode((c) => ({ ...c, symbolStyleId: e.target.value }))}
            >
              {SYMBOL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm/6 font-medium text-gray-900 dark:text-white">
              Symbol Color
            </label>
            <input
              type="color"
              value={code.symbolColor}
              onChange={(e) => setCode((c) => ({ ...c, symbolColor: e.target.value }))}
              className="h-9 w-full cursor-pointer border-b border-gray-300 bg-transparent dark:border-gray-600"
            />
          </div>
          <Textbox colorMode="auto"
            field="symbolSize"
            label="Symbol Size"
            type="number"
            value={String(code.symbolSize)}
            onValidChange={(_field, value) =>
              setCode((c) => ({ ...c, symbolSize: Number(value) || 1 }))
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm/6 font-medium text-gray-900 dark:text-white">
              Attribute Fields
            </label>
            <Button colorMode="auto" label="Add Field" icon={Plus} style="secondary" size="small" onClick={addField} />
          </div>

          <div className="space-y-4">
            {code.fields.map((field) => (
              <div
                key={field.id}
                className="border border-gray-200 dark:border-gray-600 rounded-md p-4 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                  <Textbox colorMode="auto"
                    field={`fieldName-${field.id}`}
                    label="Field Name"
                    required
                    value={field.fieldName}
                    onValidChange={(_f, value) => updateField(field.id, { fieldName: value.toUpperCase() })}
                  />
                  <div>
                    <label className="mb-2 block text-sm/6 font-medium text-gray-900 dark:text-white">
                      Type
                    </label>
                    <select
                      className={selectClasses}
                      value={field.filedType}
                      onChange={(e) =>
                        updateField(field.id, { filedType: e.target.value as FieldEntry["filedType"] })
                      }
                    >
                      {FILED_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm/6 font-medium text-gray-900 dark:text-white">
                      Entry Method
                    </label>
                    <select
                      className={selectClasses}
                      value={field.enterMethod}
                      onChange={(e) =>
                        updateField(field.id, { enterMethod: e.target.value as FieldEntry["enterMethod"] })
                      }
                    >
                      {ENTER_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Textbox colorMode="auto"
                    field={`fieldDefault-${field.id}`}
                    label="Default Value"
                    value={field.fieldDefaultValue}
                    onValidChange={(_f, value) => updateField(field.id, { fieldDefaultValue: value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Checkbox colorMode="auto"
                    label="Required"
                    checked={field.isRequired}
                    onChange={(e) => updateField(field.id, { isRequired: e.target.checked })}
                  />
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                    aria-label="Remove field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {field.enterMethod !== "0" && (
                  <FieldValueEditor
                    values={field.values}
                    onAdd={(value) => addFieldValue(field.id, value)}
                    onRemove={(value) => removeFieldValue(field.id, value)}
                  />
                )}
              </div>
            ))}

            {code.fields.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No attribute fields yet. Fields are optional — add one if this code should collect extra data.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function FieldValueEditor({
  values,
  onAdd,
  onRemove,
}: {
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    onAdd(draft);
    setDraft("");
  }

  return (
    <div>
      <label className="mb-2 block text-sm/6 font-medium text-gray-900 dark:text-white">
        Menu Options
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm px-2 py-1 rounded"
          >
            {value}
            <button type="button" onClick={() => onRemove(value)} aria-label={`Remove ${value}`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {values.length === 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">No options added yet.</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="Add option and press Enter"
          className="block w-full bg-gray-50/20 py-1 pl-2 text-gray-900 border-b border-gray-300 focus:border-primary focus:outline-none focus:border-b-2 dark:bg-gray-700/75 dark:text-white dark:border-gray-600"
        />
        <Button colorMode="auto" label="Add" style="secondary" size="small" onClick={commit} />
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { EntraUserAccount, Phase, PhaseBillType, PhaseCreatePayload, PhaseUpdatePayload } from "cfdg/types";
import { Edit3, Minus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { NorthstarButton, NorthstarDropdown, NorthstarTextbox } from "cfdg/ui/input";
import { createProjectPhase, deleteProjectPhase, fetchProjectPhases, updateProjectPhase } from "../../../api/projects";

const BILL_TYPES: Array<{ value: PhaseBillType; label: string }> = [
  { value: "fixedFee", label: "Fixed fee" },
  { value: "timeAndMaterials", label: "Time and Materials" },
  { value: "nonBillable", label: "Non-billable" },
];

type PhaseFormState = {
  parentId: string;
  phaseId: string;
  name: string;
  description: string;
  billType: PhaseBillType;
  active: boolean;
  billable: boolean;
  contractCost: string;
  retainerCost: string;
  projectManagerId: string;
};

const EMPTY_FORM: PhaseFormState = {
  parentId: "",
  phaseId: "",
  name: "",
  description: "",
  billType: "fixedFee",
  active: true,
  billable: true,
  contractCost: "0",
  retainerCost: "0",
  projectManagerId: "",
};

function getColorClass(label: string, value: number): string {
  switch (label) {
    case "Contract": return "text-blue-700 dark:text-blue-300";
    case "Retainer": return "text-purple-700 dark:text-purple-300";
    case "Billed": return "text-green-700 dark:text-green-300";
    case "Income": return value < 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300";
    default: return "text-neutral-950 dark:text-neutral-50";
  }
};

/** Renders and manages the phase tree for a Northstar project. */
export function ProjectPhaseSummary({ projectId, managers }: { projectId: string; managers: EntraUserAccount[] }) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PhaseFormState>(EMPTY_FORM);

  async function loadPhases() {
    setLoading(true);
    setError("");
    try {
      setPhases((await fetchProjectPhases(projectId)).phases);
    } catch (nextError: unknown) {
      setError(String(nextError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPhases(); }, [projectId]);

  const phaseOptions = useMemo(() => flattenPhases(phases), [phases]);
  const costSummary = useMemo(() => phases.reduce((summary, phase) => ({
    contractCost: summary.contractCost + phase.accounting.contractCost,
    retainerCost: summary.retainerCost + phase.accounting.retainerCost,
    billedAmount: summary.billedAmount + phase.accounting.billedAmount,
    incomeAmount: summary.incomeAmount + phase.accounting.incomeAmount,
  }), { contractCost: 0, retainerCost: 0, billedAmount: 0, incomeAmount: 0 }), [phases]);

  function openCreate(parentId = "") {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, parentId });
    setNotice("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(phase: Phase) {
    setEditingId(phase.id);
    setForm({
      parentId: phase.parentId || "",
      phaseId: phase.phaseId,
      name: phase.name,
      description: phase.description,
      billType: phase.billType,
      active: phase.active,
      billable: phase.billable,
      contractCost: String(phase.accounting.contractCost),
      retainerCost: String(phase.accounting.retainerCost),
      projectManagerId: phase.projectManagerId || "",
    });
    setNotice("");
    setError("");
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const contractCost = Number(form.contractCost);
    const retainerCost = Number(form.retainerCost);
    if (!Number.isFinite(contractCost) || contractCost < 0 || !Number.isFinite(retainerCost) || retainerCost < 0) {
      setError("Contract and retainer must be nonnegative amounts.");
      setSaving(false);
      return;
    }
    const billable = form.billType === "nonBillable" ? false : form.billable;
    try {
      if (editingId) {
        const payload: PhaseUpdatePayload = {
          phaseId: form.phaseId.trim(), name: form.name.trim(), description: form.description,
          billType: form.billType, active: form.active, billable,
          contractCost, retainerCost, projectManagerId: form.projectManagerId.trim() || null,
        };
        await updateProjectPhase(projectId, editingId, payload);
        setNotice("Phase updated.");
      } else {
        const payload: PhaseCreatePayload = {
          parentId: form.parentId || null, phaseId: form.phaseId.trim(), name: form.name.trim(), description: form.description,
          billType: form.billType, active: form.active, billable,
          contractCost, retainerCost, projectManagerId: form.projectManagerId.trim() || null,
        };
        await createProjectPhase(projectId, payload);
        setNotice("Phase created.");
      }
      setFormOpen(false);
      await loadPhases();
    } catch (nextError: unknown) {
      setError(String(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function deletePhase(phase: Phase) {
    if (!window.confirm(`Hide ${phase.phaseId} and all of its child phases from the summary?`)) return;
    setSaving(true);
    setError("");
    try {
      await deleteProjectPhase(projectId, phase.id);
      setNotice("Phase hidden from the summary.");
      await loadPhases();
    } catch (nextError: unknown) {
      setError(String(nextError));
    } finally {
      setSaving(false);
    }
  }

  return <section className="grid gap-4 rounded-md border border-neutral-300 bg-neutral-50 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
    <div className="flex flex-col items-center md:items-start gap-2 md:flex-row md:items-center md:justify-between">
      <h2 className="text-lg font-semibold">Phase Summary</h2>
      <div className="flex gap-2 md:justify-end">
        <NorthstarButton
          onClick={() => void loadPhases()}
          disabled={loading || saving}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </NorthstarButton>
        <NorthstarButton
          buttonStyle="focused"
          onClick={() => openCreate()}
          disabled={saving}>
          <Plus className="size-4" />
          Create Phase
        </NorthstarButton>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 items-center gap-2 border-b border-neutral-300 pb-2 dark:border-neutral-700">

      <CostSummaryCard label="Contract" value={costSummary.contractCost} />
      <CostSummaryCard label="Retainer" value={costSummary.retainerCost} />
      <CostSummaryCard label="Billed" value={costSummary.billedAmount} />
      <CostSummaryCard label="Income" value={costSummary.incomeAmount} />
    </div>

    {notice && <p className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">{notice}</p>}
    {error && <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{error}</p>}
    {formOpen && (
      <PhaseForm
        form={form}
        setForm={setForm}
        phaseOptions={phaseOptions}
        managers={managers}
        editing={Boolean(editingId)}
        saving={saving}
        onCancel={() => setFormOpen(false)}
        onSubmit={save}
      />
    )}
    {loading ?
      <p className="py-5 text-sm text-neutral-500 dark:text-neutral-400">Loading phases...</p> :
      phases.length === 0 ?
        <p className="py-5 text-sm text-neutral-500 dark:text-neutral-400">No phases have been created for this project.</p> :
        <div className="flex flex-col gap-2">
          {phases.map((phase) =>
            <PhaseRow key={phase.id} phase={phase} depth={0} disabled={saving} onCreateChild={openCreate} onEdit={openEdit} onDelete={deletePhase} />
          )}
        </div>
    }
  </section>;
}

function PhaseRow({ phase, depth, disabled, onCreateChild, onEdit, onDelete }: { phase: Phase; depth: number; disabled: boolean; onCreateChild: (parentId: string) => void; onEdit: (phase: Phase) => void; onDelete: (phase: Phase) => void }) {
  const [showChildren, setShowChildren] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const toggleChildren = () => setShowChildren((prev) => !prev);
  const toggleDescription = () => setShowDescription((prev) => !prev);

  return <>
    <div className="border-b border-neutral-300 dark:border-neutral-700 pb-4">
      <div className="flex flex-row items-start gap-2">
        {(depth == 0 || (depth > 0 && phase.subPhases.length > 0)) &&
          <NorthstarButton
            size="small"
            onClick={toggleChildren}
            disabled={disabled}
            className={`${phase.subPhases.length === 0 ? "invisible" : ""} mt-1`}>
            {showChildren ? <Minus className="size-4" /> : <Plus className="size-4" />}
          </NorthstarButton>
        }
        <div className="flex flex-col w-full">
          {/* Row 1 - Title and Cost */}
          <div className="flex flex-col md:flex-row items-start md:justify-between">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              Phase {phase.phaseId}: {phase.name}
            </h2>
            <div className="flex gap-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">{labelForBillType(phase.billType)}</span>
              <span className={`text-sm font-semibold ${phase.subPhases.length > 0 ? "italic" : ""} ${getColorClass("Contract", phase.accounting.contractCost)}`} title={`Contract cost: ${formatMoney(phase.accounting.contractCost)}\nRetainer cost: ${formatMoney(phase.accounting.retainerCost)}${phase.subPhases.length > 0 ? `\nValues based on sum of sub-phases` : ""}`}>{formatMoney(phase.accounting.contractCost)}</span>
            </div>
          </div>
          {/* Row 2 - Status pills and actions */}
          <div className="flex flex-row justify-between gap-2 mt-2">
            <div className="flex gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${phase.active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"}`}>{phase.active ? "Active" : "Inactive"}</span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${phase.billable ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"}`}>{phase.billable ? "Billable" : "Non-billable"}</span>
            </div>
            <div className="flex gap-2">
              <NorthstarButton
                size="small"
                onClick={() => onCreateChild(phase.id)}
                disabled={disabled}
                title="Create child phase"
                aria-label="Create child phase">
                <Plus className="size-4" />
              </NorthstarButton>
              <NorthstarButton
                size="small"
                onClick={() => onEdit(phase)}
                disabled={disabled}
                title="Edit phase"
                aria-label="Edit phase">
                <Edit3 className="size-4" />
              </NorthstarButton>
              <NorthstarButton
                size="small"
                buttonStyle="danger"
                onClick={() => void onDelete(phase)}
                disabled={disabled}
                title="Delete phase"
                aria-label="Delete phase">
                <Trash2 className="size-4" />
              </NorthstarButton>
            </div>
          </div>
          {/* Row 3 - Description */}
          {phase.description && <div className="mt-2 flex flex-col gap-1">
            <NorthstarButton
              size="small"
              onClick={toggleDescription}
              disabled={disabled}>
              {showDescription ? "Hide description" : "Show description"}
            </NorthstarButton>
            {showDescription && <p className="text-sm text-neutral-700 dark:text-neutral-300">{phase.description}</p>}
          </div>}
          {/* Row 4 - Child phases */}
          {phase.subPhases.length > 0 && showChildren &&
            <div className="ml-2 mt-2 border-l border-neutral-300 pl-4 dark:border-neutral-700">
              {phase.subPhases.map((subPhase) =>
                <PhaseRow key={subPhase.id} phase={subPhase} depth={depth + 1} disabled={disabled} onCreateChild={onCreateChild} onEdit={onEdit} onDelete={onDelete} />
              )}
            </div>
          }</div>
      </div>
    </div>
  </>;
}

function PhaseForm({ form, setForm, phaseOptions, managers, editing, saving, onCancel, onSubmit }: {
  form: PhaseFormState;
  setForm: (value: PhaseFormState) => void;
  phaseOptions: Array<{ id: string; label: string }>;
  managers: EntraUserAccount[];
  editing: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <form onSubmit={onSubmit} className="grid gap-3 rounded border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">{editing ? "Edit Phase" : "Create Phase"}</h3>
      <span className="text-xs text-neutral-500">Billed and income are read-only.</span>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <NorthstarTextbox
        field="phaseId"
        label="Phase ID"
        required
        value={form.phaseId}
        disabled={saving}
        onChange={(event) => setForm({ ...form, phaseId: event.target.value })}
      />
      <NorthstarTextbox
        field="phaseName"
        label="Name"
        required value={form.name}
        disabled={saving}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
      />
      {!editing &&
        <label className="grid gap-1 text-sm font-medium text-gray-900 dark:text-gray-100">Parent phase
          <select
            value={form.parentId}
            disabled={saving}
            onChange={(event) => setForm({ ...form, parentId: event.target.value })}
            className="block w-full border bg-transparent px-2 py-2 text-sm font-normal">
            <option value="">Top-level phase</option>
            {phaseOptions.map((option) =>
              <option key={option.id} value={option.id}>{option.label}</option>
            )}
          </select>
        </label>
      }
      <NorthstarDropdown
        field="billType"
        label="Billing type"
        required
        options={BILL_TYPES}
        value={form.billType}
        disabled={saving}
        onChange={(event) => {
          const billType = event.target.value as PhaseBillType;
          setForm({ ...form, billType, billable: billType === "nonBillable" ? false : form.billable });
        }}
      />
      <NorthstarTextbox
        field="contractCost"
        label="Contract amount"
        required
        type="number"
        min="0"
        step="0.01"
        value={form.contractCost}
        disabled={saving}
        onChange={(event) => setForm({ ...form, contractCost: event.target.value })}
      />
      <NorthstarTextbox
        field="retainerCost"
        label="Retainer amount"
        required
        type="number"
        min="0"
        step="0.01"
        value={form.retainerCost}
        disabled={saving}
        onChange={(event) => setForm({ ...form, retainerCost: event.target.value })}
      />
      <label className="grid gap-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        Internal project manager
        <select
          value={form.projectManagerId}
          disabled={saving}
          onChange={(event) => setForm({ ...form, projectManagerId: event.target.value })}
          className="block w-full border bg-transparent px-2 py-2 text-sm font-normal"
        >
          <option value="">Use project manager</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.displayName}{manager.jobTitle ? ` · ${manager.jobTitle}` : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
    <NorthstarTextbox
      field="description"
      label="Description"
      value={form.description}
      disabled={saving}
      onChange={(event) => setForm({ ...form, description: event.target.value })}
    />
    <div className="flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.active}
          disabled={saving}
          onChange={(event) => setForm({ ...form, active: event.target.checked })}
        />
        Active
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.billable}
          disabled={saving || form.billType === "nonBillable"}
          onChange={(event) => setForm({ ...form, billable: event.target.checked })}
        />
        Billable
      </label>
    </div>
    <div className="flex justify-end gap-2">
      <NorthstarButton
        type="button"
        onClick={onCancel}
        disabled={saving}>
        Cancel
      </NorthstarButton>
      <NorthstarButton
        type="submit"
        buttonStyle="focused"
        disabled={saving}>
        {saving ? "Saving..." : editing ? "Save Phase" : "Create Phase"}
      </NorthstarButton>
    </div>
  </form>;
}

function flattenPhases(phases: Phase[], depth = 0): Array<{ id: string; label: string }> { return phases.flatMap((phase) => [{ id: phase.id, label: `${"— ".repeat(depth)}${phase.phaseId} · ${phase.name}` }, ...flattenPhases(phase.subPhases, depth + 1)]); }

function labelForBillType(value: PhaseBillType): string { return BILL_TYPES.find((type) => type.value === value)?.label || value; }

function formatMoney(value: number): string { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }

function CostSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2">
      <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className={`text-lg font-semibold ${getColorClass(label, value)}`}>{formatMoney(value)}</span>
    </div>
  );
};

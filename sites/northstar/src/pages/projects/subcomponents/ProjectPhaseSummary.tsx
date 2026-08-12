import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Phase, PhaseBillType, PhaseCreatePayload, PhaseUpdatePayload } from "cfdg/types";
import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { NorthstarButton, NorthstarDropdown, NorthstarTextbox } from "cfdg/ui/input";
import { createProjectPhase, deleteProjectPhase, fetchProjectPhases, updateProjectPhase } from "../../../api/projects";

const BILL_TYPES: Array<{ value: PhaseBillType; label: string }> = [
  { value: "fixedFee", label: "Fixed fee" },
  { value: "timeAndMaterials", label: "Time and materials" },
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

/** Renders and manages the phase tree for a Northstar project. */
export function ProjectPhaseSummary({ projectId }: { projectId: string }) {
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
    <div className="grid grid-cols-1 md:grid-cols-6 items-center gap-2 border-b border-neutral-300 pb-2 dark:border-neutral-700">
      <div className="flex flex-col items-start">
        <h2 className="text-lg font-semibold">Phase Summary</h2>
        <p className="">{phases.length} Phase{phases.length !== 1 ? "s" : ""}</p>
      </div>
      <CostSummaryCard label="Contract" value={costSummary.contractCost} />
      <CostSummaryCard label="Retainer" value={costSummary.retainerCost} />
      <CostSummaryCard label="Billed" value={costSummary.billedAmount} />
      <CostSummaryCard label="Income" value={costSummary.incomeAmount} />
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

    {notice && <p className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">{notice}</p>}
    {error && <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{error}</p>}
    {formOpen && <PhaseForm form={form} setForm={setForm} phaseOptions={phaseOptions} editing={Boolean(editingId)} saving={saving} onCancel={() => setFormOpen(false)} onSubmit={save} />}
    {loading ?
      <p className="py-5 text-sm text-neutral-500 dark:text-neutral-400">Loading phases...</p> :
      phases.length === 0 ?
        <p className="py-5 text-sm text-neutral-500 dark:text-neutral-400">No phases have been created for this project.</p> :
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
                <th className="px-2 py-2">Phase</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Contract</th>
                <th className="px-2 py-2 text-right">Retainer</th>
                <th className="px-2 py-2 text-right">Billed</th>
                <th className="px-2 py-2 text-right">Income</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase) =>
                <PhaseRow key={phase.id} phase={phase} depth={0} disabled={saving} onCreateChild={openCreate} onEdit={openEdit} onDelete={deletePhase} />
              )}
            </tbody>
          </table>
        </div>
    }
  </section>;
}

function PhaseRow({ phase, depth, disabled, onCreateChild, onEdit, onDelete }: { phase: Phase; depth: number; disabled: boolean; onCreateChild: (parentId: string) => void; onEdit: (phase: Phase) => void; onDelete: (phase: Phase) => void }) {
  return <>
    <tr className="border-b border-neutral-200 last:border-0 dark:border-neutral-700">
      <td className="px-2 py-2" style={{ paddingLeft: `${8 + depth * 22}px` }}>
        <div className="font-semibold">Phase {phase.phaseId}. {phase.name}</div>
        {phase.description && <div className="text-xs text-neutral-500 dark:text-neutral-400">{phase.description}</div>}
      </td>
      <td className="px-2 py-2">
        {labelForBillType(phase.billType)}
      </td>
      <td className="px-2 py-2">
        <span className={phase.active && phase.billable ? "text-emerald-700 dark:text-emerald-300" : "text-neutral-500 dark:text-neutral-400"}>{phase.active ? "Active" : "Inactive"} | {phase.billable ? "Billable" : "Not billable"}</span>
      </td>
      <td className={`px-2 py-2 text-right ${phase.subPhases.length > 0 ? 'font-semibold italic' : ''}`}>
        {formatMoney(phase.accounting.contractCost)}
      </td>
      <td className={`px-2 py-2 text-right ${phase.subPhases.length > 0 ? 'font-semibold italic' : ''}`}>
        {formatMoney(phase.accounting.retainerCost)}
      </td>
      <td className={`px-2 py-2 text-right ${phase.subPhases.length > 0 ? 'font-semibold italic' : ''}`}>
        {formatMoney(phase.accounting.billedAmount)}
      </td>
      <td className={`px-2 py-2 text-right ${phase.subPhases.length > 0 ? 'font-semibold italic' : ''}`}>
        {formatMoney(phase.accounting.incomeAmount)}
      </td>
      <td className="px-2 py-2">
        <div className="flex justify-end gap-1">
          <button type="button" className="rounded border border-neutral-300 p-1.5 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-700" title="Edit phase" onClick={() => onEdit(phase)} disabled={disabled}>
            <Edit3 className="size-3.5" />
          </button>
          <button type="button" className="rounded border border-neutral-300 p-1.5 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-700" title="Create child phase" onClick={() => onCreateChild(phase.id)} disabled={disabled}>
            <Plus className="size-3.5" />
          </button>
          <button type="button" className="rounded border border-red-300 p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950" title="Hide phase" onClick={() => void onDelete(phase)} disabled={disabled}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
    {phase.subPhases.map((child: Phase) => <PhaseRow key={child.id} phase={child} depth={depth + 1} disabled={disabled} onCreateChild={onCreateChild} onEdit={onEdit} onDelete={onDelete} />)}
  </>;
}

function PhaseForm({ form, setForm, phaseOptions, editing, saving, onCancel, onSubmit }: { form: PhaseFormState; setForm: (value: PhaseFormState) => void; phaseOptions: Array<{ id: string; label: string }>; editing: boolean; saving: boolean; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
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
      {/* TODO: Change to a dropdown of potential project managers and, if the project has a project manager, preset to that value. */}
      <NorthstarTextbox
        field="projectManagerId"
        label="Project manager ID"
        value={form.projectManagerId}
        disabled={saving}
        onChange={(event) => setForm({ ...form, projectManagerId: event.target.value })}
      />
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
  const colorClass = (() => {
    switch (label) {
      case "Contract": return "text-blue-700 dark:text-blue-300";
      case "Retainer": return "text-purple-700 dark:text-purple-300";
      case "Billed": return "text-green-700 dark:text-green-300";
      case "Income": return value < 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300";
      default: return "text-neutral-950 dark:text-neutral-50";
    }
  });

  return (
    <div className="flex flex-col items-start gap-1 px-3 py-2">
      <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className={`text-lg font-semibold ${colorClass()}`}>{formatMoney(value)}</span>
    </div>
  );
}

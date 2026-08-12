import { normalizeBoolean, normalizeNumber, normalizeString } from "cfdg/scripts";
import type { Phase, PhaseAccounting, PhaseBillType, PhaseCreatePayload, PhaseUpdatePayload } from "cfdg/types";

type DbRow = Record<string, unknown>;

const BILL_TYPES: readonly PhaseBillType[] = ["fixedFee", "timeAndMaterials", "nonBillable"];

/** Converts a D1 phase row into a shared API phase. */
export function mapPhaseRow(row: DbRow): Phase {
  return {
    id: normalizeString(row.id),
    qboId: normalizeString(row.qbo_id),
    parentId: normalizeString(row.parent_id) || null,
    phaseId: normalizeString(row.phase_id),
    name: normalizeString(row.name),
    description: normalizeString(row.description),
    billType: fromDbBillType(row.bill_type),
    accounting: mapAccounting(row),
    active: normalizeBoolean(row.active),
    billable: normalizeBoolean(row.billable),
    deleted: normalizeBoolean(row.deleted),
    projectManagerId: normalizeString(row.phase_project_manager) || null,
    created: { date: normalizeString(row.created_time), id: normalizeString(row.created_id) },
    modified: normalizeString(row.updated_time) ? { date: normalizeString(row.updated_time), id: normalizeString(row.updated_id) } : null,
    subPhases: [],
  };
}

/** Builds a recursive phase tree and replaces parent accounting with child totals. */
export function buildPhaseTree(rows: DbRow[]): Phase[] {
  const phases = rows.map(mapPhaseRow);
  const byId = new Map(phases.map((phase) => [phase.id, phase]));
  const roots: Phase[] = [];

  for (const phase of phases) {
    const parent = phase.parentId ? byId.get(phase.parentId) : undefined;
    if (parent) parent.subPhases.push(phase);
    else roots.push(phase);
  }

  const summarize = (phase: Phase): Phase => {
    phase.subPhases = phase.subPhases.map(summarize);
    if (phase.subPhases.length > 0) phase.accounting = sumAccounting(phase.subPhases.map((child) => child.accounting));
    return phase;
  };

  return roots.map(summarize);
}

/** Validates and normalizes a phase request at the API boundary. */
export function parsePhasePayload(body: unknown, mode: "create" | "update"): PhaseCreatePayload | PhaseUpdatePayload | string {
  if (!body || typeof body !== "object") return "Request body must be an object";
  const value = body as Record<string, unknown>;
  const phaseId = normalizeString(value.phaseId);
  const name = normalizeString(value.name);
  const billType = parseBillType(value.billType);
  const active = parseRequiredBoolean(value.active);
  const billable = parseRequiredBoolean(value.billable);
  const contractCost = parseMoney(value.contractCost);
  const retainerCost = parseMoney(value.retainerCost);
  if (!phaseId) return "Phase ID is required";
  if (!name) return "Phase name is required";
  if (!billType) return "Invalid phase billing type";
  if (active === null || billable === null) return "Active and billable must be boolean values";
  if (contractCost === null || retainerCost === null) return "Contract and retainer must be nonnegative finite amounts";
  if (billType === "nonBillable" && billable) return "Non-billable phases cannot be marked billable";

  const common = {
    phaseId,
    name,
    description: normalizeString(value.description),
    billType,
    active,
    billable,
    contractCost,
    retainerCost,
    projectManagerId: normalizeString(value.projectManagerId) || null,
  };
  if (mode === "create") {
    return { ...common, parentId: normalizeString(value.parentId) || null };
  }
  return common;
}

/** Converts a decimal currency amount into integer cents. */
export function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

function mapAccounting(row: DbRow): PhaseAccounting {
  return {
    contractCost: normalizeNumber(row.contract_cents) / 100,
    retainerCost: normalizeNumber(row.retainer_cents) / 100,
    billedAmount: normalizeNumber(row.billed_cents) / 100,
    incomeAmount: normalizeNumber(row.income_cents) / 100,
  };
}

function sumAccounting(values: PhaseAccounting[]): PhaseAccounting {
  return values.reduce((sum, value) => ({
    contractCost: sum.contractCost + value.contractCost,
    retainerCost: sum.retainerCost + value.retainerCost,
    billedAmount: sum.billedAmount + value.billedAmount,
    incomeAmount: sum.incomeAmount + value.incomeAmount,
  }), { contractCost: 0, retainerCost: 0, billedAmount: 0, incomeAmount: 0 });
}

function fromDbBillType(value: unknown): PhaseBillType {
  const normalized = normalizeString(value);
  if (normalized === "fixed-fee") return "fixedFee";
  if (normalized === "time-and-materials") return "timeAndMaterials";
  return "nonBillable";
}

function parseBillType(value: unknown): PhaseBillType | null {
  const normalized = normalizeString(value);
  return BILL_TYPES.includes(normalized as PhaseBillType) ? normalized as PhaseBillType : null;
}

function parseRequiredBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 0 || value === 1) return value === 1;
  return null;
}

function parseMoney(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

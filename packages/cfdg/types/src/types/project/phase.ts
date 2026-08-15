/** Supported Northstar phase billing types. */
export type PhaseBillType = "fixedFee" | "timeAndMaterials" | "nonBillable";

/** Phase accounting values returned in decimal currency units. */
export type PhaseAccounting = {
  contractCost: number;
  retainerCost: number;
  billedAmount: number;
  incomeAmount: number;
};

/** A hierarchical contract phase belonging to a Northstar project. */
export type Phase = {
  id: string;
  qboId: string;
  parentId: string | null;
  phaseId: string;
  name: string;
  description: string;
  billType: PhaseBillType;
  accounting: PhaseAccounting;
  active: boolean;
  billable: boolean;
  deleted: boolean;
  projectManagerId: string | null;
  created: { date: string; id: string };
  modified: { date: string; id: string } | null;
  subPhases: Phase[];
};

/** Payload for creating a Northstar phase. */
export type PhaseCreatePayload = {
  parentId?: string | null;
  phaseId: string;
  name: string;
  description?: string;
  billType: PhaseBillType;
  active: boolean;
  billable: boolean;
  contractCost: number;
  retainerCost: number;
  projectManagerId?: string | null;
};

/** Payload for updating editable Northstar phase fields. */
export type PhaseUpdatePayload = {
  phaseId: string;
  name: string;
  description?: string;
  billType: PhaseBillType;
  active: boolean;
  billable: boolean;
  contractCost: number;
  retainerCost: number;
  projectManagerId?: string | null;
};

/** Response returned by the project phase summary endpoint. */
export type PhaseSummaryResponse = {
  phases: Phase[];
};

/** A client contact assigned as a project's point of contact. */
export type ProjectContact = {
  id: string;
  name: string;
  email: string;
};

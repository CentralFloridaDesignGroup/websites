import type { QboCustomer } from "../qbo/types";
import { PROJECT_STATUSES } from "../constants";
import { Wgs84Input } from "../geodesy";
import { R2FileRecord } from "../common";
import { Contact } from "../client/types";

// #region Project types
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Project object */
export type Project = QboCustomer & {
  /** Internal project lifecycle status. */
  status: ProjectStatus;
  /** Purchase order associated with the project. */
  purchaseOrder: string | null;
  /** Internal project manager assigned to the project. */
  projectManager: string | null;
  /** Geolocation of the project site. */
  geolocation: Wgs84Input | null;
  /** Files associated with the project. */
  files: R2FileRecord[];
  /** Contacts associated with the project. */
  contacts: Contact[];
  phases: Phase[];
};

/** Project list response returned by the Northstar API. */
export type ProjectListItem = {
  /** Project ID. */
  id: string;
  /** Full name of the project. */
  fullName: string;
  /** Internal project lifecycle status. */
  status: ProjectStatus;
};

export type ProjectListItemDbRow = {
  /** Project ID. */
  id: string;
  /** Client ID associated with the project. */
  parent_id: string;
  /** Full name of the project. */
  fullName: string;
  /** Internal project lifecycle status. */
  extra_status: string;
};

// #endregion

// #region Project phase types

/** Supported Northstar phase billing types. */
export type PhaseBillType = "fixed-fee" | "time-and-materials" | "non-billable";

/** Phase accounting values returned in decimal currency units. */
export type PhaseAccounting = {
  contractCost: number;
  retainerCost: number;
  billedAmount: number;
  incomeAmount: number;
};

/** A hierarchical contract phase belonging to a Northstar project. */
export type Phase = {
  /** Unique identifier for the phase. */
  id: string;
  /** Identifier for the phase within the project. */
  phaseId: string;
  /** Name of the phase. */
  name: string;
  /** Description of the phase. */
  description: string;
  /** Billing type of the phase. */
  billType: PhaseBillType;
  /** Accounting values for the phase. */
  accounting: PhaseAccounting;
  /** Whether the phase is active. */
  active: boolean;
  /** Whether the phase is billable. */
  billable: boolean;
  /** Whether the phase has been deleted. */
  deleted: boolean;
  /** Identifier of the project manager assigned to the phase, if any. */
  projectManagerId: string | null;
  /** Date when the phase was created. */
  createdDate: string;
  /** Date when the phase was last updated. */
  updatedDate: string;
  /** Identifier of the user who created the phase. */
  createdBy: string;
  /** Identifier of the user who last updated the phase. */
  updatedBy: string;
  /** Sub-phases of the phase. */
  subPhases: Phase[];
};

// #endregion

// #region V1 exports

// Accounting Exports
export type {
  QuickbooksSyncState,
  StripeSyncState,
  NotificationSyncState,
  AccountingSyncState,
} from "./accounting";

// Auth Exports
export type {
  AuthMode,
  AuthContext,
  RouteMethod,
  RoutePolicy,
  AuthEnv,
} from "./auth";

// API Exports
export type { BaseApiEnv } from "./api";

// General Exports
export type { State, Address, R2FileRecord, Unknown, UnknownPartial } from "./common";

// Calculator Exports
export type {
  HistoryEntry,
  CalculationResult,
  ValidationError,
} from "./calculators";

// Invoice Exports
export type {
  InvoiceStatus,
  InvoicePaymentKind,
  InvoicePaymentStatus,
  InvoiceEmailDeliveryStatus,
  InvoiceEmailDeliveryState,
  InvoiceLineItem,
  InvoiceContactRecipient,
  InvoicePayment,
  Invoice,
  InvoiceLineItemRow,
  InvoiceRow,
  InvoiceContactRecipientRow,
  InvoicePaymentRow,
} from "./invoice";

// Job Position Exports
export type {
  JobPositionSalaryType,
  JobPositionLocation,
  JobPosition,
} from "./jobPosition";

// Project Management Exports
export type {
  ProjectStatus,
  ProjectBillingProfile,
  ProjectBillingProfileRow,
  ProjectTask,
  ProjectTaskRow,
  ProjectLifecycle,
  ProjectInvoiceDocument,
  ProjectInvoiceDocumentRow,
  EntraUserAccount,
  ClientContact,
  ClientContactRow,
  ProjectManager,
  ProjectManagerRow,
  ClientPayload,
  ClientCreatePayload,
  ClientUpdatePayload,
  ProjectPayload,
  ProjectCreatePayload,
  ProjectUpdatePayload,
  ProjectMovePayload,
} from "./projectManagement";

// Review Package Exports
export type {
  CommentStatus,
  ReviewPackageStatus,
  CommentRecord,
  ReviewPackage,
  CommentRecordRow,
  ReviewPackageRow,
} from "./reviewPackage";

// Transaction Email Exports
export type { Attachment, Package, FormSubmission } from "./transactionEmail";

// Geodesy Exports
export type {
  KnownStatePlaneProjection,
  StatePlaneProjection,
  StatePlaneInput,
  Wgs84Input,
} from "./geodesy";

// UI Exports
export type {
  InputSize,
  ColorMode,
  RequiredProperty,
  RegexProperty,
  ClassNameValue,
  ColorClassNamesFor,
} from "./ui";

export type {
  QboAccount,
  QboConnectionStatus,
  QboCustomer,
  QboServiceItem,
} from "./qbo";

// #endregion
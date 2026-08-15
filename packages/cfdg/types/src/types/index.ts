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
export type { State, Address } from "./general";

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
  ProjectBillingProfile,
  ProjectBillingProfileRow,
  ProjectStatus,
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

// #endregion

// #region V2 exports

export type {
  NorthstarPageSize,
  NorthstarPagination,
  ListOptions
} from "./pagination";

export type {
  ClientExtraData,
  ClientExtraDataRow,
  ClientListResponse,
  ClientStatus,
  Client,
  ClientListItem,
  NorthstarClient,
  Contact
} from "./client/types";

export type {
  NorthstarProject,
  ProjectExtraData,
  ProjectExtraDataRow,
  ProjectListItem,
  ProjectListResponse,
} from "./project";

export type {
  PhaseBillType,
  PhaseAccounting,
  Phase,
  PhaseCreatePayload,
  PhaseUpdatePayload,
  ProjectContact,
  PhaseSummaryResponse,
} from "./project";

export type {
  InvoiceAddressSnapshot,
  InvoiceBrandingSnapshot,
  InvoiceNumberingSettings,
  InvoiceLineItemV2,
  InvoiceV2,
  InvoiceV2LineItemInput,
  InvoiceV2CreatePayload,
  InvoiceV2UpdatePayload,
  InvoiceV2ListResponse,
  InvoiceBundle,
  InvoiceBundleCreatePayload,
  InvoiceBundleUpdatePayload,
  InvoiceBundleListResponse,
  InvoiceV2Status,
  InvoiceV2DueType,
  InvoiceV2LineType,
  InvoiceV2QboSyncStatus,
} from "./invoiceV2";

// Quickbooks Online Exports
export type {
  QboCustomer,
  QboConnectionStatus,
  QboServiceItem,
  QboAccount,
  QboAddress,
  QboSettings,
  QboReferenceItem,
  QboAppSettings,
} from "./qbo/types";

export type {
  QboTokenResponse,
  QboCustomerResponse,
  QboInvoiceResponse,
  QboAccountResponse,
  QboItemResponse,
  QboPaymentMethodResponse,
  QboStatusResponse,
  QboOptionsResponse,
} from "./qbo/http";

export { mapQboCustomerRow } from "./qbo/mappers";

export type {
  GeneralSettings,
  CompanySettings,
  CompanySettingsRow,
} from "./company/types";

// #endregion

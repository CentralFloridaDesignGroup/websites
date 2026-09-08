// #region Imports

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useMsal } from "@azure/msal-react";
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, Combobox, Multiselect, Textarea, Textbox } from "cfdg/input";
import { Modal, showNotification } from "cfdg/layout";
import {
  type ClientContact,
  type Invoice,
  type InvoicePayment,
  type InvoicePaymentKind,
  type ProjectManager,
  type QboConnectionStatus,
  type QboCustomer,
} from "cfdg/types";
import {
  ArrowLeft,
  Banknote,
  Check,
  Copy,
  CopyPlus,
  CreditCard,
  Download,
  ExternalLink,
  File,
  Mail,
  Plus,
  RefreshCw,
  Save,
  SquareArrowOutUpRight,
  Trash2,
  X,
} from "lucide-react";
import {
  copyInvoice,
  createInvoice,
  createInvoiceCheckoutSession,
  fetchInvoice,
  fetchInvoices,
  fetchPublicInvoice,
  markInvoicePaid,
  refreshInvoiceProjectAddress,
  retryPayoutSync,
  retryQboDeposit,
  retryQboPayment,
  retryStripeDetails,
  sendInvoice,
  syncInvoicePayments,
  updateInvoice,
  voidInvoice,
  type InvoiceCheckoutSession,
  type InvoiceLineItemDraft,
  type InvoiceSavePayload,
} from "../../../api/invoices";
import {
  fetchQboCustomers,
  fetchQboProjects,
  fetchQboStatus,
} from "../../../api/qbo";
import {
  fetchClientContacts,
  fetchProjectDetails,
  fetchProjectTasks,
  type ProjectSummary,
} from "../../../api/projectManagement";
import {
  createInvoicePdfAttachment,
  downloadInvoicePdf,
  openInvoicePdfPreview,
} from "./createInvoicePdf";
import { InvoiceOverviewStats } from "./InvoiceOverviewStats";
import { EmailDeliveryNotice, StatusBadge } from "./InvoiceStatus";
import { ClientAccountReport } from './ClientAccountReport';

// #endregion Imports

// #region Types
type InvoiceLineItemForm = {
  localId: string;
  projectTaskId: string;
  description: string;
  percentComplete: string;
  contractAmount: string;
  billInFull: boolean;
};

type InvoiceForm = {
  qboCustomerId: string;
  qboProjectId: string;
  contactIds: string[];
  clientName: string;
  clientEmail: string;
  poNumber: string;
  projectReference: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  internalNote: string;
  previouslyBilled: string;
  lineItems: InvoiceLineItemForm[];
};

type InvoiceListStatusFilter = "all" | "draft" | "sent";
// #endregion Types

// #region Constants
const dueDateTermOptions = [
  { key: "Due on receipt", value: "0" },
  { key: "NET15", value: "15" },
  { key: "NET30", value: "30" },
];

const paymentMethodOptions = [
  { key: "Check", value: "Check" },
  { key: "Cash", value: "Cash" },
  { key: "ACH / Bank Transfer", value: "ACH / Bank Transfer" },
  { key: "Credit Card", value: "Credit Card" },
  { key: "QuickBooks Payment", value: "QuickBooks Payment" },
  { key: "Stripe", value: "Stripe" },
  { key: "Correction / Adjustment", value: "Correction / Adjustment" },
  { key: "Other", value: "Other" },
];
// #endregion Constants

// #region Helper Functions
function todayIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToIsoDate(value: string, days: number): string {
  const baseDate = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return todayIsoDate();
  }
  baseDate.setDate(baseDate.getDate() + days);
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, "0");
  const day = String(baseDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createLocalId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function emptyLineItem(): InvoiceLineItemForm {
  return {
    localId: createLocalId(),
    projectTaskId: "",
    description: "",
    percentComplete: "100",
    contractAmount: "",
    billInFull: false,
  };
}

function createEmptyForm(editorName = ""): InvoiceForm {
  return {
    qboCustomerId: "",
    qboProjectId: "",
    contactIds: [],
    clientName: "",
    clientEmail: "",
    poNumber: "",
    projectReference: "",
    issueDate: todayIsoDate(),
    dueDate: "",
    notes: "",
    internalNote: editorName ? `Created by ${editorName}` : "",
    previouslyBilled: "",
    lineItems: [emptyLineItem()],
  };
}

function centsToInput(cents: number): string {
  return cents > 0 ? (cents / 100).toFixed(2) : "";
}

function centsFromInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

function percentFromInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(value: string): string {
  if (!value) return "";
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formFromInvoice(invoice: Invoice): InvoiceForm {
  return {
    qboCustomerId: invoice.qboCustomerId,
    qboProjectId: invoice.qboProjectId,
    contactIds: invoice.contactIds,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    poNumber: invoice.poNumber,
    projectReference: invoice.projectReference,
    issueDate: invoice.issueDate || todayIsoDate(),
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    internalNote: invoice.internalNote,
    previouslyBilled: centsToInput(invoice.previouslyBilledCents),
    lineItems:
      invoice.lineItems.length > 0
        ? invoice.lineItems.map((item) => ({
            localId: item.id || createLocalId(),
            projectTaskId: item.projectTaskId,
            description: item.description,
            percentComplete: String(item.percentComplete || item.quantity || 0),
            contractAmount: centsToInput(
              item.contractAmountCents || item.unitAmountCents,
            ),
            billInFull: item.billInFull,
          }))
        : [emptyLineItem()],
  };
}

function getLineItemAmountCents(item: InvoiceLineItemForm): number {
  return Math.round(
    centsFromInput(item.contractAmount) *
      (percentFromInput(item.percentComplete) / 100),
  );
}

function getFormTotalCents(form: InvoiceForm): number {
  return form.lineItems.reduce((total, item) => {
    return total + getLineItemAmountCents(item);
  }, 0);
}

function getFormPreviousBillingEligibleCents(form: InvoiceForm): number {
  return form.lineItems.reduce((total, item) => {
    return item.billInFull ? total : total + getLineItemAmountCents(item);
  }, 0);
}

function getFormPreviouslyBilledCents(form: InvoiceForm): number {
  return Math.min(
    getFormPreviousBillingEligibleCents(form),
    centsFromInput(form.previouslyBilled),
  );
}

function getProjectPreviouslyBilledCents(
  invoices: Invoice[],
  projectId: string,
): number {
  return invoices
    .filter((invoice) => invoice.qboProjectId === projectId)
    .filter(
      (invoice) => invoice.status !== "draft" && invoice.status !== "void",
    )
    .reduce((total, invoice) => total + invoice.totalCents, 0);
}

function getInvoicePaidCents(invoice: Invoice): number {
  return invoice.payments
    .filter((payment) => payment.status === "succeeded")
    .reduce((sum, payment) => sum + payment.grossCents, 0);
}

function getInvoiceAmountDueCents(invoice: Invoice): number {
  return Math.max(0, invoice.totalCents - getInvoicePaidCents(invoice));
}

function invoiceForEmailAttachment(invoice: Invoice): Invoice {
  return {
    ...invoice,
    status: "sent",
    sentDate: invoice.sentDate || new Date().toISOString(),
  };
}

function buildPayload(
  form: InvoiceForm,
  editorName: string,
): InvoiceSavePayload {
  const lineItems: InvoiceLineItemDraft[] = form.lineItems
    .map((item) => ({
      projectTaskId: item.projectTaskId,
      description: item.description.trim(),
      quantity: percentFromInput(item.percentComplete),
      unitAmountCents: centsFromInput(item.contractAmount),
      contractAmountCents: centsFromInput(item.contractAmount),
      percentComplete: percentFromInput(item.percentComplete),
      billInFull: item.billInFull,
    }))
    .filter(
      (item) =>
        item.description &&
        item.percentComplete > 0 &&
        item.contractAmountCents > 0,
    );

  return {
    qboCustomerId: form.qboCustomerId,
    qboProjectId: form.qboProjectId,
    contactIds: form.contactIds,
    clientName: form.clientName.trim(),
    clientEmail: form.clientEmail.trim(),
    poNumber: form.poNumber.trim(),
    projectReference: form.projectReference.trim(),
    issueDate: form.issueDate,
    dueDate: form.dueDate,
    notes: form.notes.trim(),
    internalNote: form.internalNote.trim(),
    previouslyBilledCents: getFormPreviouslyBilledCents(form),
    createdBy: editorName,
    updatedBy: editorName,
    lineItems,
  };
}

const invoiceStatusFilterOptions: Array<{
  key: string;
  value: InvoiceListStatusFilter;
}> = [
  { key: "All", value: "all" },
  { key: "Draft", value: "draft" },
  { key: "Sent", value: "sent" },
];

function getDisplayError(error: unknown): string {
  const message = String(error instanceof Error ? error.message : error);
  try {
    const parsed = JSON.parse(message) as { error?: unknown };
    return String(parsed.error || message);
  } catch {
    return message;
  }
}

// #endregion Helper Functions

// #region InvoicesManager Component
export function InvoicesManager() {
  // User Context
  const { accounts } = useMsal();
  const [invoiceSearchParams, setInvoiceSearchParams] = useSearchParams();
  const editorName =
    accounts[0]?.name ?? accounts[0]?.username ?? "unknown-user";

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summaryInvoices, setSummaryInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceForm>(() =>
    createEmptyForm(editorName),
  );
  const [mode, setMode] = useState<"overview" | "form">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<InvoiceListStatusFilter>("all");
  const [showClosedInvoices, setShowClosedInvoices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [dueDateTerm, setDueDateTerm] = useState("");
  const [qboStatus, setQboStatus] = useState<QboConnectionStatus | null>(null);
  const [qboCustomers, setQboCustomers] = useState<QboCustomer[]>([]);
  const [qboProjects, setQboProjects] = useState<QboCustomer[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectSummary | null>(
    null,
  );
  const [currentProjectManager, setCurrentProjectManager] =
    useState<ProjectManager | null>(null);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null);
  const [paymentKind, setPaymentKind] = useState<InvoicePaymentKind>("payment");
  const [paymentMethod, setPaymentMethod] = useState("Check");
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [paymentNote, setPaymentNote] = useState("");
  const [bccSender, setBccSender] = useState(false);
  const [clientReportOpen, setClientReportOpen] = useState(false);
  const [previouslyBilledManuallyEdited, setPreviouslyBilledManuallyEdited] =
    useState(false);

  // Memoized Values
  const formTotalCents = useMemo(() => getFormTotalCents(form), [form]);
  const formPreviouslyBilledCents = useMemo(
    () => getFormPreviouslyBilledCents(form),
    [form],
  );
  const formAmountDueCents = Math.max(
    0,
    formTotalCents - formPreviouslyBilledCents,
  );
  const canEdit = !selectedInvoice || selectedInvoice.status === "draft";
  const selectedCustomer = useMemo(
    () =>
      qboCustomers.find((customer) => customer.id === form.qboCustomerId) ??
      null,
    [form.qboCustomerId, qboCustomers],
  );
  const selectedProject = useMemo(
    () =>
      qboProjects.find((project) => project.id === form.qboProjectId) ??
      (currentProject?.id === form.qboProjectId ? currentProject : null),
    [currentProject, form.qboProjectId, qboProjects],
  );
  const projectClientMismatch = Boolean(
    selectedProject?.parentId &&
    form.qboCustomerId &&
    selectedProject.parentId !== form.qboCustomerId,
  );
  const hasUnsyncedSuccessfulPayments = Boolean(
    selectedInvoice?.payments.some(
      (payment) =>
        payment.status === "succeeded" &&
        (!payment.qboPaymentId ||
          (qboStatus?.defaultDepositAccountId &&
            !payment.stripeBalanceTransactionId &&
            !payment.qboDepositId)),
    ),
  );
  const hasPendingStripePayoutReconciliation = Boolean(
    selectedInvoice?.payments.some(
      (payment) =>
        payment.status === "succeeded" &&
        payment.stripeBalanceTransactionId &&
        !payment.qboDepositId,
    ),
  );
  const canSaveInvoice =
    canEdit && Boolean(form.qboCustomerId) && form.contactIds.length > 0;
  const selectedInvoiceSendBlockMessage =
    selectedInvoice?.status === "paid"
      ? "Paid invoices cannot be sent"
      : selectedInvoice?.status === "void"
        ? "Void invoices cannot be sent"
        : !form.qboCustomerId
          ? "Invoice must be linked to a QuickBooks customer before sending"
          : !form.qboProjectId
            ? "Invoice must be linked to a QuickBooks project before sending"
            : !currentProjectManager
              ? "Invoice project must have an internal project manager before sending"
              : "";
  const canSendSelectedInvoice = Boolean(
    selectedInvoice && !selectedInvoiceSendBlockMessage,
  );
  const publicUrl = selectedInvoice
    ? `${window.location.origin}/pay/${encodeURIComponent(selectedInvoice.publicToken)}`
    : "";
  const senderEmail = accounts[0]?.username ?? "";
  const requiresPaymentReference = paymentMethod === "Check";

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const [data, summaryData] = await Promise.all([
        fetchInvoices({
          status: statusFilter === "all" ? undefined : statusFilter,
          search: searchTerm,
        }),
        fetchInvoices(),
      ]);
      setInvoices(data);
      setSummaryInvoices(summaryData);
    } catch (error) {
      showNotification({
        title: "Invoices Failed To Load",
        body: String(error),
        style: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  const loadQboData = useCallback(async () => {
    try {
      const status = await fetchQboStatus();
      setQboStatus(status);
      if (status.connected) {
        const customers = await fetchQboCustomers();
        setQboCustomers(customers);
      }
    } catch {
      setQboStatus({
        connected: false,
        realmId: "",
        environment: "",
        lastCustomerSyncDate: "",
        lastItemSyncDate: "",
        lastAccountSyncDate: "",
        tokenExpiresDate: "",
        defaultServiceItemId: "",
        defaultServiceItemName: "",
        defaultDepositAccountId: "",
        defaultDepositAccountName: "",
        stripeFeeExpenseAccountId: "",
        stripeFeeExpenseAccountName: "",
      });
    }
  }, []);

  useEffect(() => {
    document.title = "Invoices - The Compass";
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    void loadQboData();
  }, [loadQboData]);

  useEffect(() => {
    const invoiceIdParam = invoiceSearchParams.get("invoiceId") || "";
    if (invoiceIdParam && selectedInvoice?.id !== invoiceIdParam) {
      void selectInvoice(invoiceIdParam);
    }
  }, [invoiceSearchParams, selectedInvoice?.id]);

  useEffect(() => {
    async function loadProjects() {
      if (!form.qboCustomerId) {
        setQboProjects([]);
        setClientContacts([]);
        setCurrentProjectManager(null);
        return;
      }
      try {
        const [projects, contacts] = await Promise.all([
          fetchQboProjects(form.qboCustomerId),
          fetchClientContacts(form.qboCustomerId),
        ]);
        setQboProjects(projects);
        setClientContacts(
          contacts.filter(
            (contact) => contact.active && contact.isInvoiceRecipient,
          ),
        );
      } catch (error) {
        showNotification({
          title: "Client Data Failed To Load",
          body: String(error),
          style: "warning",
        });
      }
    }
    void loadProjects();
  }, [form.qboCustomerId]);

  useEffect(() => {
    let cancelled = false;
    async function loadCurrentProject() {
      if (!form.qboProjectId) {
        setCurrentProject(null);
        setCurrentProjectManager(null);
        return;
      }
      try {
        const details = await fetchProjectDetails(form.qboProjectId);
        if (!cancelled) {
          setCurrentProject(details.project);
          setCurrentProjectManager(details.manager);
          if (details.billingProfile.poNumber) {
            setForm((previous) =>
              previous.poNumber
                ? previous
                : { ...previous, poNumber: details.billingProfile.poNumber },
            );
          }
        }
      } catch {
        if (!cancelled) {
          setCurrentProject(null);
          setCurrentProjectManager(null);
        }
      }
    }
    void loadCurrentProject();
    return () => {
      cancelled = true;
    };
  }, [form.qboProjectId]);

  useEffect(() => {
    if (selectedInvoice || previouslyBilledManuallyEdited || !form.qboProjectId)
      return;
    const previouslyBilledCents = getProjectPreviouslyBilledCents(
      summaryInvoices,
      form.qboProjectId,
    );
    setForm((previous) => ({
      ...previous,
      previouslyBilled: centsToInput(previouslyBilledCents),
    }));
  }, [
    form.qboProjectId,
    previouslyBilledManuallyEdited,
    selectedInvoice,
    summaryInvoices,
  ]);

  async function selectInvoice(invoiceId: string) {
    try {
      const invoice = await fetchInvoice(invoiceId);
      setSelectedInvoice(invoice);
      setPreviouslyBilledManuallyEdited(false);
      setForm(formFromInvoice(invoice));
      setMode("form");
      setInvoiceSearchParams({ invoiceId: invoice.id }, { replace: false });
    } catch (error) {
      showNotification({
        title: "Invoice Failed To Load",
        body: String(error),
        style: "danger",
      });
    }
  }

  function startNewInvoice() {
    setSelectedInvoice(null);
    setPreviouslyBilledManuallyEdited(false);
    setForm(createEmptyForm(editorName));
    setMode("form");
    setInvoiceSearchParams({}, { replace: false });
  }

  function returnToOverview() {
    setMode("overview");
    setInvoiceSearchParams({}, { replace: false });
  }

  function updateFormField(
    field: keyof Omit<InvoiceForm, "lineItems" | "contactIds">,
    value: string,
  ) {
    if (field === "previouslyBilled") setPreviouslyBilledManuallyEdited(true);
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function updateContactIds(contactIds: string[]) {
    setForm((previous) => {
      const firstContact = clientContacts.find((contact) =>
        contactIds.includes(contact.id),
      );
      return {
        ...previous,
        contactIds,
        clientEmail: firstContact?.email || previous.clientEmail,
      };
    });
  }

  // If creating a new invoice, automatically set the contactIds to the active invoice recipients for the selected client.
  useEffect(() => {
    if (selectedInvoice) return; // Only apply this logic when creating a new invoice.
    if (clientContacts.length === 0) return; // No contacts to select from, cancel.
    updateContactIds(
      clientContacts
        .filter((contact) => contact.isInvoiceRecipient)
        .map((contact) => contact.id),
    );
  }, [clientContacts]);

  function applyDueDateTerm(days: number) {
    setForm((previous) => ({
      ...previous,
      dueDate: addDaysToIsoDate(previous.issueDate, days),
    }));
  }

  function updateLineItem<
    Field extends keyof Omit<InvoiceLineItemForm, "localId">,
  >(localId: string, field: Field, value: InvoiceLineItemForm[Field]) {
    setForm((previous) => ({
      ...previous,
      lineItems: previous.lineItems.map((item) =>
        item.localId === localId ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function addLineItem() {
    setForm((previous) => ({
      ...previous,
      lineItems: [...previous.lineItems, emptyLineItem()],
    }));
  }

  function removeLineItem(localId: string) {
    setForm((previous) => ({
      ...previous,
      lineItems:
        previous.lineItems.length > 1
          ? previous.lineItems.filter((item) => item.localId !== localId)
          : previous.lineItems,
    }));
  }

  async function saveInvoiceForm() {
    setSaving(true);
    try {
      const payload = buildPayload(
        {
          ...form,
          clientName: selectedCustomer?.displayName || form.clientName,
          projectReference: selectedProject?.displayName || "",
        },
        editorName,
      );
      const invoice = selectedInvoice
        ? await updateInvoice(selectedInvoice.id, payload)
        : await createInvoice(payload);
      setSelectedInvoice(invoice);
      setForm(formFromInvoice(invoice));
      setInvoiceSearchParams({ invoiceId: invoice.id }, { replace: false });
      await loadInvoices();
      setMode("form");
      showNotification({
        title: "Invoice Saved",
        body: `${invoice.invoiceNumber} is ready.`,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Invoice Save Failed",
        body: getDisplayError(error),
        style: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  async function runInvoiceAction(
    action: () => Promise<Invoice>,
    successTitle: string,
  ) {
    if (!selectedInvoice) return;
    setActionBusy(true);
    try {
      const invoice = await action();
      setSelectedInvoice(invoice);
      setForm(formFromInvoice(invoice));
      await loadInvoices();
      showNotification({
        title: successTitle,
        body: invoice.invoiceNumber,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Invoice Action Failed",
        body: getDisplayError(error),
        style: "danger",
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function runInvoiceRowAction(
    invoice: Invoice,
    action: (target: Invoice) => Promise<Invoice>,
    successTitle: string,
  ) {
    setSelectedInvoice(invoice);
    setForm(formFromInvoice(invoice));
    setActionBusy(true);
    try {
      const updated = await action(invoice);
      setSelectedInvoice(updated);
      setForm(formFromInvoice(updated));
      await loadInvoices();
      showNotification({
        title: successTitle,
        body: updated.invoiceNumber,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Invoice Action Failed",
        body: getDisplayError(error),
        style: "danger",
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function copyInvoiceIntoDraft(invoice: Invoice) {
    setActionBusy(true);
    try {
      const copied = await copyInvoice(invoice.id);
      setSelectedInvoice(copied);
      setForm(formFromInvoice(copied));
      setMode("form");
      setInvoiceSearchParams({ invoiceId: copied.id }, { replace: false });
      await loadInvoices();
      showNotification({
        title: "Invoice Copied",
        body: `${copied.invoiceNumber} is ready for review.`,
        style: "success",
      });
    } catch (error) {
      showNotification({
        title: "Invoice Copy Failed",
        body: getDisplayError(error),
        style: "danger",
      });
    } finally {
      setActionBusy(false);
    }
  }

  function openMarkPaidModal(invoice: Invoice | null = selectedInvoice) {
    if (!invoice || invoice.status === "paid" || invoice.status === "void")
      return;
    setMarkPaidInvoice(invoice);
    setPaymentKind("payment");
    setPaymentMethod("Check");
    setPaymentReferenceNumber("");
    setPaymentAmount((getInvoiceAmountDueCents(invoice) / 100).toFixed(2));
    setPaymentDate(todayIsoDate());
    setPaymentNote(invoice.internalNote || "");
  }

  async function confirmMarkPaid() {
    if (!markPaidInvoice) return;
    await runInvoiceRowAction(
      markPaidInvoice,
      (target) =>
        markInvoicePaid(target.id, {
          kind: paymentKind,
          method: paymentMethod,
          referenceNumber: paymentReferenceNumber.trim(),
          grossCents: centsFromInput(paymentAmount),
          paidDate: paymentDate,
          note: paymentNote.trim(),
        }),
      paymentKind === "deposit" ? "Deposit Recorded" : "Payment Recorded",
    );
    setMarkPaidInvoice(null);
  }

  async function runPaymentRecovery(
    payment: InvoicePayment,
    action: (invoiceId: string, paymentId: string) => Promise<Invoice>,
    successTitle: string,
  ) {
    if (!selectedInvoice) return;
    await runInvoiceAction(
      () => action(selectedInvoice.id, payment.id),
      successTitle,
    );
  }

  function renderPaymentRecoveryActions(payment: InvoicePayment) {
    if (!selectedInvoice || payment.status !== "succeeded") return null;
    const isStripe =
      payment.method.toLowerCase() === "stripe" ||
      Boolean(payment.stripePaymentIntentId);
    const missingStripeDetails =
      isStripe &&
      payment.stripePaymentIntentId &&
      !payment.stripeBalanceTransactionId;
    const pendingStripeMethod =
      isStripe && payment.method === "Stripe Details Pending";
    const missingQboPayment =
      !pendingStripeMethod &&
      (!payment.qboPaymentId || payment.qboSyncStatus === "error");
    const missingManualDeposit = Boolean(
      payment.qboPaymentId &&
      !payment.qboDepositId &&
      !payment.stripeBalanceTransactionId &&
      !payment.stripePaymentIntentId,
    );
    const missingPayoutDeposit = Boolean(
      payment.stripePayoutId && payment.qboPaymentId && !payment.qboDepositId,
    );

    if (
      !missingStripeDetails &&
      !missingQboPayment &&
      !missingManualDeposit &&
      !missingPayoutDeposit
    )
      return null;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {missingStripeDetails && (
          <Button
            label="Stripe"
            size="small"
            style="secondary"
            icon={RefreshCw}
            onClick={() =>
              void runPaymentRecovery(
                payment,
                retryStripeDetails,
                "Stripe Details Retried",
              )
            }
            properties={{ disabled: actionBusy }}
          />
        )}
        {missingQboPayment && (
          <Button
            label="QBO Pay"
            size="small"
            style="secondary"
            icon={RefreshCw}
            onClick={() =>
              void runPaymentRecovery(
                payment,
                retryQboPayment,
                "QBO Payment Retried",
              )
            }
            properties={{ disabled: actionBusy }}
          />
        )}
        {missingManualDeposit && (
          <Button
            label="Deposit"
            size="small"
            style="secondary"
            icon={RefreshCw}
            onClick={() =>
              void runPaymentRecovery(
                payment,
                retryQboDeposit,
                "QBO Deposit Retried",
              )
            }
            properties={{ disabled: actionBusy }}
          />
        )}
        {missingPayoutDeposit && (
          <Button
            label="Payout"
            size="small"
            style="secondary"
            icon={RefreshCw}
            onClick={() =>
              void runPaymentRecovery(
                payment,
                retryPayoutSync,
                "Payout Sync Retried",
              )
            }
            properties={{ disabled: actionBusy }}
          />
        )}
      </div>
    );
  }

  async function copyPublicLink() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    showNotification({
      title: "Payment Link Copied",
      body: (
        <p>
          Link for invoice <strong>{selectedInvoice?.invoiceNumber}</strong> is
          in your clipboard. Use ctrl + v to paste into other text applications.
        </p>
      ),
      style: "success",
    });
  }

  async function downloadSelectedInvoicePdf() {
    if (!selectedInvoice) return;
    await downloadInvoicePdf(selectedInvoice, publicUrl);
  }

  async function openSelectedInvoicePdfPreview() {
    if (!selectedInvoice) return;
    const opened = await openInvoicePdfPreview(selectedInvoice, publicUrl);
    if (!opened) {
      showNotification({
        title: "Preview Blocked",
        body: "Enable pop-ups for this site to preview the PDF.",
        style: "warning",
      });
    }
  }

  async function sendSelectedInvoiceWithPdf() {
    if (!selectedInvoice) return;
    if (selectedInvoiceSendBlockMessage) {
      showNotification({
        title: "Invoice Cannot Be Sent",
        body: selectedInvoiceSendBlockMessage,
        style: "warning",
      });
      return;
    }
    const attachment = await createInvoicePdfAttachment(
      invoiceForEmailAttachment(selectedInvoice),
      publicUrl,
    );
    await runInvoiceAction(
      () =>
        sendInvoice(
          selectedInvoice.id,
          attachment,
          bccSender ? senderEmail : "",
        ),
      "Invoice Sent",
    );
  }

  async function refreshSelectedInvoiceProjectAddress() {
    if (!selectedInvoice) return;
    await runInvoiceAction(
      () => refreshInvoiceProjectAddress(selectedInvoice.id),
      "Project Address Refreshed",
    );
  }

  function getInvoicePublicUrl(invoice: Invoice): string {
    return `${window.location.origin}/pay/${encodeURIComponent(invoice.publicToken)}`;
  }

  async function copyInvoicePublicLink(invoice: Invoice) {
    const url = getInvoicePublicUrl(invoice);
    await navigator.clipboard.writeText(url);
    showNotification({
      title: "Payment Link Copied",
      body: (
        <p>
          The payment link for invoice <strong>{invoice.invoiceNumber}</strong>{" "}
          is in your clipboard. Use ctrl + v to paste into other text
          applications.
        </p>
      ),
      style: "success",
    });
  }

  async function previewInvoicePdf(invoice: Invoice) {
    const fullInvoice = await fetchInvoice(invoice.id);
    const opened = await openInvoicePdfPreview(
      fullInvoice,
      getInvoicePublicUrl(fullInvoice),
    );
    if (!opened) {
      showNotification({
        title: "Preview Blocked",
        body: "Enable pop-ups for this site to preview the PDF.",
        style: "warning",
      });
    }
  }

  async function emailInvoicePdf(invoice: Invoice) {
    const fullInvoice = await fetchInvoice(invoice.id);
    const attachment = await createInvoicePdfAttachment(
      invoiceForEmailAttachment(fullInvoice),
      getInvoicePublicUrl(fullInvoice),
    );
    await runInvoiceRowAction(
      fullInvoice,
      (target) =>
        sendInvoice(target.id, attachment, bccSender ? senderEmail : ""),
      "Invoice Sent",
    );
  }

  function applyQboCustomer(customerId: string) {
    const customer = qboCustomers.find((entry) => entry.id === customerId);
    if (!selectedInvoice) setPreviouslyBilledManuallyEdited(false);
    setForm((previous) => ({
      ...previous,
      qboCustomerId: customerId,
      qboProjectId: "",
      contactIds: [],
      clientName: customer?.displayName || previous.clientName,
      clientEmail: customer?.primaryEmail || previous.clientEmail,
      projectReference: "",
      previouslyBilled: selectedInvoice ? previous.previouslyBilled : "",
    }));
  }

  async function applyQboProject(projectId: string) {
    const project = qboProjects.find((entry) => entry.id === projectId);
    if (!selectedInvoice) setPreviouslyBilledManuallyEdited(false);
    const previouslyBilledCents = getProjectPreviouslyBilledCents(
      summaryInvoices,
      projectId,
    );
    const tasks = selectedInvoice ? [] : await fetchProjectTasks(projectId);
    setForm((previous) => ({
      ...previous,
      qboCustomerId: project?.parentId || previous.qboCustomerId,
      qboProjectId: projectId,
      projectReference: project?.displayName || "",
      lineItems:
        tasks
          .filter((task) => task.remainingCents > 0)
          .map((task) => ({
            localId: createLocalId(),
            projectTaskId: task.id,
            description: task.name,
            percentComplete: "100",
            contractAmount: (task.remainingCents / 100).toFixed(2),
            billInFull: false,
          })).length > 0
          ? tasks
              .filter((task) => task.remainingCents > 0)
              .map((task) => ({
                localId: createLocalId(),
                projectTaskId: task.id,
                description: task.name,
                percentComplete: "100",
                contractAmount: (task.remainingCents / 100).toFixed(2),
                billInFull: false,
              }))
          : previous.lineItems,
      previouslyBilled: selectedInvoice
        ? previous.previouslyBilled
        : centsToInput(previouslyBilledCents),
    }));
  }

  function isOpenInvoice(invoice: Invoice): boolean {
    return invoice.status === "draft" || invoice.status === "sent";
  }

  function isPastDue(invoice: Invoice): boolean {
    if (!isOpenInvoice(invoice) || !invoice.dueDate) return false;
    const dueDateTime = new Date(`${invoice.dueDate}T00:00:00`).getTime();
    if (!Number.isFinite(dueDateTime)) return false;
    return dueDateTime < new Date(`${todayIsoDate()}T00:00:00`).getTime();
  }

  function getDaysOpen(invoice: Invoice): string {
    if (!invoice.issueDate) return "Unknown";
    const createdDateTime = new Date(invoice.issueDate).getTime();
    if (!Number.isFinite(createdDateTime)) return "Invalid issue date";
    const closedDate = invoice.paidDate || invoice.voidDate;
    const endDateTime = closedDate
      ? new Date(closedDate).getTime()
      : new Date(`${todayIsoDate()}T00:00:00`).getTime();
    if (!Number.isFinite(endDateTime)) return "Invalid close date";
    const daysOpen = Math.max(
      0,
      Math.floor((endDateTime - createdDateTime) / (1000 * 60 * 60 * 24)),
    );
    return `${daysOpen} day${daysOpen !== 1 ? "s" : ""}`;
  }

  const sortedInvoices = useMemo(() => {
    return showClosedInvoices
      ? invoices
      : invoices.filter(
          (invoice) => invoice.status !== "paid" && invoice.status !== "void",
        );
  }, [invoices, showClosedInvoices]);
  const openInvoices = useMemo(
    () => summaryInvoices.filter((invoice) => isOpenInvoice(invoice)),
    [summaryInvoices],
  );
  const openInvoiceAmountCents = useMemo(
    () => openInvoices.reduce((sum, invoice) => sum + invoice.totalCents, 0),
    [openInvoices],
  );
  const pastDueCount = useMemo(
    () => summaryInvoices.filter((invoice) => isPastDue(invoice)).length,
    [summaryInvoices],
  );
  const markPaidModal = (
    <Modal
      title="Record Invoice Payment"
      isOpen={Boolean(markPaidInvoice)}
      acceptText="Record"
      closeText="Cancel"
      size="lg"
      colorMode="auto"
      acceptDisabled={
        actionBusy ||
        !paymentMethod ||
        centsFromInput(paymentAmount) <= 0 ||
        !paymentDate ||
        (requiresPaymentReference && !paymentReferenceNumber.trim())
      }
      onAccept={() => void confirmMarkPaid()}
      onClose={() => setMarkPaidInvoice(null)}
    >
      <div className="space-y-4">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="font-semibold">{markPaidInvoice?.invoiceNumber}</p>
          <p className="text-gray-600 dark:text-gray-400">
            {markPaidInvoice?.clientName} - Balance{" "}
            {markPaidInvoice
              ? formatCurrency(getInvoiceAmountDueCents(markPaidInvoice))
              : ""}
          </p>
        </div>
        <Combobox
          field="manual-payment-kind"
          label="Record Type"
          colorMode="auto"
          selections={[
            { key: "Payment", value: "payment" },
            { key: "Deposit", value: "deposit" },
          ]}
          value={paymentKind}
          onChange={(_, value) =>
            setPaymentKind(value === "deposit" ? "deposit" : "payment")
          }
        />
        <Combobox
          field="manual-payment-method"
          label="Payment Method"
          colorMode="auto"
          selections={paymentMethodOptions}
          value={paymentMethod}
          onChange={(_, value) => {
            setPaymentMethod(value);
            if (value !== "Check") setPaymentReferenceNumber("");
          }}
        />
        {paymentMethod === "Check" && (
          <Textbox
            field="manual-payment-reference"
            label="Check Number"
            colorMode="auto"
            value={paymentReferenceNumber}
            onChange={(event) => setPaymentReferenceNumber(event.target.value)}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Textbox
            field="manual-payment-amount"
            label="Amount"
            colorMode="auto"
            type="number"
            min="0"
            step="0.01"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
          />
          <Textbox
            field="manual-payment-date"
            label="Paid Date"
            colorMode="auto"
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
          />
        </div>
        <Textarea
          field="manual-payment-note"
          label="Payment Note"
          colorMode="auto"
          value={paymentNote}
          onChange={(event) => setPaymentNote(event.target.value)}
          placeholder="ACH reference, correction reason, or other detail"
        />
      </div>
    </Modal>
  );

  if (mode === "overview") {
    return (
      <div className="h-full min-h-0 text-gray-900 dark:text-gray-100">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review open billing, send invoices, and reconcile payments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              label="Client Invoice Report"
              style="secondary"
              icon={File}
              onClick={() => setClientReportOpen(true)}
            />
            <Button
              label="Refresh"
              style="secondary"
              icon={RefreshCw}
              onClick={() => void loadInvoices()}
              properties={{ disabled: loading }}
            />
            {senderEmail && (
              <Button
                label="BCC"
                style={bccSender ? "success" : "secondary"}
                icon={bccSender ? Check : X}
                onClick={() => setBccSender((previous) => !previous)}
                properties={{ disabled: loading }}
              />
            )}
            <Button
              label="New Invoice"
              style="primary"
              icon={Plus}
              onClick={startNewInvoice}
            />
          </div>
        </div>

        <InvoiceOverviewStats
          openInvoiceCount={openInvoices.length}
          openInvoiceAmountCents={openInvoiceAmountCents}
          pastDueCount={pastDueCount}
        />

        <ClientAccountReport
          clients={qboCustomers}
          isOpen={clientReportOpen}
          onClose={() => setClientReportOpen(false)}
        />

        {markPaidModal}

        <section className="rounded-md border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 grid gap-3 lg:grid-cols-[1fr_220px_auto]">
            <Textbox
              field="invoice-search"
              label="Search"
              colorMode="auto"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Number, client, project, PO"
            />
            <Combobox
              field="invoice-status-filter"
              label="Status"
              colorMode="auto"
              value={statusFilter}
              onChange={(_, value) =>
                setStatusFilter(value as InvoiceListStatusFilter)
              }
              selections={invoiceStatusFilterOptions}
            />
            <div className="flex items-end">
              <Button
                label="Closed"
                style={showClosedInvoices ? "success" : "secondary"}
                icon={showClosedInvoices ? Check : X}
                onClick={() => setShowClosedInvoices((previous) => !previous)}
                properties={{
                  disabled: loading,
                  title: showClosedInvoices
                    ? "Hide paid and void invoices"
                    : "Show paid and void invoices",
                }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                  <th className="py-2 pr-2">Invoice</th>
                  <th className="px-2">Client</th>
                  <th className="px-2">Project</th>
                  <th className="px-2">PO</th>
                  <th className="px-2">Issued</th>
                  <th className="px-2">Due</th>
                  <th className="px-2">Days Open</th>
                  <th className="px-2">Status</th>
                  <th className="px-2 text-right">Amount</th>
                  <th className="py-2 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="py-6 text-center text-gray-500" colSpan={10}>
                      Loading invoices...
                    </td>
                  </tr>
                )}
                {!loading && sortedInvoices.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-gray-500" colSpan={10}>
                      No invoices found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  sortedInvoices.map((invoice) => {
                    const isClosed =
                      invoice.status === "paid" || invoice.status === "void";
                    return (
                      <tr
                        key={invoice.id}
                        className="border-b border-gray-100 align-middle dark:border-gray-700"
                      >
                        <td
                          className="py-3 pr-2 font-semibold cursor-pointer"
                          onClick={() => void selectInvoice(invoice.id)}
                        >
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-2">
                          {invoice.qboCustomerId ? (
                            <Link
                              to={`/clients?clientId=${encodeURIComponent(invoice.qboCustomerId)}`}
                              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                            >
                              {invoice.clientName}
                            </Link>
                          ) : (
                            invoice.clientName
                          )}
                        </td>
                        <td className="px-2 text-gray-600 dark:text-gray-300">
                          {invoice.qboProjectId ? (
                            <Link
                              to={`/projects?projectId=${encodeURIComponent(invoice.qboProjectId)}`}
                              className="font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                            >
                              {invoice.projectReference || invoice.qboProjectId}
                            </Link>
                          ) : (
                            invoice.projectReference || "-"
                          )}
                        </td>
                        <td className="px-2 text-gray-600 dark:text-gray-300">
                          {invoice.poNumber || "-"}
                        </td>
                        <td className="px-2">
                          {formatDate(invoice.issueDate)}
                        </td>
                        <td
                          className={`px-2 ${isPastDue(invoice) ? "font-semibold text-red-700 dark:text-red-300" : ""}`}
                        >
                          {formatDate(invoice.dueDate) || "-"}
                        </td>
                        <td className="px-2">{getDaysOpen(invoice)}</td>
                        <td className="px-2">
                          <div className="flex flex-col items-start">
                            <StatusBadge status={invoice.status} />
                            <EmailDeliveryNotice invoice={invoice} compact />
                          </div>
                        </td>
                        <td className="px-2 text-right font-semibold">
                          {formatCurrency(invoice.totalCents)}
                        </td>
                        <td className="py-2 pl-2">
                          <div className="flex flex-wrap justify-end gap-1">
                            {(invoice.status === "draft" ||
                              invoice.status === "sent") && (
                              <>
                                <Button
                                  size="small"
                                  style="success"
                                  icon={Mail}
                                  onClick={() => void emailInvoicePdf(invoice)}
                                  properties={{
                                    disabled: actionBusy || isClosed,
                                    title: "Email Invoice",
                                  }}
                                />
                                <Button
                                  size="small"
                                  style="secondary"
                                  icon={Banknote}
                                  onClick={() => openMarkPaidModal(invoice)}
                                  properties={{
                                    disabled: actionBusy || isClosed,
                                    title: "Mark as Paid",
                                  }}
                                />
                                <Button
                                  size="small"
                                  style="danger"
                                  icon={X}
                                  onClick={() =>
                                    void runInvoiceRowAction(
                                      invoice,
                                      (target) =>
                                        voidInvoice(
                                          target.id,
                                          target.internalNote ||
                                            "Voided by staff.",
                                        ),
                                      "Invoice Voided",
                                    )
                                  }
                                  properties={{
                                    disabled: actionBusy || isClosed,
                                    title: "Void Invoice",
                                  }}
                                />
                              </>
                            )}
                            <Button
                              size="small"
                              style="textonly"
                              icon={File}
                              onClick={() => void previewInvoicePdf(invoice)}
                              colorMode="auto"
                              properties={{ title: "Preview Invoice PDF" }}
                            />
                            <Button
                              size="small"
                              style="textonly"
                              icon={CopyPlus}
                              onClick={() => void copyInvoiceIntoDraft(invoice)}
                              colorMode="auto"
                              properties={{
                                disabled: actionBusy,
                                title: "Copy Invoice To New Draft",
                              }}
                            />
                            <Button
                              size="small"
                              style="textonly"
                              icon={Copy}
                              onClick={() =>
                                void copyInvoicePublicLink(invoice)
                              }
                              colorMode="auto"
                              properties={{ title: "Copy Invoice Public Link" }}
                            />
                            <Button
                              size="small"
                              style="textonly"
                              icon={SquareArrowOutUpRight}
                              onClick={() => void selectInvoice(invoice.id)}
                              colorMode="auto"
                              properties={{ title: "Open Invoice" }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 text-gray-900 dark:text-gray-100">
      {markPaidModal}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <Button
            label="Back"
            style="textonly"
            icon={ArrowLeft}
            onClick={returnToOverview}
            colorMode="auto"
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">
              {selectedInvoice?.invoiceNumber ?? "New Invoice"}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Save Button. If nothing to save, hide. */}
          {!saving && canSaveInvoice && (
            <Button
              label="Save"
              style="primary"
              icon={Save}
              onClick={() => void saveInvoiceForm()}
              properties={{ disabled: saving || !canSaveInvoice }}
            />
          )}
          <div className="flex flex-col gap-2 bg-gray-50 p-2 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 text-center">
              Helper Functions
            </h2>
            <div className="flex flex-row gap-2 justify-center">
              {selectedInvoice && (
                <Button
                  style="textonly"
                  icon={Copy}
                  onClick={() => void copyPublicLink()}
                  colorMode="auto"
                  properties={{ title: "Copy Payment Link to Clipboard" }}
                />
              )}
              {selectedInvoice && (
                <Button
                  style="textonly"
                  icon={ExternalLink}
                  onClick={() => void openSelectedInvoicePdfPreview()}
                  colorMode="auto"
                  properties={{ title: "Open PDF preview in new tab" }}
                />
              )}
              {selectedInvoice && (
                <Button
                  style="textonly"
                  icon={Download}
                  onClick={() => void downloadSelectedInvoicePdf()}
                  colorMode="auto"
                  properties={{ title: "Download PDF" }}
                />
              )}
              {selectedInvoice && (
                <Button
                  style="textonly"
                  icon={CopyPlus}
                  onClick={() => void copyInvoiceIntoDraft(selectedInvoice)}
                  colorMode="auto"
                  properties={{
                    disabled: actionBusy,
                    title: "Copy Invoice To New Draft",
                  }}
                />
              )}
              {selectedInvoice && (
                <Button
                  style="textonly"
                  icon={RefreshCw}
                  onClick={() => void refreshSelectedInvoiceProjectAddress()}
                  colorMode="auto"
                  properties={{
                    disabled:
                      actionBusy ||
                      !selectedInvoice.qboProjectId ||
                      selectedInvoice.status === "void",
                    title: "Refresh Project Address",
                  }}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-gray-50 p-2 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 text-center">
              Interaction Functions
            </h2>
            <div className="flex flex-row gap-2 justify-center">
              {selectedInvoice && (
                <Button
                  style="success"
                  icon={Mail}
                  onClick={() => void sendSelectedInvoiceWithPdf()}
                  properties={{
                    disabled: actionBusy || !canSendSelectedInvoice,
                    title: selectedInvoiceSendBlockMessage || "Email Invoice",
                  }}
                />
              )}
              {selectedInvoice && (
                <Button
                  style="secondary"
                  icon={Banknote}
                  onClick={() => openMarkPaidModal(selectedInvoice)}
                  properties={{
                    disabled:
                      actionBusy ||
                      selectedInvoice.status === "paid" ||
                      selectedInvoice.status === "void",
                  }}
                />
              )}
              {selectedInvoice && (
                <Button
                  style="danger"
                  icon={X}
                  onClick={() =>
                    void runInvoiceAction(
                      () =>
                        voidInvoice(
                          selectedInvoice.id,
                          form.internalNote || "Voided by staff.",
                        ),
                      "Invoice Voided",
                    )
                  }
                  properties={{
                    disabled:
                      actionBusy ||
                      selectedInvoice.status === "paid" ||
                      selectedInvoice.status === "void",
                  }}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-gray-50 p-2 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 text-center">
              BCC Myself
            </h2>
            <div className="flex flex-row gap-2 justify-center">
              {selectedInvoice && senderEmail && (
                <Button
                  style={bccSender ? "success" : "secondary"}
                  icon={bccSender ? Check : X}
                  onClick={() => setBccSender((previous) => !previous)}
                  properties={{ disabled: loading }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="min-h-0 rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {selectedInvoice && (
          <div className="mb-4 flex items-center gap-2">
            <StatusBadge status={selectedInvoice.status} />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created {formatDate(selectedInvoice.createdDate)}
              {selectedInvoice.paidDate
                ? ` · Paid ${formatDate(selectedInvoice.paidDate)}`
                : ""}
              {selectedInvoice.qboSyncStatus
                ? ` · QBO ${selectedInvoice.qboSyncStatus}`
                : ""}
            </p>
          </div>
        )}
        {selectedInvoice && <EmailDeliveryNotice invoice={selectedInvoice} />}

        <div className="grid gap-4 xl:grid-cols-2">
          <Combobox
            field="qbo-customer"
            label="Client"
            colorMode="auto"
            selections={qboCustomers.map((customer) => ({
              key: customer.displayName,
              value: customer.id,
            }))}
            value={form.qboCustomerId}
            placeholder={
              qboStatus?.connected ? "Select client" : "Connect QBO first"
            }
            disabled={!canEdit || !qboStatus?.connected}
            onChange={(_, value) => applyQboCustomer(value)}
          />
          <Combobox
            field="qbo-project"
            label="Project"
            colorMode="auto"
            selections={qboProjects.map((project) => ({
              key: project.displayName,
              value: project.id,
            }))}
            value={form.qboProjectId}
            placeholder={
              form.qboCustomerId ? "Select project" : "Select client first"
            }
            disabled={!canEdit || !form.qboCustomerId}
            onChange={(_, value) => void applyQboProject(value)}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Selected Client
              </p>
              {selectedCustomer ? (
                <Link
                  to={`/clients?clientId=${encodeURIComponent(selectedCustomer.id)}`}
                  className="mt-1 block text-sm font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                >
                  {selectedCustomer.displayName}
                </Link>
              ) : (
                <p className="mt-1 text-sm font-semibold">No client selected</p>
              )}
              <p className="mt-1 text-sm dark:text-white">
                {selectedCustomer?.billAddrLine1}
                {selectedCustomer?.billAddrLine2
                  ? `, ${selectedCustomer.billAddrLine2}`
                  : ""}
              </p>
              <p className="mt-1 text-sm dark:text-white">
                {selectedCustomer?.billAddrCity},{" "}
                {selectedCustomer?.billAddrState}{" "}
                {selectedCustomer?.billAddrPostalCode}
              </p>
              {projectClientMismatch && (
                <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
                  This invoice is saved to a client that no longer matches the
                  project parent in QuickBooks.
                </p>
              )}
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Selected Project
              </p>
              {selectedProject ? (
                <Link
                  to={`/projects?projectId=${encodeURIComponent(selectedProject.id)}`}
                  className="mt-1 block text-sm font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                >
                  {selectedProject.displayName}
                </Link>
              ) : (
                <p className="mt-1 text-sm font-semibold">
                  No project selected
                </p>
              )}
              {selectedProject && (
                <>
                  <p className="mt-1 text-sm dark:text-white">
                    {selectedProject?.billAddrLine1}
                    {selectedProject?.billAddrLine2
                      ? `, ${selectedProject.billAddrLine2}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm dark:text-white">
                    {selectedProject?.billAddrCity},{" "}
                    {selectedProject?.billAddrState}{" "}
                    {selectedProject?.billAddrPostalCode}
                  </p>
                  <p
                    className={`mt-2 text-sm ${currentProjectManager ? "text-gray-600 dark:text-gray-300" : "font-semibold text-amber-700 dark:text-amber-300"}`}
                  >
                    {currentProjectManager
                      ? `Internal manager: ${currentProjectManager.managerName || currentProjectManager.managerEmail}`
                      : "Internal manager required before sending."}
                  </p>
                  {projectClientMismatch && (
                    <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
                      This invoice is saved to a client that no longer matches
                      the project parent in QuickBooks.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Invoice Contacts</p>
              {form.clientEmail && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Primary: {form.clientEmail}
                </p>
              )}
            </div>
            {!form.qboCustomerId && (
              <p className="text-sm text-gray-500">
                Select a client to load contacts.
              </p>
            )}
            {form.qboCustomerId && clientContacts.length === 0 && (
              <p className="text-sm text-gray-500">
                No active invoice contacts found for this client.
              </p>
            )}
            {clientContacts.length > 0 && (
              <Multiselect
                field="invoice-contacts"
                label="Recipients"
                colorMode="auto"
                options={clientContacts.map((contact) => ({
                  key: `${contact.name}${contact.role && ` - ${contact.role}`}`,
                  value: `${contact.email}`,
                  exportValue: contact.id,
                }))}
                value={form.contactIds}
                onValueChange={(_, values) => updateContactIds(values)}
              />
            )}
          </div>
          <Textbox
            field="po-number"
            label="PO Number"
            colorMode="auto"
            value={form.poNumber}
            onChange={(event) =>
              updateFormField("poNumber", event.target.value)
            }
            disabled={!canEdit}
          />
          <Textbox
            field="previously-billed"
            label="Previously Billed"
            colorMode="auto"
            type="number"
            min="0"
            step="0.01"
            value={form.previouslyBilled}
            onChange={(event) =>
              updateFormField("previouslyBilled", event.target.value)
            }
            disabled={!canEdit}
          />
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
            <Textbox
              field="issue-date"
              label="Issue Date"
              colorMode="auto"
              type="date"
              value={form.issueDate}
              onChange={(event) =>
                updateFormField("issueDate", event.target.value)
              }
              disabled={!canEdit}
              required
            />
            <Textbox
              field="due-date"
              label="Due Date"
              colorMode="auto"
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                updateFormField("dueDate", event.target.value)
              }
              disabled={!canEdit}
            />
            <Combobox
              field="due-date-term"
              label="Terms"
              colorMode="auto"
              selections={dueDateTermOptions}
              value={dueDateTerm}
              placeholder="Quick"
              disabled={!canEdit}
              onChange={(_, value) => {
                setDueDateTerm(value);
                const days = Number(value);
                if (Number.isFinite(days)) {
                  applyDueDateTerm(days);
                }
              }}
            />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Line Items</h3>
            <Button
              label="Add Line"
              style="secondary"
              size="small"
              icon={Plus}
              onClick={addLineItem}
              properties={{ disabled: !canEdit }}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                  <th className="py-2 pr-2">Description</th>
                  <th className="w-32 px-2">% Complete</th>
                  <th className="w-40 px-2">Contract Amount</th>
                  <th className="w-24 px-2 text-center">Bill Full</th>
                  <th className="w-36 px-2 text-right">Current Billing</th>
                  <th className="w-12 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {form.lineItems.map((item) => {
                  const amountCents = getLineItemAmountCents(item);
                  return (
                    <tr
                      key={item.localId}
                      className="border-b border-gray-100 dark:border-gray-700"
                    >
                      <td className="py-2 pr-2">
                        <input
                          value={item.description}
                          onChange={(event) =>
                            updateLineItem(
                              item.localId,
                              "description",
                              event.target.value,
                            )
                          }
                          disabled={!canEdit}
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                        />
                      </td>
                      <td className="px-2">
                        <input
                          value={item.percentComplete}
                          onChange={(event) =>
                            updateLineItem(
                              item.localId,
                              "percentComplete",
                              event.target.value,
                            )
                          }
                          disabled={!canEdit}
                          type="number"
                          min="0"
                          step="0.1"
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                        />
                      </td>
                      <td className="px-2">
                        <input
                          value={item.contractAmount}
                          onChange={(event) =>
                            updateLineItem(
                              item.localId,
                              "contractAmount",
                              event.target.value,
                            )
                          }
                          disabled={!canEdit}
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                        />
                      </td>
                      <td className="px-2 text-center">
                        <input
                          type="checkbox"
                          checked={item.billInFull}
                          onChange={(event) =>
                            updateLineItem(
                              item.localId,
                              "billInFull",
                              event.target.checked,
                            )
                          }
                          disabled={!canEdit}
                          title="Bill this line without applying previously billed deductions"
                          aria-label="Bill this line in full"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 disabled:opacity-50 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-2 text-right font-semibold">
                        {formatCurrency(amountCents)}
                      </td>
                      <td className="pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.localId)}
                          disabled={!canEdit || form.lineItems.length === 1}
                          className="rounded p-2 text-red-600 hover:bg-red-50 disabled:text-gray-300 dark:hover:bg-red-950"
                          aria-label="Remove line item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end">
            <div className="w-full max-w-sm space-y-1 text-sm">
              {formPreviouslyBilledCents > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>Current work total</span>
                    <span className="font-semibold">
                      {formatCurrency(formTotalCents)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Previously billed</span>
                    <span className="font-semibold">
                      ({formatCurrency(formPreviouslyBilledCents)})
                    </span>
                  </div>
                </>
              )}
              <div
                className={`flex justify-between text-lg font-bold ${formPreviouslyBilledCents > 0 && "pt-2 border-t border-gray-200  dark:border-gray-700"}`}
              >
                <span>Amount due</span>
                <span>{formatCurrency(formAmountDueCents)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <Textarea
            field="invoice-notes"
            label="Client Notes"
            colorMode="auto"
            value={form.notes}
            onChange={(event) => updateFormField("notes", event.target.value)}
            disabled={!canEdit}
          />
          <Textarea
            field="invoice-internal-note"
            label="Internal / Manual Payment Note"
            colorMode="auto"
            value={form.internalNote}
            onChange={(event) =>
              updateFormField("internalNote", event.target.value)
            }
          />
        </div>

        {selectedInvoice && (
          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Payment Ledger</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-gray-600 dark:text-gray-400">
                  Paid {formatCurrency(getInvoicePaidCents(selectedInvoice))} -
                  Due{" "}
                  {formatCurrency(getInvoiceAmountDueCents(selectedInvoice))}
                </p>
                {hasUnsyncedSuccessfulPayments && (
                  <Button
                    label="Sync QBO Payments"
                    size="small"
                    style="secondary"
                    icon={RefreshCw}
                    onClick={() =>
                      void runInvoiceAction(
                        () => syncInvoicePayments(selectedInvoice.id),
                        "QBO Payments Synced",
                      )
                    }
                    properties={{ disabled: actionBusy }}
                  />
                )}
              </div>
            </div>
            {selectedInvoice.payments.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400">
                No payment records yet.
              </p>
            )}
            {selectedInvoice.payments.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[940px] border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                        <th className="py-2 pr-2">Date</th>
                        <th className="px-2">Type</th>
                        <th className="px-2">Method</th>
                        <th className="px-2">Reference</th>
                        <th className="px-2 text-right">Gross</th>
                        <th className="px-2 text-right">Fee</th>
                        <th className="px-2 text-right">Net</th>
                        <th className="px-2">QBO</th>
                        <th className="px-2">Actions</th>
                        <th className="py-2 pl-2">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-gray-100 dark:border-gray-700"
                        >
                          <td className="py-2 pr-2">
                            {formatDate(payment.paidDate)}
                          </td>
                          <td className="px-2 capitalize">{payment.kind}</td>
                          <td className="px-2">{payment.method}</td>
                          <td className="px-2">
                            {payment.referenceNumber || "-"}
                          </td>
                          <td className="px-2 text-right font-semibold">
                            {formatCurrency(payment.grossCents)}
                          </td>
                          <td className="px-2 text-right">
                            {formatCurrency(payment.feeCents)}
                          </td>
                          <td className="px-2 text-right">
                            {formatCurrency(payment.netCents)}
                          </td>
                          <td className="px-2">
                            {payment.qboSyncStatus === "error"
                              ? payment.qboSyncMessage || "error"
                              : payment.qboDepositId
                                ? "deposit synced"
                                : payment.qboPaymentId &&
                                    payment.stripeBalanceTransactionId &&
                                    !payment.stripePayoutId
                                  ? "payout pending"
                                  : payment.qboPaymentId
                                    ? "synced"
                                    : "-"}
                          </td>
                          <td className="px-2">
                            {renderPaymentRecoveryActions(payment)}
                          </td>
                          <td className="py-2 pl-2">{payment.note || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hasPendingStripePayoutReconciliation && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Stripe payout reconciliation usually completes within a few
                    minutes. Allow up to 48 hours after payout before treating
                    missing QBO deposit or fee records as an issue.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
// #endregion

// #region PayInvoicePage
function getStripeAppearance() {
  const darkMode =
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#1d4ed8",
      colorBackground: darkMode ? "#1f2937" : "#ffffff",
      colorText: darkMode ? "#f3f4f6" : "#111827",
      colorDanger: "#b91c1c",
      colorTextSecondary: darkMode ? "#d1d5db" : "#4b5563",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      borderRadius: "6px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`,
        boxShadow: "none",
      },
      ".Input:focus": {
        borderColor: "#2563eb",
        boxShadow: "0 0 0 1px #2563eb",
      },
      ".Label": {
        fontWeight: "600",
      },
      ".Tab": {
        border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`,
        boxShadow: "none",
      },
      ".Tab--selected": {
        borderColor: "#2563eb",
        boxShadow: "0 0 0 1px #2563eb",
      },
    },
  };
}

function EmbeddedInvoicePaymentForm({
  amountCents,
  onError,
  onPaymentSubmitted,
}: {
  amountCents: number;
  onError: (message: string) => void;
  onPaymentSubmitted: () => void;
  onDownloadPdf: () => void;
}) {
  const checkoutState = useCheckoutElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const checkoutReady = checkoutState.type === "success";

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checkoutState.type !== "success") return;
    setSubmitting(true);
    setMessage("");
    onError("");
    const returnUrl = `${window.location.origin}${window.location.pathname}?payment=success`;
    const result = await checkoutState.checkout.confirm({
      redirect: "if_required",
    });

    if (result.type === "error") {
      onError(result.error.message || "Payment could not be completed.");
      setSubmitting(false);
      return;
    }

    if (result.session.status.type === "complete") {
      window.history.replaceState(null, "", returnUrl);
      setMessage("Payment received. Thank you.");
      onPaymentSubmitted();
      setSubmitting(false);
      return;
    }

    setMessage(
      "Payment was submitted. This invoice will update when Stripe confirms the payment.",
    );
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={(event) => void submitPayment(event)}
      className="w-full space-y-4"
    >
      {checkoutState.type === "error" && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
          {checkoutState.error.message}
        </p>
      )}
      <PaymentElement options={{ layout: "auto" }} />
      <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">
        Card and bank details are securely processed by Stripe. White Point does
        not store payment details. See Stripe's{" "}
        <a
          href="https://stripe.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Privacy Policy
        </a>{" "}
        for more information.
      </p>
      {message && (
        <p className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-100">
          {message}
        </p>
      )}
      <div className="flex flex-row justify-end">
        <button
          type="submit"
          disabled={!checkoutReady || submitting}
          className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CreditCard className="h-4 w-4" />
          {submitting
            ? "Submitting Payment"
            : `Pay ${formatCurrency(amountCents)}`}
        </button>
      </div>
    </form>
  );
}

const stripePromiseCache = new Map<string, ReturnType<typeof loadStripe>>();

function getStripePromise(
  publishableKey: string,
): ReturnType<typeof loadStripe> {
  const cachedPromise = stripePromiseCache.get(publishableKey);
  if (cachedPromise) return cachedPromise;
  const nextPromise = loadStripe(publishableKey);
  stripePromiseCache.set(publishableKey, nextPromise);
  return nextPromise;
}

export function PayInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutSession, setCheckoutSession] =
    useState<InvoiceCheckoutSession | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Pay Invoice - White Point Survey";
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPublicInvoice() {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const data = await fetchPublicInvoice(token);
        if (active) setInvoice(data);
      } catch (loadError) {
        if (active) setError(String(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPublicInvoice();
    return () => {
      active = false;
    };
  }, [token]);

  const paymentMessage = searchParams.get("payment");
  const publicAmountDueCents = invoice ? getInvoiceAmountDueCents(invoice) : 0;
  const paymentLooksPaid = Boolean(
    invoice &&
    invoice.status !== "void" &&
    (invoice.status === "paid" ||
      paymentConfirmed ||
      paymentMessage === "success"),
  );
  const displayedAmountDueCents = paymentLooksPaid ? 0 : publicAmountDueCents;
  const displayedPaymentsReceivedCents = invoice
    ? Math.max(0, invoice.totalCents - displayedAmountDueCents)
    : 0;
  const stripePromise = useMemo(
    () =>
      checkoutSession?.publishableKey
        ? getStripePromise(checkoutSession.publishableKey)
        : null,
    [checkoutSession?.publishableKey],
  );
  const stripeOptions = useMemo(
    () =>
      checkoutSession?.clientSecret
        ? {
            clientSecret: checkoutSession.clientSecret,
            elementsOptions: {
              appearance: getStripeAppearance(),
            },
            adaptivePricing: { allowed: true },
          }
        : undefined,
    [checkoutSession?.clientSecret],
  );

  useEffect(() => {
    let active = true;
    async function loadCheckoutSession() {
      if (
        !token ||
        !invoice ||
        paymentLooksPaid ||
        invoice.status === "void" ||
        publicAmountDueCents <= 0
      ) {
        setCheckoutSession(null);
        return;
      }
      setPaymentLoading(true);
      setError("");
      try {
        const data = await createInvoiceCheckoutSession(token);
        if (!data.clientSecret || !data.publishableKey) {
          throw new Error("Stripe payment form is not configured.");
        }
        getStripePromise(data.publishableKey);
        if (active) setCheckoutSession(data);
      } catch (paymentError) {
        if (active) setError(String(paymentError));
      } finally {
        if (active) setPaymentLoading(false);
      }
    }
    void loadCheckoutSession();
    return () => {
      active = false;
    };
  }, [invoice, paymentLooksPaid, publicAmountDueCents, token]);

  async function refreshPublicInvoice() {
    if (!token) return;
    try {
      setInvoice(await fetchPublicInvoice(token));
    } catch {
      // The webhook is the source of truth; leave the submitted state visible if refresh is early.
    }
  }

  async function downloadPublicInvoicePdf() {
    if (!invoice) return;
    await downloadInvoicePdf(
      invoice,
      `${window.location.origin}${window.location.pathname}`,
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8 text-gray-900 dark:bg-neutral-900 dark:text-gray-100">
      <main className="mx-auto max-w-3xl rounded-md border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex flex-col gap-3 items-center sm:flex-row sm:items-start sm:justify-between">
          <div>
            <img
              src="/White_Point_Logo_Name.webp"
              alt="White Point Survey"
              className="mb-4 h-14 w-auto dark:hidden"
            />
            <img
              src="/White_Point_Logo_Name.webp"
              alt="White Point Survey"
              className="mb-4 hidden h-20 w-auto dark:block dark:bg-white dark:p-2 dark:rounded-md"
            />
          </div>
          <div className="text-center sm:text-right">
            <h1 className="text-2xl font-bold">
              Invoice {invoice?.invoiceNumber}
            </h1>
            <h2 className="text-lg font-bold">Submit a Payment</h2>
            {invoice && (
              <button
                type="button"
                onClick={() => void downloadPublicInvoicePdf()}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                <Download className="h-4 w-4" />
                Download{paymentLooksPaid && " Paid"}
                {invoice.status === "void" && " Void"} Invoice
              </button>
            )}
          </div>
        </div>

        {paymentLooksPaid && (
          <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-100 mb-4">
            Payment received. Thank you.
          </div>
        )}
        {paymentMessage === "cancelled" && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 mb-4">
            Checkout was cancelled. You can restart payment below.
          </div>
        )}

        {loading && <p>Loading invoice...</p>}
        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100 mb-4">
            {error}
          </p>
        )}
        {!loading && invoice && (
          <div>
            <div className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Client</p>
                <p className="font-semibold">{invoice.clientName}</p>
                <p>
                  {invoice.billingAddressLine1}
                  {invoice.billingAddressLine2 &&
                    `, ${invoice.billingAddressLine2}`}
                </p>
                <p>
                  {invoice.billingAddressCity}, {invoice.billingAddressState}{" "}
                  {invoice.billingAddressPostalCode}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Project</p>
                <p className="font-semibold">{invoice.projectReference}</p>
                <p>
                  {invoice.projectAddressLine1}
                  {invoice.projectAddressLine2 &&
                    `, ${invoice.projectAddressLine2}`}
                </p>
                <p>
                  {invoice.projectAddressCity}, {invoice.projectAddressState}{" "}
                  {invoice.projectAddressPostalCode}
                </p>
                {invoice.poNumber && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    PO Number: {invoice.poNumber}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Issue Date</p>
                <p className="font-semibold">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Due Date</p>
                <p className="font-semibold">
                  {formatDate(invoice.dueDate) || "Not specified"}
                </p>
              </div>
            </div>

            <table className="mb-5 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                  <th className="py-2">Description</th>
                  <th className="w-24 px-2 text-right">% Complete</th>
                  <th className="w-32 px-2 text-right">Contract</th>
                  <th className="w-32 pl-2 text-right">Current</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 dark:border-gray-700"
                  >
                    <td className="py-2">{item.description}</td>
                    <td className="px-2 text-center">
                      {item.percentComplete.toFixed(2)}%
                    </td>
                    <td className="px-2 text-right">
                      {formatCurrency(item.contractAmountCents)}
                    </td>
                    <td className="pl-2 text-right font-semibold">
                      {formatCurrency(item.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mb-5 flex justify-end">
              <div className="w-full max-w-sm space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current work total</span>
                  <span className="font-semibold">
                    {formatCurrency(invoice.subtotalCents)}
                  </span>
                </div>
                {invoice.previouslyBilledCents > 0 && (
                  <div className="flex justify-between">
                    <span>Previously billed</span>
                    <span className="font-semibold">
                      ({formatCurrency(invoice.previouslyBilledCents)})
                    </span>
                  </div>
                )}
                {displayedPaymentsReceivedCents > 0 && (
                  <div className="flex justify-between">
                    <span>Payments received</span>
                    <span className="font-semibold">
                      ({formatCurrency(displayedPaymentsReceivedCents)})
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 mt-2 pt-1 text-lg font-bold dark:border-gray-700">
                  <span>Amount due</span>
                  <span>{formatCurrency(displayedAmountDueCents)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <p className="mb-5 whitespace-pre-line rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-900">
                {invoice.notes}
              </p>
            )}

            <div className="flex justify-end">
              {paymentLooksPaid && (
                <p className="font-semibold text-green-700 dark:text-green-300">
                  This invoice is paid.
                </p>
              )}
              {invoice.status === "void" && (
                <p className="font-semibold text-red-700 dark:text-red-300">
                  This invoice is void and cannot be paid.
                </p>
              )}
              {!paymentLooksPaid &&
                invoice.status !== "void" &&
                displayedAmountDueCents > 0 &&
                paymentLoading && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Loading secure payment form...
                  </p>
                )}
              {!paymentLooksPaid &&
                invoice.status !== "void" &&
                displayedAmountDueCents > 0 &&
                stripePromise &&
                stripeOptions && (
                  <CheckoutElementsProvider
                    stripe={stripePromise}
                    options={stripeOptions}
                  >
                    <EmbeddedInvoicePaymentForm
                      amountCents={publicAmountDueCents}
                      onError={setError}
                      onPaymentSubmitted={() => {
                        setPaymentConfirmed(true);
                        setCheckoutSession(null);
                        void refreshPublicInvoice();
                      }}
                      onDownloadPdf={downloadPublicInvoicePdf}
                    />
                  </CheckoutElementsProvider>
                )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
// #endregion

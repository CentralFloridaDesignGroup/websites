import type {
  InvoiceBundle,
  InvoiceBundleCreatePayload,
  InvoiceBundleListResponse,
  InvoiceBundleUpdatePayload,
  InvoiceV2,
  InvoiceV2CreatePayload,
  InvoiceV2ListResponse,
  InvoiceV2UpdatePayload,
  NorthstarPageSize,
} from "cfdg/types";
import { requestJson } from "./client";

export type InvoiceListOptions = {
  page: number;
  pageSize: NorthstarPageSize;
  status?: string;
  projectId?: string;
  customerId?: string;
  search?: string;
};

function listQuery(options: InvoiceListOptions): string {
  const params = new URLSearchParams({ page: String(options.page), pageSize: String(options.pageSize), sort: "created", direction: "desc" });
  if (options.status) params.set("status", options.status);
  if (options.projectId) params.set("projectId", options.projectId);
  if (options.customerId) params.set("customerId", options.customerId);
  if (options.search) params.set("search", options.search);
  return params.toString();
}

export async function fetchInvoices(options: InvoiceListOptions): Promise<InvoiceV2ListResponse> {
  return requestJson<InvoiceV2ListResponse>(`/v2/invoices?${listQuery(options)}`);
}

export async function fetchInvoice(id: string): Promise<InvoiceV2> {
  const response = await requestJson<{ invoice: InvoiceV2 }>(`/v2/invoices/${encodeURIComponent(id)}`);
  return response.invoice;
}

export async function createInvoice(projectId: string, payload: InvoiceV2CreatePayload): Promise<InvoiceV2> {
  const response = await requestJson<{ invoice: InvoiceV2 }>(`/v2/projects/${encodeURIComponent(projectId)}/invoices`, { method: "POST", body: JSON.stringify(payload) });
  return response.invoice;
}

export async function updateInvoice(id: string, payload: InvoiceV2UpdatePayload): Promise<InvoiceV2> {
  const response = await requestJson<{ invoice: InvoiceV2 }>(`/v2/invoices/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
  return response.invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  await requestJson<void>(`/v2/invoices/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function activateInvoice(id: string): Promise<InvoiceV2> {
  const response = await requestJson<{ invoice: InvoiceV2 }>(`/v2/invoices/${encodeURIComponent(id)}/activate`, { method: "POST" });
  return response.invoice;
}

export async function voidInvoice(id: string): Promise<InvoiceV2> {
  const response = await requestJson<{ invoice: InvoiceV2 }>(`/v2/invoices/${encodeURIComponent(id)}/void`, { method: "POST" });
  return response.invoice;
}

export async function retryInvoiceQboSync(id: string): Promise<InvoiceV2> {
  const response = await requestJson<{ invoice: InvoiceV2 }>(`/v2/invoices/${encodeURIComponent(id)}/qbo-sync`, { method: "POST" });
  return response.invoice;
}

export async function fetchInvoiceBundles(options: InvoiceListOptions): Promise<InvoiceBundleListResponse> {
  return requestJson<InvoiceBundleListResponse>(`/v2/invoice-bundles?${listQuery(options)}`);
}

export async function fetchInvoiceBundle(id: string): Promise<InvoiceBundle> {
  const response = await requestJson<{ bundle: InvoiceBundle }>(`/v2/invoice-bundles/${encodeURIComponent(id)}`);
  return response.bundle;
}

export async function createInvoiceBundle(payload: InvoiceBundleCreatePayload): Promise<InvoiceBundle> {
  const response = await requestJson<{ bundle: InvoiceBundle }>("/v2/invoice-bundles", { method: "POST", body: JSON.stringify(payload) });
  return response.bundle;
}

export async function updateInvoiceBundle(id: string, payload: InvoiceBundleUpdatePayload): Promise<InvoiceBundle> {
  const response = await requestJson<{ bundle: InvoiceBundle }>(`/v2/invoice-bundles/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
  return response.bundle;
}

export async function deleteInvoiceBundle(id: string): Promise<void> {
  await requestJson<void>(`/v2/invoice-bundles/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function activateInvoiceBundle(id: string): Promise<InvoiceBundle> {
  const response = await requestJson<{ bundle: InvoiceBundle }>(`/v2/invoice-bundles/${encodeURIComponent(id)}/activate`, { method: "POST" });
  return response.bundle;
}

export async function voidInvoiceBundle(id: string): Promise<InvoiceBundle> {
  const response = await requestJson<{ bundle: InvoiceBundle }>(`/v2/invoice-bundles/${encodeURIComponent(id)}/void`, { method: "POST" });
  return response.bundle;
}

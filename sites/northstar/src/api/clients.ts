import type {
  Contact,
  ClientListResponse,
  ListOptions,
  ClientProjectListResponse,
  ClientResponse,
  ClientContactResponse,
} from "cfdg/types/v2";
import { requestJson } from "./common";

/**
 * Gets the list of clients at the specified page and page size, sorted by full name in the specified direction.
 * @param options The list options including page, page size, and sort direction. See {@link ListOptions} for details.
 * @returns A promise that resolves to the client list response.
 */
export async function fetchClients(
  options: ListOptions,
): Promise<ClientListResponse> {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
    sort: "fullName",
    direction: options.direction,
  });
  return requestJson<ClientListResponse>(`/v2/clients?${params.toString()}`);
}

/**
 * Loads a fully rendered client record by QBO ID, including extra-data fields and contacts.
 * @param id Identifier of the client to fetch.
 * @returns A promise that resolves to the client record.
 */
export async function fetchClient(id: string): Promise<ClientResponse> {
  const response = await requestJson<ClientResponse>(
    `/v2/clients/${encodeURIComponent(id)}`,
  );
  return response;
}

/** Loads projects related to a client. */
export async function fetchClientProjects(
  id: string,
  options: ListOptions,
): Promise<ClientProjectListResponse> {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
    sort: "fullName",
    direction: options.direction,
  });
  const response = await requestJson<ClientProjectListResponse>(
    `/v2/clients/${encodeURIComponent(id)}/projects?${params.toString()}`,
  );
  return response;
}

export async function fetchClientContacts(id: string): Promise<Contact[]> {
  const response = await requestJson<{ contacts: Contact[] }>(
    `/v2/clients/${encodeURIComponent(id)}/contacts`,
  );
  return response.contacts;
}

export async function createClientContact(
  id: string,
  contact: Omit<Contact, "id">,
): Promise<Contact> {
  const response = await requestJson<{ contact: Contact }>(
    `/v2/clients/${encodeURIComponent(id)}/contacts`,
    { method: "POST", body: JSON.stringify(contact) },
  );
  return response.contact;
}

export async function updateClientContact(
  id: string,
  contact: Contact,
): Promise<ClientContactResponse> {
  const response = await requestJson<{ contact: Contact }>(
    `/v2/clients/${encodeURIComponent(id)}/contacts/${encodeURIComponent(contact.id)}`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contact) },
  );
  return response;
}

import type {
  ClientExtraData,
  ClientListItem,
  ClientListResponse,
  ListOptions,
  NorthstarClient,
  ProjectListItem,
} from "cfdg/types";
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
 * Loads the basic information for a single client by ID.
 * @param id Identifier of the client to fetch.
 * @returns A promise that resolves to the client record.
 */
export async function fetchClient(id: string): Promise<NorthstarClient> {
  const response = await requestJson<{ client: NorthstarClient }>(
    `/v2/clients/${encodeURIComponent(id)}`,
  );
  return response.client;
}

/** Loads the independently stored client extra data. */
export async function fetchClientExtraData(
  id: string,
): Promise<ClientExtraData> {
  const response = await requestJson<{ extraData: ClientExtraData }>(
    `/v2/clients/${encodeURIComponent(id)}/extra-data`,
  );
  return response.extraData;
}

/** Loads projects related to a client. */
export async function fetchClientProjects(
  id: string,
): Promise<ProjectListItem[]> {
  const response = await requestJson<{ projects: ProjectListItem[] }>(
    `/v2/clients/${encodeURIComponent(id)}/projects`,
  );
  return response.projects;
}

/** Updates a client's internal status. */
export async function updateClientStatus(
  id: string,
  status: ClientExtraData["status"],
): Promise<ClientExtraData> {
  const response = await requestJson<{ extraData: ClientExtraData }>(
    `/v2/clients/${encodeURIComponent(id)}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
  );
  return response.extraData;
}

export type { ClientListItem };

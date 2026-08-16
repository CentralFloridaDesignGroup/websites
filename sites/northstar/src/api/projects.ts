import type {
  Client,
  PageSize,
  Project,
  Phase,
  Contact,
  ProjectListResponse,
} from "cfdg/types/v2";
import { requestJson } from "./client";

type ListOptions = { page: number; pageSize: PageSize; direction: "asc" | "desc"; clientId?: string };

/** Loads a page of Northstar projects. */
export async function fetchProjects(options: ListOptions): Promise<ProjectListResponse> {
  const params = new URLSearchParams({ page: String(options.page), pageSize: String(options.pageSize), sort: "fullName", direction: options.direction });
  if (options.clientId) params.set("clientId", options.clientId);
  return requestJson<ProjectListResponse>(`/v2/projects?${params.toString()}`);
}

/** Loads the base project record without extra-data fields. */
export async function fetchProject(id: string): Promise<Project> {
  const response = await requestJson<{ project: Project }>(`/v2/projects/${encodeURIComponent(id)}`);
  return response.project;
}

/**
 * Updates a project record with the provided payload. Only the fields present in the payload will be updated; other fields will remain unchanged.
 * @param id The ID of the project to update.
 * @param payload The fields to update on the project.
 */
export async function updateProject(id: string, payload: Partial<Project>): Promise<Project> {
  throw new Error("Not implemented yet");
}

/** Loads the client linked to a project. */
export async function fetchProjectClient(id: string): Promise<Client | null> {
  const response = await requestJson<{ client: Client | null }>(`/v2/projects/${encodeURIComponent(id)}/client`);
  return response.client;
}

export async function fetchProjectContacts(id: string): Promise<Contact[]> {
  const response = await requestJson<{ contacts: Contact[] }>(`/v2/projects/${encodeURIComponent(id)}/contacts`);
  return response.contacts;
}

export async function updateProjectContacts(id: string, contactIds: string[]): Promise<Contact[]> {
  const response = await requestJson<{ contacts: Contact[] }>(
    `/v2/projects/${encodeURIComponent(id)}/contacts`,
    { method: "PUT", body: JSON.stringify({ contactIds }) },
  );
  return response.contacts;
}
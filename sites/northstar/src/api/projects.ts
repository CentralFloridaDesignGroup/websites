import type { NorthstarClient, NorthstarPageSize, NorthstarProject, ProjectExtraData, ProjectListResponse } from "cfdg/types";
import { requestJson } from "./client";

type ListOptions = { page: number; pageSize: NorthstarPageSize; direction: "asc" | "desc"; clientId?: string };

/** Loads a page of Northstar projects. */
export async function fetchProjects(options: ListOptions): Promise<ProjectListResponse> {
  const params = new URLSearchParams({ page: String(options.page), pageSize: String(options.pageSize), sort: "fullName", direction: options.direction });
  if (options.clientId) params.set("clientId", options.clientId);
  return requestJson<ProjectListResponse>(`/v2/projects?${params.toString()}`);
}

/** Loads the base project record without extra-data fields. */
export async function fetchProject(id: string): Promise<NorthstarProject> {
  const response = await requestJson<{ project: NorthstarProject }>(`/v2/projects/${encodeURIComponent(id)}`);
  return response.project;
}

/** Loads independently stored project extra data. */
export async function fetchProjectExtraData(id: string): Promise<ProjectExtraData> {
  const response = await requestJson<{ extraData: ProjectExtraData }>(`/v2/projects/${encodeURIComponent(id)}/extra-data`);
  return response.extraData;
}

/** Loads the client linked to a project. */
export async function fetchProjectClient(id: string): Promise<NorthstarClient | null> {
  const response = await requestJson<{ client: NorthstarClient | null }>(`/v2/projects/${encodeURIComponent(id)}/client`);
  return response.client;
}

/** Updates a project's internal lifecycle status. */
export async function updateProjectStatus(id: string, status: ProjectExtraData["status"]): Promise<ProjectExtraData> {
  const response = await requestJson<{ extraData: ProjectExtraData }>(`/v2/projects/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return response.extraData;
}

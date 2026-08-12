import type { NorthstarClient, NorthstarPageSize, NorthstarProject, Phase, PhaseCreatePayload, PhaseSummaryResponse, PhaseUpdatePayload, ProjectExtraData, ProjectListResponse } from "cfdg/types";
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

/** Loads the hierarchical phase summary for a Northstar project. */
export async function fetchProjectPhases(id: string): Promise<PhaseSummaryResponse> {
  return requestJson<PhaseSummaryResponse>(`/v2/projects/${encodeURIComponent(id)}/phases`);
}

/** Creates a top-level or child phase for a Northstar project. */
export async function createProjectPhase(id: string, payload: PhaseCreatePayload): Promise<Phase> {
  const response = await requestJson<{ phase: Phase }>(`/v2/projects/${encodeURIComponent(id)}/phases`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.phase;
}

/** Updates editable metadata and accounting values for a phase. */
export async function updateProjectPhase(id: string, phaseId: string, payload: PhaseUpdatePayload): Promise<Phase> {
  const response = await requestJson<{ phase: Phase }>(`/v2/projects/${encodeURIComponent(id)}/phases/${encodeURIComponent(phaseId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.phase;
}

/** Soft-deletes a phase and its descendants from the project summary. */
export async function deleteProjectPhase(id: string, phaseId: string): Promise<Phase> {
  const response = await requestJson<{ phase: Phase }>(`/v2/projects/${encodeURIComponent(id)}/phases/${encodeURIComponent(phaseId)}`, {
    method: "DELETE",
  });
  return response.phase;
}

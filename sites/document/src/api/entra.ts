import {
  PROJECT_MANAGER_GROUP_DISPLAY_NAME,
  PROJECT_MANAGER_GROUP_ID,
  type EntraUserAccount,
} from 'cfdg/scripts'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { getMsalSilentRedirectUri, msalInstance } from '../auth/msalConfig'

type GraphCollection<T> = {
  value?: T[]
  '@odata.nextLink'?: string
}

type GraphGroup = {
  id?: string
  displayName?: string
}

type GraphUser = {
  id?: string
  displayName?: string
  mail?: string
  userPrincipalName?: string
  accountEnabled?: boolean
  jobTitle?: string
}

type GraphTokenOptions = {
  interactive?: boolean
}

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function getGraphDirectoryScopes(): string[] {
  const configured = normalizeString(import.meta.env.VITE_GRAPH_DIRECTORY_SCOPES)
  const scopes = configured
    .split(/[ ,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean)

  return scopes.length > 0 ? scopes : ['User.Read', 'User.Read.All', 'GroupMember.Read.All']
}

function graphUrl(pathOrUrl: string): string {
  return /^https:\/\//i.test(pathOrUrl) ? pathOrUrl : `${GRAPH_BASE_URL}${pathOrUrl}`
}

function getMsalErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return ''
  }

  const candidate = error as { errorCode?: unknown; code?: unknown }
  return normalizeString(candidate.errorCode ?? candidate.code)
}

function isSilentTokenInteractionError(error: unknown): boolean {
  if (error instanceof InteractionRequiredAuthError) {
    return true
  }

  const errorCode = getMsalErrorCode(error)
  return errorCode === 'timed_out' || errorCode === 'monitor_window_timeout'
}

async function acquireGraphToken(options: GraphTokenOptions = {}): Promise<string> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) {
    throw new Error('No active Microsoft account. Please sign in again.')
  }

  const request = {
    account,
    scopes: getGraphDirectoryScopes(),
  }

  const result = await msalInstance.acquireTokenSilent({
    ...request,
    redirectUri: getMsalSilentRedirectUri(),
  }).catch(async (error: unknown) => {
    if (options.interactive && isSilentTokenInteractionError(error)) {
      return msalInstance.acquireTokenPopup(request)
    }

    throw error
  })

  const token = normalizeString(result.accessToken)
  if (!token) {
    throw new Error('Microsoft Graph token acquisition succeeded but did not return an access token.')
  }

  return token
}

async function graphGet<T>(pathOrUrl: string, headers: Record<string, string> = {}, options: GraphTokenOptions = {}): Promise<T> {
  const token = await acquireGraphToken(options)
  const response = await fetch(graphUrl(pathOrUrl), {
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Microsoft Graph request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function graphGetAll<T>(pathOrUrl: string, headers: Record<string, string> = {}, options: GraphTokenOptions = {}): Promise<T[]> {
  const values: T[] = []
  let nextUrl = pathOrUrl

  while (nextUrl) {
    const page = await graphGet<GraphCollection<T>>(nextUrl, headers, options)
    values.push(...(page.value || []))
    nextUrl = page['@odata.nextLink'] || ''
  }

  return values
}

export function isGraphInteractionRequired(error: unknown): boolean {
  return isSilentTokenInteractionError(error)
}

function getConfiguredProjectManagerGroupId(): string {
  return normalizeString(import.meta.env.VITE_ENTRA_PROJECT_MANAGER_GROUP_ID) || PROJECT_MANAGER_GROUP_ID
}

function getConfiguredProjectManagerGroupName(): string {
  return normalizeString(import.meta.env.VITE_ENTRA_PROJECT_MANAGER_GROUP_NAME) || PROJECT_MANAGER_GROUP_DISPLAY_NAME
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''")
}

async function resolveProjectManagerGroup(): Promise<GraphGroup> {
  const configuredGroupId = getConfiguredProjectManagerGroupId()
  if (configuredGroupId) {
    return graphGet<GraphGroup>(`/groups/${encodeURIComponent(configuredGroupId)}?$select=id,displayName`, {}, { interactive: true })
  }

  const groupName = getConfiguredProjectManagerGroupName()
  const groups = await graphGetAll<GraphGroup>(
    `/groups?$filter=displayName eq '${escapeODataString(groupName)}'&$select=id,displayName&$top=1`,
    { ConsistencyLevel: 'eventual' },
    { interactive: true }
  )
  const group = groups[0]
  if (!group?.id) {
    throw new Error(`Project Manager group "${groupName}" was not found in Entra.`)
  }
  return group
}

async function fetchUserGroups(userId: string): Promise<GraphGroup[]> {
  return graphGetAll<GraphGroup>(
    `/users/${encodeURIComponent(userId)}/memberOf/microsoft.graph.group?$select=id,displayName&$top=999`,
    {},
    { interactive: true }
  )
}

export async function fetchSignedInUserGroupIds(options: GraphTokenOptions = {}): Promise<string[]> {
  const groups = await graphGetAll<GraphGroup>(
    '/me/memberOf/microsoft.graph.group?$select=id&$top=999',
    {},
    options
  )
  return groups.map((group) => normalizeString(group.id)).filter(Boolean)
}

/** Loads active Entra users in the Project Manager group with their group memberships. */
export async function fetchEligibleProjectManagers(): Promise<EntraUserAccount[]> {
  const group = await resolveProjectManagerGroup()
  const groupId = normalizeString(group.id)
  if (!groupId) {
    return []
  }

  const users = await graphGetAll<GraphUser>(
    `/groups/${encodeURIComponent(groupId)}/transitiveMembers/microsoft.graph.user?$select=id,displayName,mail,userPrincipalName,accountEnabled,jobTitle&$top=999`,
    {},
    { interactive: true }
  )

  const activeUsers = users.filter((user) => user.accountEnabled === true && normalizeString(user.id))
  const enrichedUsers = await Promise.all(activeUsers.map(async (user) => {
    const groups = await fetchUserGroups(normalizeString(user.id))
    return {
      id: normalizeString(user.id),
      displayName: normalizeString(user.displayName || user.userPrincipalName || user.mail),
      mail: normalizeString(user.mail),
      userPrincipalName: normalizeString(user.userPrincipalName),
      accountEnabled: user.accountEnabled === true,
      jobTitle: normalizeString(user.jobTitle),
      groupIds: groups.map((entry) => normalizeString(entry.id)).filter(Boolean),
      groupNames: groups.map((entry) => normalizeString(entry.displayName)).filter(Boolean),
    } satisfies EntraUserAccount
  }))

  return enrichedUsers.sort((left, right) => left.displayName.localeCompare(right.displayName))
}

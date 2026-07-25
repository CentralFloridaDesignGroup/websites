import {
  PublicClientApplication,
  EventType,
  type EventMessage,
  type AuthenticationResult,
  type Configuration,
} from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_MSAL_TENANT_ID as string | undefined;
const clientId = import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined;
const redirectUri = (import.meta.env.VITE_MSAL_REDIRECT_URI as string | undefined) ?? window.location.origin;
const configuredSilentRedirectUri = import.meta.env.VITE_MSAL_SILENT_REDIRECT_URI as string | undefined;

if (!clientId || !tenantId) {
  console.warn("MSAL config missing VITE_MSAL_CLIENT_ID or VITE_MSAL_TENANT_ID.");
}

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? "",
    authority: tenantId
      ? `https://login.microsoftonline.com/${tenantId}`
      : "https://login.microsoftonline.com/common",
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    // localStorage persists the refresh token across browser sessions.
    // Combined with the offline_access scope, this keeps users signed in for up to 90 days.
    cacheLocation: "localStorage",
  },
};

// offline_access scope is required to receive a refresh token for long-lived sessions.
export const loginRequest = {
  scopes: ["openid", "profile", "offline_access", "User.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);

export function getMsalSilentRedirectUri(): string {
  return configuredSilentRedirectUri ?? `${window.location.origin}/auth/silent-redirect`;
}

msalInstance.addEventCallback((event: EventMessage) => {
  if (event.eventType !== EventType.LOGIN_SUCCESS) return;
  const payload = event.payload as AuthenticationResult | null;
  if (payload?.account) {
    msalInstance.setActiveAccount(payload.account);
  }
});

export async function initializeMsal() {
  await msalInstance.initialize();

  // Process any pending redirect (loginRedirect / logoutRedirect flow).
  const result = await msalInstance.handleRedirectPromise();
  if (result?.account) {
    msalInstance.setActiveAccount(result.account);
    return;
  }

  // Restore the active account from the localStorage cache on revisit.
  // No network call — MSAL reads straight from the cache.
  // Token refresh happens transparently via acquireTokenSilent when needed.
  const accounts = msalInstance.getAllAccounts();
  if (!msalInstance.getActiveAccount() && accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }
}

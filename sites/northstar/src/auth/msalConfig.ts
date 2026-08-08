import {
  EventType,
  PublicClientApplication,
  type AuthenticationResult,
  type Configuration,
  type EventMessage,
} from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_MSAL_TENANT_ID;
const clientId = import.meta.env.VITE_MSAL_CLIENT_ID;
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI ?? window.location.origin;
const configuredSilentRedirectUri = import.meta.env.VITE_MSAL_SILENT_REDIRECT_URI;

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
    cacheLocation: "localStorage",
  },
};

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

  const result = await msalInstance.handleRedirectPromise();
  if (result?.account) {
    msalInstance.setActiveAccount(result.account);
    return;
  }

  const accounts = msalInstance.getAllAccounts();
  if (!msalInstance.getActiveAccount() && accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }
}

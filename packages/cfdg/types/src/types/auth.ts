// #region Requests

/** 
 * Represents the authentication mode for a request.
 * - `public`: No authentication required.
 * - `key`: API key authentication.
 * - `microsoft`: Microsoft authentication.
 */
export type AuthMode = 'public' | 'key' | 'microsoft'

/** Represents the authentication context for a request. */
export type AuthContext = {
    /** The authentication mode for the request. */
    mode: AuthMode
    /** The subject (user id) of the authentication context. */
    subject?: string
    /** The email of the authenticated user. */
    email?: string
    /** The tenant ID of the authenticated user. */
    tenantId?: string
    /** The groups the authenticated user belongs to. */
    groups?: string[]
}


// #endregion

// #region Routes

/**
 * Represents the HTTP methods that can be used in route policies.
 * - `*`: Any HTTP method.
 * - `GET`: HTTP GET method. Reading data from the server.
 * - `POST`: HTTP POST method. Creating new resources on the server.
 * - `PUT`: HTTP PUT method. Updating existing resources on the server.
 * - `DELETE`: HTTP DELETE method. Deleting resources from the server.
 */
export type RouteMethod = '*' | 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Represents the policy for a route, including the HTTP method, authentication mode, and allowed groups. */
export type RoutePolicy = {
    /** The HTTP method for the route. */
    method: RouteMethod
    /** The path of the route. */
    route: string
    /** The authentication mode required for the route. */
    mode: AuthMode
    /** The groups allowed to access the route. */
    allowedGroupIds?: string[]
}

// #endregion

// #region Environments

/**
 * Represents the environment variables required for API authentication.
 * @version  `Version 2`: Simplified and consolidated environment variables for API authentication. 
 */
export type AuthEnv = {
    /** Internal API key for the application */
    API_KEY?: string
    /** Microsoft Tenant ID for authentication */
    MICROSOFT_TENANT_ID?: string
    /** Microsoft Client ID for authentication */
    MICROSOFT_CLIENT_ID?: string
    /** Microsoft Client Secret for authentication */
    MICROSOFT_CLIENT_SECRET?: string
    /** Microsoft Allowed Audiences for authentication */
    MICROSOFT_ALLOWED_AUDIENCES?: string
}

// #endregion

/** Default headers for V1 API routes. */
export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Company',
} as const;

/** Default headers for V2 api routes. */
export const CORS_HEADERS_V2 = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key'
} as const;

/** Default Response Header for V1 api routes. */
export const JSON_HEADERS = {
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
} as const;

/** Default Response Header for V2 api routes */
export const JSON_HEADERS_V2 = {
    'Content-Type': 'application/json',
    ...CORS_HEADERS_V2,
} as const;

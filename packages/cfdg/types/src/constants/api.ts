export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Company',
} as const;

export const JSON_HEADERS = {
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
} as const;
export const CORS_HEADERS_V2 = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key" } as const;
export const JSON_HEADERS_V2 = { "Content-Type": "application/json", ...CORS_HEADERS_V2 } as const;

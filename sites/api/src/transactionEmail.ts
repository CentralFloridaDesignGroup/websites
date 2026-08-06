import type { FormSubmission } from 'cfdg/types';
import type { ApiEnv } from './apiTypes';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, X-Company",
};

function maskApiKey(apiKey: string): string {
    const trimmed = apiKey.trim();
    if (trimmed.length <= 8) {
        return "***";
    }

    return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function logPrefix(request: Request, company: string, maskedApiKey: string): string {
    const requestId = request.headers.get("CF-Ray") || request.headers.get("X-Request-Id") || "n/a";
    return `[transactionEmail] company=${company} apiKey=${maskedApiKey} requestId=${requestId}`;
}


export async function handleTransactionEmail(request: Request, env: ApiEnv): Promise<Response> {
    try {
        const company = (request.headers.get("X-Company") || "unknown").trim() || "unknown";

        // Handle CORS preflight request and return early
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            });
        }

        // Only allow POST requests for form submission
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", {
                status: 405,
                headers: corsHeaders,
            });
        }

        const expectedApiKey = String(env.API_KEY ?? "").trim();
        if (!expectedApiKey) {
            console.error(`${logPrefix(request, company, "missing")}: missing API_KEY configuration`);
            return new Response("Server configuration error: Missing API_KEY", {
                status: 500,
                headers: corsHeaders,
            });
        }

        const inboundApiKey = String(request.headers.get("X-Api-Key") ?? "").trim();
        if (!inboundApiKey || inboundApiKey !== expectedApiKey) {
            console.warn(`${logPrefix(request, company, maskApiKey(inboundApiKey || "invalid"))}: unauthorized request`);
            return new Response("Unauthorized", {
                status: 401,
                headers: corsHeaders,
            });
        }

        const maskedInboundApiKey = maskApiKey(inboundApiKey);

        // Only allow requests with JSON content type
        const contentType = request.headers.get("Content-Type") || "";
        if (!contentType.toLowerCase().startsWith("application/json")) {
            console.warn(`${logPrefix(request, company, maskedInboundApiKey)}: unsupported content type`);
            return new Response("Unsupported Media Type", {
                status: 415,
                headers: corsHeaders,
            });
        }

        // Try to convert the body of the request to JSON, which should contain the form data. If it fails, return a 400 Bad Request response.
        let body: FormSubmission;
        try {
            body = await request.json();
        } catch {
            console.warn(`${logPrefix(request, company, maskedInboundApiKey)}: invalid JSON payload`);
            return new Response("Invalid JSON", {
                status: 400,
                headers: corsHeaders,
            });
        }

        // Validate that the required environment variables for sending emails are present. If any are missing, return a 500 Internal Server Error response indicating a server configuration error.
        const apiKey = String(env.BREVO_API_KEY ?? "").trim();
        if (!apiKey) {
            return new Response("Server configuration error: Missing BREVO_API_KEY", {
                status: 500,
                headers: corsHeaders,
            });
        }

        const senderEmail = String(env.SENDER_EMAIL ?? "").trim();
        if (!senderEmail) {
            return new Response("Server configuration error: Missing SENDER_EMAIL", {
                status: 500,
                headers: corsHeaders,
            });
        }

        const brevoSandbox = String(env.BREVO_SANDBOX ?? "").trim().toLowerCase() === "true";

        // Extract the params and packages from the request body. If either is missing, return a 400 Bad Request response indicating an invalid request body.
        const { params, packages } = body || {};
        if (!params) {
            return new Response("Invalid request body: Missing params", {
                status: 400,
                headers: corsHeaders,
            });
        }

        if (!Array.isArray(packages) || packages.length === 0) {
            return new Response("Invalid request body: Missing packages", {
                status: 400,
                headers: corsHeaders,
            });
        }

        for (const pkg of packages) {
            // Validate that each package has at least one recipient email address in the toEmail array. If any package is missing this information, return a 400 Bad Request response indicating an invalid request body.
            if (!pkg.toEmail || pkg.toEmail.length === 0) {
                return new Response("Invalid request body: Each package must have at least one toEmail", {
                    status: 400,
                    headers: corsHeaders,
                });
            }

            // Validate that each email address in the toEmail array is a non-empty string. If any email address is invalid, return a 400 Bad Request response indicating an invalid request body.
            const toEmails = Array.isArray(pkg.toEmail)
                ? pkg.toEmail.map(email => (typeof email === "string" ? email.trim() : "")).filter(email => email !== "")
                : [];
            if (toEmails.length === 0) {
                return new Response("Invalid request body: Each toEmail must be a non-empty string", {
                    status: 400,
                    headers: corsHeaders,
                });
            }

            // Validate ccEmail only when provided.
            const ccEmails = Array.isArray(pkg.ccEmail)
                ? pkg.ccEmail.map(email => (typeof email === "string" ? email.trim() : "")).filter(email => email !== "")
                : undefined;
            if (pkg.ccEmail !== undefined && (!ccEmails || ccEmails.length === 0)) {
                return new Response("Invalid request body: Each ccEmail must be a non-empty string", {
                    status: 400,
                    headers: corsHeaders,
                });
            }

            // Validate that each package has a replyToEmail address. If any package is missing this information, return a 400 Bad Request response indicating an invalid request body.
            if (!pkg.replyToEmail || pkg.replyToEmail.trim() === "") {
                return new Response("Invalid request body: Each package must have a replyToEmail", {
                    status: 400,
                    headers: corsHeaders,
                });
            }

            // Validate that each package has a subject. If any package is missing this information, return a 400 Bad Request response indicating an invalid request body.
            if (!pkg.subject || pkg.subject.trim() === "") {
                return new Response("Invalid request body: Each package must have a subject", {
                    status: 400,
                    headers: corsHeaders,
                });
            }

            // Validate that each package has a templateId. If any package is missing this information, return a 400 Bad Request response indicating an invalid request body.
            if (pkg.templateId === undefined || pkg.templateId === null) {
                return new Response("Invalid request body: Each package must have a templateId", {
                    status: 400,
                    headers: corsHeaders,
                });
            }

            // If attachments are included, validate that each attachment has a filename, data, and mimetype. If any attachment is missing this information, return a 400 Bad Request response indicating an invalid request body.
            if (pkg.attachments) {
                for (const attachment of pkg.attachments) {
                    if (!attachment.filename || attachment.filename.trim() === "") {
                        return new Response("Invalid request body: Each attachment must have a filename", {
                            status: 400,
                            headers: corsHeaders,
                        });
                    }
                    if (!attachment.data || attachment.data.trim() === "") {
                        return new Response("Invalid request body: Each attachment must have data", {
                            status: 400,
                            headers: corsHeaders,
                        });
                    }
                    if (!attachment.mimetype || attachment.mimetype.trim() === "") {
                        return new Response("Invalid request body: Each attachment must have a mimetype", {
                            status: 400,
                            headers: corsHeaders,
                        });
                    }
                }
            }

            // If all validations pass, proceed to send the email using the provided package details and form parameters. This would involve calling the email sending service (e.g., BREVO) with the appropriate API key and email content based on the template ID and parameters.
            const emailBody = {
                sender: { email: senderEmail, name: "White Point Survey - Do Not Reply" },
                to: toEmails.map(email => ({ email })),
                cc: ccEmails ? ccEmails.map(email => ({ email })) : undefined,
                subject: pkg.subject.trim(),
                replyTo: { email: pkg.replyToEmail.trim() },
                params: Object.assign({}, params || {}),
                attachment: pkg.attachments
                    ? pkg.attachments.map(att => ({
                        name: att.filename.trim(),
                        content: att.data.trim(),
                        type: att.mimetype.trim(),
                    }))
                    : undefined,
                templateId: pkg.templateId,
                ...(brevoSandbox ? { headers: { "X-Sib-Sandbox": "drop" } } : {})
            };

            const headers = {
                "Content-Type": "application/json",
                "api-key": apiKey,
            };

            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers,
                body: JSON.stringify(emailBody)
            });

            const data = await response.json().catch(() => null) as { message?: string } | null;
            if (!response.ok) {
                console.error(`${logPrefix(request, company, maskedInboundApiKey)}: error sending email`, response.status, data);
                return new Response("Failed to send email: " + (data?.message || response.statusText), {
                    status: 500,
                    headers: corsHeaders,
                });
            }

            console.log(`${logPrefix(request, company, maskedInboundApiKey)}: email sent successfully`);
        }

        // If all emails are sent successfully, return a 200 OK response with a success message.
        return new Response("Emails sent successfully", {
            status: 200,
            headers: corsHeaders,
        });
    } catch (error) {
        // If any unexpected error occurs during processing, return a 500 Internal Server Error response with a generic error message.
        return new Response("An unexpected error occurred while processing the request: " + (error instanceof Error ? error.message : String(error)), {
            status: 500,
            headers: {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }
}

export async function onRequest(context: {
    request: any;
    env: ApiEnv;
}) {
    return handleTransactionEmail(context.request as Request, context.env);
}

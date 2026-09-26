import { z } from "zod";
import { routeDocs, type RouteDoc } from "./registry";

function schemaOf(s: z.ZodType, io: "input" | "output" = "input") {
  try {
    const json = z.toJSONSchema(s, { io, unrepresentable: "any" }) as Record<string, unknown>;
    delete json.$schema;
    return json;
  } catch {
    return { type: "object" };
  }
}

function parameters(doc: RouteDoc) {
  const out: object[] = [];
  for (const [where, schema] of [["path", doc.params], ["query", doc.query]] as const) {
    if (!schema) continue;
    const json = schemaOf(schema) as { properties?: Record<string, object>; required?: string[] };
    for (const [name, prop] of Object.entries(json.properties ?? {})) {
      out.push({ name, in: where, required: where === "path" || (json.required ?? []).includes(name), schema: prop });
    }
  }
  return out;
}

const ACCESS_NOTE: Record<RouteDoc["access"], string> = {
  public: "",
  user: "Requires sign-in.",
  writer: "Requires sign-in with a verified email; blocked while suspended.",
  moderator: "Moderators and admins only.",
  admin: "Admins only.",
};

export function buildOpenApi() {
  const paths: Record<string, Record<string, object>> = {};
  for (const doc of routeDocs) {
    const path = `/api${doc.path.replace(/:(\w+)/g, "{$1}")}`;
    paths[path] ??= {};
    paths[path][doc.method] = {
      tags: [doc.tag],
      summary: doc.summary,
      description: ACCESS_NOTE[doc.access] || undefined,
      security: doc.access === "public" ? [] : [{ cookieAuth: [] }],
      parameters: parameters(doc),
      ...(doc.upload
        ? {
            requestBody: {
              required: true,
              content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } },
            },
          }
        : doc.body
          ? { requestBody: { required: true, content: { "application/json": { schema: schemaOf(doc.body) } } } }
          : {}),
      responses: {
        200: { description: "Success" },
        400: { $ref: "#/components/responses/Error" },
        ...(doc.access !== "public" ? { 401: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" } } : {}),
        429: { $ref: "#/components/responses/Error" },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Klyro API",
      version: "2.0.0",
      description:
        "REST API for Klyro — where ideas come together.\n\nAuthentication uses httpOnly cookies set by `/api/auth/login`. " +
        "State-changing requests must send the header `X-Requested-With: klyro` (CSRF protection). " +
        "List endpoints use cursor pagination: pass the `nextCursor` from one page as `cursor` to get the next.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" } },
      responses: {
        Error: {
          description: "Error",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", const: false },
                  statusCode: { type: "integer" },
                  code: { type: "string" },
                  message: { type: "string" },
                  details: {},
                },
              },
            },
          },
        },
      },
    },
    paths,
  };
}

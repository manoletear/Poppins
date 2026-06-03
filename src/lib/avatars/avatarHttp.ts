import { AvatarError } from "./avatarTypes";
import type { AvatarErrorBody } from "./avatarTypes";
import { buildAvatarFromRaw } from "./avatarService";
import type { RawAvatarInput } from "./avatarValidation";

/**
 * Shared HTTP glue used by BOTH the flexible and path-based routes so business
 * logic is never duplicated. Returns a Web `Response`.
 *
 * Handles: validation errors -> JSON error body; If-None-Match -> 304;
 * success -> SVG with long immutable cache + ETag.
 */
export function handleAvatarRequest(raw: RawAvatarInput, ifNoneMatch: string | null): Response {
  try {
    const result = buildAvatarFromRaw(raw);

    if (ifNoneMatch && etagMatches(ifNoneMatch, result.etag)) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: result.etag,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new Response(result.body, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: result.etag,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Compare client's If-None-Match (may be a comma list or "*") against our ETag. */
function etagMatches(ifNoneMatch: string, etag: string): boolean {
  if (ifNoneMatch.trim() === "*") return true;
  return ifNoneMatch
    .split(",")
    .map((t) => t.trim().replace(/^W\//, ""))
    .includes(etag);
}

function errorResponse(err: unknown): Response {
  if (err instanceof AvatarError) {
    const body: AvatarErrorBody = { error: true, code: err.code, message: err.message };
    return jsonError(body, err.status);
  }
  // Never leak internals / stack traces.
  const body: AvatarErrorBody = {
    error: true,
    code: "AVATAR_RENDER_ERROR",
    message: "Unexpected error generating avatar.",
  };
  return jsonError(body, 500);
}

function jsonError(body: AvatarErrorBody, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

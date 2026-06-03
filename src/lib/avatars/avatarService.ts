import type { AvatarRequest, AvatarResult } from "./avatarTypes";
import { AVATAR_ROLE_CONFIG } from "./avatarRoles";
import { generateAvatarSeed, generateAvatarETag } from "./avatarSeed";
import { renderAvatar } from "./avatarRenderer";
import { validateAvatarInput } from "./avatarValidation";
import type { RawAvatarInput } from "./avatarValidation";

/**
 * Orchestrates the full pipeline with NO HTTP concerns:
 * validated/raw input -> normalized request -> role config -> seed -> render -> result.
 */
export function buildAvatar(request: AvatarRequest): AvatarResult {
  const roleConfig = AVATAR_ROLE_CONFIG[request.role];

  const seed = generateAvatarSeed({
    familyId: request.familyId,
    memberId: request.memberId,
    role: request.role,
    variant: request.variant,
  });

  const etag = generateAvatarETag({
    familyId: request.familyId,
    memberId: request.memberId,
    role: request.role,
    variant: request.variant,
    format: request.format,
    size: request.size,
  });

  const body = renderAvatar({
    category: roleConfig.category,
    roleConfig,
    seed,
    size: request.size,
    format: request.format,
  });

  const contentType = request.format === "png" ? "image/png" : "image/svg+xml";

  return { body, contentType, etag, format: request.format, size: request.size };
}

/** Convenience: validate raw HTTP-ish input then build. Still no Response objects. */
export function buildAvatarFromRaw(raw: RawAvatarInput): AvatarResult {
  const request = validateAvatarInput(raw);
  return buildAvatar(request);
}

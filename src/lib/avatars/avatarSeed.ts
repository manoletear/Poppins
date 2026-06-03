import { createHash } from "node:crypto";
import type { AvatarFormat, NormalizedAvatarRole } from "./avatarTypes";

export interface SeedInput {
  familyId: string;
  memberId: string;
  role: NormalizedAvatarRole;
  variant: string;
}

export interface ETagInput extends SeedInput {
  format: AvatarFormat;
  size: number;
}

/**
 * Deterministic seed for an avatar.
 * seed = sha256(familyId + ":" + memberId + ":" + normalizedRole + ":" + variant)
 *
 * Privacy: callers must pass stable opaque IDs, never real name/email/RUT/phone.
 * The seed is internal only and is never exposed in responses or SVG metadata.
 */
export function generateAvatarSeed(input: SeedInput): string {
  const material = `${input.familyId}:${input.memberId}:${input.role}:${input.variant}`;
  return createHash("sha256").update(material, "utf8").digest("hex");
}

/**
 * Strong ETag derived from all identity + rendering params.
 * Two requests with identical params produce the same ETag -> cacheable + 304.
 */
export function generateAvatarETag(input: ETagInput): string {
  const material = `${input.familyId}:${input.memberId}:${input.role}:${input.variant}:${input.format}:${input.size}`;
  const hash = createHash("sha256").update(material, "utf8").digest("hex");
  return `"${hash.slice(0, 32)}"`;
}

// Core type definitions for the Poppins deterministic avatar service.

/** Raw role as provided by the caller (may be an alias, accented, mixed case). */
export type AvatarRole = string;

/** Canonical role identifiers after normalization. */
export type NormalizedAvatarRole =
  | "mama"
  | "papa"
  | "hijo"
  | "hija"
  | "abuelo"
  | "abuela"
  | "bebe"
  | "perro"
  | "gato"
  | "conejo"
  | "mascota";

/** High-level rendering category. */
export type AvatarCategory = "person" | "animal";

/** Supported output formats. SVG is the production format on Cloudflare Workers. */
export type AvatarFormat = "svg" | "png";

export type GenderHint = "female" | "male" | "neutral";
export type AgeHint = "child" | "adult" | "senior" | "baby";

/** Simple animal silhouette types the renderer knows how to draw. */
export type AnimalType = "dog" | "cat" | "bunny" | "generic";

/** Static configuration for each known role. */
export interface AvatarRoleConfig {
  role: NormalizedAvatarRole;
  category: AvatarCategory;
  /** People only. */
  genderHint?: GenderHint;
  ageHint?: AgeHint;
  /** Animals only. */
  animalType?: AnimalType;
}

/** Validated, normalized request handed to the service (no HTTP concerns). */
export interface AvatarRequest {
  familyId: string;
  memberId: string;
  role: NormalizedAvatarRole;
  format: AvatarFormat;
  size: number;
  /** Optional discriminator so a member can have alternate avatars. */
  variant: string;
}

/** Result returned by the service layer (still no HTTP concerns). */
export interface AvatarResult {
  body: string;
  contentType: string;
  etag: string;
  format: AvatarFormat;
  size: number;
}

export type AvatarErrorCode =
  | "MISSING_FAMILY_ID"
  | "MISSING_MEMBER_ID"
  | "MISSING_ROLE"
  | "INVALID_ROLE"
  | "INVALID_FORMAT"
  | "INVALID_SIZE"
  | "INVALID_VARIANT"
  | "AVATAR_RENDER_ERROR";

/** Domain error carrying a stable code + HTTP status. No stack traces leak to clients. */
export class AvatarError extends Error {
  readonly code: AvatarErrorCode;
  readonly status: number;

  constructor(code: AvatarErrorCode, message: string, status: number) {
    super(message);
    this.name = "AvatarError";
    this.code = code;
    this.status = status;
  }
}

export interface AvatarErrorBody {
  error: true;
  code: AvatarErrorCode;
  message: string;
}

import type { AvatarRoleConfig, NormalizedAvatarRole } from "./avatarTypes";

/**
 * Canonical catalog of supported roles.
 * Extensible: to add a new pet (hamster, loro, pez, caballo, tortuga) add an
 * entry here + aliases below + a silhouette branch in the renderer.
 */
export const AVATAR_ROLE_CONFIG: Record<NormalizedAvatarRole, AvatarRoleConfig> = {
  mama: { role: "mama", category: "person", genderHint: "female", ageHint: "adult" },
  papa: { role: "papa", category: "person", genderHint: "male", ageHint: "adult" },
  hijo: { role: "hijo", category: "person", genderHint: "male", ageHint: "child" },
  hija: { role: "hija", category: "person", genderHint: "female", ageHint: "child" },
  abuelo: { role: "abuelo", category: "person", genderHint: "male", ageHint: "senior" },
  abuela: { role: "abuela", category: "person", genderHint: "female", ageHint: "senior" },
  bebe: { role: "bebe", category: "person", genderHint: "neutral", ageHint: "baby" },
  perro: { role: "perro", category: "animal", animalType: "dog" },
  gato: { role: "gato", category: "animal", animalType: "cat" },
  conejo: { role: "conejo", category: "animal", animalType: "bunny" },
  mascota: { role: "mascota", category: "animal", animalType: "generic" },
};

/**
 * Alias map -> canonical role. Keys are already lowercased + de-accented.
 * Includes English synonyms and common spelling variants.
 */
const ROLE_ALIASES: Record<string, NormalizedAvatarRole> = {
  // people (spanish canonical, accents stripped before lookup)
  mama: "mama",
  papa: "papa",
  hijo: "hijo",
  hija: "hija",
  abuelo: "abuelo",
  abuela: "abuela",
  bebe: "bebe",
  // people (english)
  mother: "mama",
  mom: "mama",
  mum: "mama",
  father: "papa",
  dad: "papa",
  son: "hijo",
  daughter: "hija",
  grandfather: "abuelo",
  grandpa: "abuelo",
  grandmother: "abuela",
  grandma: "abuela",
  baby: "bebe",
  // animals (spanish canonical)
  perro: "perro",
  gato: "gato",
  conejo: "conejo",
  mascota: "mascota",
  // animals (english)
  dog: "perro",
  puppy: "perro",
  cat: "gato",
  kitty: "gato",
  bunny: "conejo",
  rabbit: "conejo",
  pet: "mascota",
};

/** Strip accents/diacritics so "mamá" -> "mama". */
function deaccent(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Normalize a raw role to its canonical form, or null if unknown.
 * Trims, lowercases and removes accents before alias lookup.
 */
export function normalizeRole(role: string): NormalizedAvatarRole | null {
  const key = deaccent(role.trim().toLowerCase());
  if (!key) return null;
  return ROLE_ALIASES[key] ?? null;
}

/** Sorted list of canonical roles (for error messages / docs). */
export const KNOWN_ROLES: NormalizedAvatarRole[] = Object.keys(
  AVATAR_ROLE_CONFIG
) as NormalizedAvatarRole[];

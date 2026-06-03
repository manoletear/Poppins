import { AvatarError } from "./avatarTypes";
import type {
  AvatarFormat,
  AvatarRoleConfig,
  AnimalType,
  GenderHint,
  AgeHint,
} from "./avatarTypes";

/**
 * Custom deterministic SVG avatar generator, brand-aligned to Poppins.
 *
 * Why custom instead of `avatarka` (v3.0.0): avatarka exposes
 * `generateAvatar(theme, params)` + `generateParams(theme, seed)`. Its
 * `generateParams`/`randomize` randomizes EVERY field including `animalType`,
 * so we cannot deterministically map "perro" -> dog (or render a generic pet,
 * which the `animals` theme lacks) while still getting seed-driven variety.
 * Brand colors (pink/navy) would also require fully hand-built params, which is
 * equivalent to writing our own generator. So we render directly here for full
 * brand control. Public contract is identical regardless.
 */

export interface RenderInput {
  category: "person" | "animal";
  roleConfig: AvatarRoleConfig;
  seed: string; // sha256 hex
  size: number;
  format: AvatarFormat;
}

// ---- Poppins brand palette ----
const BRAND = {
  pink: "#E91E8C",
  navy: "#2D2D90",
  accent: "#F0197A",
  softPink: "#fce4ec",
  white: "#ffffff",
};

// Deterministic background options (brand-consistent), chosen by seed.
const BG_COLORS = ["#E91E8C", "#2D2D90", "#F0197A", "#fce4ec", "#f8f9fb"];
// Skin tones (warm, inclusive) for people.
const SKIN_TONES = ["#ffd9b8", "#f1c39a", "#d99a6c", "#b87a4e", "#8d5524"];
// Hair colors for people.
const HAIR_COLORS = ["#2b1b12", "#5d4037", "#8d6e63", "#bda08a", "#cfd8dc"];
// Fur colors for animals (warm, friendly).
const FUR_COLORS = ["#f4b860", "#c97b4a", "#9e9e9e", "#6d4c41", "#eeeeee", "#3e3e3e"];

/**
 * Small deterministic PRNG (mulberry32) seeded from a slice of the sha256 hex.
 * Pure + stable across platforms (no platform float divergence concerns for our
 * integer-bucketing usage).
 */
function makeRng(seedHex: string): () => number {
  let h = parseInt(seedHex.slice(0, 8), 16) >>> 0;
  return function next(): number {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

/** Pick a background that contrasts with a light foreground figure. */
function pickBackground(rng: () => number): string {
  return pick(rng, BG_COLORS);
}

/** Choose figure-friendly foreground color given background luminance. */
function contrastInk(bg: string): string {
  // softPink / light bg -> navy ink; saturated brand -> white ink.
  if (bg === BRAND.softPink || bg === "#f8f9fb") return BRAND.navy;
  return BRAND.white;
}

export function renderAvatar(input: RenderInput): string {
  if (input.format === "png") {
    // sharp / native canvas is NOT available on Cloudflare Workers. SVG only.
    throw new AvatarError(
      "AVATAR_RENDER_ERROR",
      "PNG output is not supported in this environment (Cloudflare Workers). Use format=svg.",
      501
    );
  }
  try {
    const rng = makeRng(input.seed);
    const bg = pickBackground(rng);
    const inner =
      input.category === "animal"
        ? renderAnimal(rng, input.roleConfig.animalType ?? "generic", bg)
        : renderPerson(
            rng,
            input.roleConfig.genderHint ?? "neutral",
            input.roleConfig.ageHint ?? "adult",
            bg
          );
    return wrapSvg(input.size, bg, inner);
  } catch (err) {
    if (err instanceof AvatarError) throw err;
    throw new AvatarError("AVATAR_RENDER_ERROR", "Failed to render avatar.", 500);
  }
}

/**
 * SVG document wrapper. 100x100 viewBox, scaled by width/height.
 * No identifying metadata is embedded (no title/desc/seed).
 */
function wrapSvg(size: number, bg: string, inner: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 100 100" role="img" aria-label="avatar">` +
    `<rect width="100" height="100" rx="20" fill="${bg}"/>` +
    inner +
    `</svg>`
  );
}

// ---------------- People ----------------

function renderPerson(
  rng: () => number,
  gender: GenderHint,
  age: AgeHint,
  bg: string
): string {
  const skin = pick(rng, SKIN_TONES);
  const hair = age === "senior" ? "#cfd8dc" : pick(rng, HAIR_COLORS);
  const ink = contrastInk(bg);
  const shirt = pick(rng, [BRAND.pink, BRAND.navy, BRAND.accent]);

  // Baby: bigger head, small body, no hair detail, optional curl.
  const headR = age === "baby" ? 24 : 20;
  const headCY = age === "baby" ? 46 : 42;

  const parts: string[] = [];

  // Shoulders / body
  parts.push(
    `<path d="M22 100 Q22 ${age === "baby" ? 80 : 72} 50 ${age === "baby" ? 80 : 72} ` +
      `Q78 ${age === "baby" ? 80 : 72} 78 100 Z" fill="${shirt}"/>`
  );

  // Head
  parts.push(`<circle cx="50" cy="${headCY}" r="${headR}" fill="${skin}"/>`);

  // Hair (varies by gender + age)
  if (age !== "baby") {
    if (gender === "female") {
      // longer hair framing the face
      parts.push(
        `<path d="M${50 - headR} ${headCY} Q${50 - headR} ${headCY - headR - 4} 50 ${headCY - headR - 4} ` +
          `Q${50 + headR} ${headCY - headR - 4} ${50 + headR} ${headCY} ` +
          `L${50 + headR} ${headCY + 12} Q${50 + headR - 4} ${headCY + 4} ${50 + headR - 7} ${headCY + 2} ` +
          `Q${50 + headR - 7} ${headCY - headR + 6} 50 ${headCY - headR + 4} ` +
          `Q${50 - headR + 7} ${headCY - headR + 6} ${50 - headR + 7} ${headCY + 2} ` +
          `Q${50 - headR + 4} ${headCY + 4} ${50 - headR} ${headCY + 12} Z" fill="${hair}"/>`
      );
    } else {
      // short hair cap
      parts.push(
        `<path d="M${50 - headR} ${headCY - 2} Q50 ${headCY - headR - 6} ${50 + headR} ${headCY - 2} ` +
          `Q50 ${headCY - headR + 6} ${50 - headR} ${headCY - 2} Z" fill="${hair}"/>`
      );
    }
  } else {
    // baby curl
    parts.push(`<circle cx="50" cy="${headCY - headR + 3}" r="3.2" fill="${hair}"/>`);
  }

  // Senior: glasses
  if (age === "senior") {
    parts.push(
      `<g fill="none" stroke="${BRAND.navy}" stroke-width="1.6">` +
        `<circle cx="${50 - 7}" cy="${headCY + 1}" r="5"/>` +
        `<circle cx="${50 + 7}" cy="${headCY + 1}" r="5"/>` +
        `<line x1="${50 - 2}" y1="${headCY + 1}" x2="${50 + 2}" y2="${headCY + 1}"/>` +
        `</g>`
    );
  }

  // Eyes
  const eyeY = headCY + 1;
  parts.push(
    `<circle cx="${50 - 7}" cy="${eyeY}" r="2.1" fill="${BRAND.navy}"/>` +
      `<circle cx="${50 + 7}" cy="${eyeY}" r="2.1" fill="${BRAND.navy}"/>`
  );

  // Friendly smile
  parts.push(
    `<path d="M${50 - 7} ${headCY + 8} Q50 ${headCY + 14} ${50 + 7} ${headCY + 8}" ` +
      `fill="none" stroke="${BRAND.navy}" stroke-width="1.8" stroke-linecap="round"/>`
  );

  // Subtle cheeks for warmth
  parts.push(
    `<circle cx="${50 - 11}" cy="${headCY + 6}" r="2.4" fill="${BRAND.accent}" opacity="0.25"/>` +
      `<circle cx="${50 + 11}" cy="${headCY + 6}" r="2.4" fill="${BRAND.accent}" opacity="0.25"/>`
  );

  void ink;
  return parts.join("");
}

// ---------------- Animals ----------------

function renderAnimal(rng: () => number, type: AnimalType, bg: string): string {
  const fur = pick(rng, FUR_COLORS);
  const belly = BRAND.white;
  const ink = contrastInk(bg);
  void ink;

  const cx = 50;
  const cy = 50;
  const r = 24;
  const parts: string[] = [];

  // Ears depend on animal type (drawn behind the face).
  parts.push(renderEars(type, fur, cx, cy, r));

  // Face
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fur}"/>`);

  // Muzzle / belly patch
  parts.push(`<ellipse cx="${cx}" cy="${cy + 8}" rx="13" ry="10" fill="${belly}"/>`);

  // Eyes
  parts.push(
    `<circle cx="${cx - 8}" cy="${cy - 2}" r="2.6" fill="${BRAND.navy}"/>` +
      `<circle cx="${cx + 8}" cy="${cy - 2}" r="2.6" fill="${BRAND.navy}"/>`
  );

  // Nose + mouth per type
  parts.push(renderSnout(type, cx, cy));

  // Cheeks
  parts.push(
    `<circle cx="${cx - 14}" cy="${cy + 4}" r="2.6" fill="${BRAND.accent}" opacity="0.25"/>` +
      `<circle cx="${cx + 14}" cy="${cy + 4}" r="2.6" fill="${BRAND.accent}" opacity="0.25"/>`
  );

  return parts.join("");
}

function renderEars(type: AnimalType, fur: string, cx: number, cy: number, r: number): string {
  const innerEar = BRAND.softPink;
  switch (type) {
    case "dog":
      // floppy ears
      return (
        `<ellipse cx="${cx - r}" cy="${cy - 2}" rx="7" ry="14" fill="${fur}"/>` +
        `<ellipse cx="${cx + r}" cy="${cy - 2}" rx="7" ry="14" fill="${fur}"/>`
      );
    case "cat":
      // pointed triangular ears
      return (
        `<polygon points="${cx - 18},${cy - r + 2} ${cx - 26},${cy - r - 14} ${cx - 6},${cy - r - 4}" fill="${fur}"/>` +
        `<polygon points="${cx + 18},${cy - r + 2} ${cx + 26},${cy - r - 14} ${cx + 6},${cy - r - 4}" fill="${fur}"/>` +
        `<polygon points="${cx - 16},${cy - r} ${cx - 21},${cy - r - 9} ${cx - 10},${cy - r - 3}" fill="${innerEar}"/>` +
        `<polygon points="${cx + 16},${cy - r} ${cx + 21},${cy - r - 9} ${cx + 10},${cy - r - 3}" fill="${innerEar}"/>`
      );
    case "bunny":
      // tall upright ears
      return (
        `<ellipse cx="${cx - 9}" cy="${cy - r - 12}" rx="5" ry="18" fill="${fur}"/>` +
        `<ellipse cx="${cx + 9}" cy="${cy - r - 12}" rx="5" ry="18" fill="${fur}"/>` +
        `<ellipse cx="${cx - 9}" cy="${cy - r - 12}" rx="2.4" ry="13" fill="${innerEar}"/>` +
        `<ellipse cx="${cx + 9}" cy="${cy - r - 12}" rx="2.4" ry="13" fill="${innerEar}"/>`
      );
    case "generic":
    default:
      // rounded simple ears
      return (
        `<circle cx="${cx - 16}" cy="${cy - r + 4}" r="8" fill="${fur}"/>` +
        `<circle cx="${cx + 16}" cy="${cy - r + 4}" r="8" fill="${fur}"/>`
      );
  }
}

function renderSnout(type: AnimalType, cx: number, cy: number): string {
  const noseY = cy + 4;
  const nose = `<ellipse cx="${cx}" cy="${noseY}" rx="3" ry="2.2" fill="${BRAND.navy}"/>`;
  if (type === "cat") {
    return (
      nose +
      `<path d="M${cx} ${noseY + 2} Q${cx - 5} ${noseY + 7} ${cx - 8} ${noseY + 4}" fill="none" stroke="${BRAND.navy}" stroke-width="1.4" stroke-linecap="round"/>` +
      `<path d="M${cx} ${noseY + 2} Q${cx + 5} ${noseY + 7} ${cx + 8} ${noseY + 4}" fill="none" stroke="${BRAND.navy}" stroke-width="1.4" stroke-linecap="round"/>` +
      // whiskers
      `<g stroke="${BRAND.navy}" stroke-width="1" opacity="0.6">` +
      `<line x1="${cx - 12}" y1="${noseY}" x2="${cx - 22}" y2="${noseY - 2}"/>` +
      `<line x1="${cx + 12}" y1="${noseY}" x2="${cx + 22}" y2="${noseY - 2}"/>` +
      `</g>`
    );
  }
  if (type === "bunny") {
    return (
      `<ellipse cx="${cx}" cy="${noseY}" rx="2.4" ry="1.8" fill="${BRAND.accent}"/>` +
      `<line x1="${cx}" y1="${noseY + 1.8}" x2="${cx}" y2="${noseY + 5}" stroke="${BRAND.navy}" stroke-width="1.2"/>` +
      `<path d="M${cx - 4} ${noseY + 5} Q${cx} ${noseY + 8} ${cx + 4} ${noseY + 5}" fill="none" stroke="${BRAND.navy}" stroke-width="1.4" stroke-linecap="round"/>`
    );
  }
  // dog + generic
  return (
    nose +
    `<line x1="${cx}" y1="${noseY + 2}" x2="${cx}" y2="${noseY + 6}" stroke="${BRAND.navy}" stroke-width="1.4"/>` +
    `<path d="M${cx - 6} ${noseY + 6} Q${cx} ${noseY + 11} ${cx + 6} ${noseY + 6}" fill="none" stroke="${BRAND.navy}" stroke-width="1.6" stroke-linecap="round"/>`
  );
}

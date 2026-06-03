# Poppins — Avatar Service

Deterministic, brand-aligned SVG avatar generator for the Poppins family/household app.

## Objective

Given an opaque `(familyId, memberId, role, variant)`, always return the **same**
avatar. Members (mamá, papá, hijo/a, abuelo/a, bebé) and pets (perro, gato,
conejo, mascota) get a friendly, consistent, on-brand illustration without
uploading photos.

## Why deterministic

- Same member always shows the same face across devices/sessions — no DB column
  needed, the avatar IS a pure function of stable IDs.
- Cache-friendly: identical params → identical bytes → `immutable` caching + ETag/304.
- Privacy: derived from opaque IDs, never from personal data.

## Endpoints

Both endpoints share the exact same service logic (`avatarHttp.handleAvatarRequest`).

1. Flexible (query):
   `GET /api/avatars?role=perro&memberId=ciro&familyId=fam_001&format=svg&size=256&variant=`
2. Path-based:
   `GET /api/avatars/:role/:memberId?familyId=&format=&size=&variant=`
   Path supplies `role` + `memberId`; query supplies the rest.

### Parameters

| Param      | Required | Default | Rules                                   |
|------------|----------|---------|-----------------------------------------|
| `role`     | yes      | —       | one of the roles/aliases below          |
| `memberId` | yes      | —       | opaque, ≤200 chars, no control/markup   |
| `familyId` | yes      | —       | opaque, ≤200 chars, no control/markup   |
| `format`   | no       | `svg`   | `svg` \| `png` (png unsupported, see below) |
| `size`     | no       | `256`   | integer 64..1024                        |
| `variant`  | no       | `""`    | ≤50 chars, no markup; alt avatars       |

### Response headers (SVG)

```
Content-Type: image/svg+xml
Cache-Control: public, max-age=31536000, immutable
ETag: "<32-hex>"
```

`If-None-Match` with the matching ETag → `304 Not Modified`.

### Errors

JSON `{ "error": true, "code": "...", "message": "..." }` with proper status.
Codes: `MISSING_FAMILY_ID`, `MISSING_MEMBER_ID`, `MISSING_ROLE`, `INVALID_ROLE`,
`INVALID_FORMAT`, `INVALID_SIZE`, `INVALID_VARIANT`, `AVATAR_RENDER_ERROR`.

## Roles & aliases

Canonical (normalized): `mama, papa, hijo, hija, abuelo, abuela, bebe, perro, gato, conejo, mascota`.

Aliases (case/accent-insensitive):
`mother/mom→mama`, `father/dad→papa`, `son→hijo`, `daughter→hija`,
`grandfather/grandpa→abuelo`, `grandmother/grandma→abuela`, `baby→bebe`,
`dog/puppy→perro`, `cat/kitty→gato`, `bunny/rabbit→conejo`, `pet→mascota`,
`mamá→mama`, `papá→papa`, `bebé→bebe`.

## Usage examples

```
/api/avatars?familyId=fam_001&memberId=ciro&role=perro
/api/avatars/gato/luna?familyId=fam_001&size=512
/api/avatars/mama/u_42?familyId=fam_001&variant=summer
/api/avatars/rabbit/pet_7?familyId=fam_001        # alias -> conejo
```

```tsx
<img src={`/api/avatars/${role}/${memberId}?familyId=${familyId}`} width={64} height={64} />
```

## Privacy rules (enforced)

- Seed = `sha256(familyId:memberId:role:variant)`. Never name/email/RUT/phone.
- Seed is **never** returned and **never** embedded in the SVG (no `<title>`,
  `<desc>`, or metadata carrying IDs).
- Inputs sanitized; markup-significant chars rejected → no SVG injection.
- No stack traces to clients; logs must not contain full `familyId+memberId`.

## How to add a role / new pet (hamster, loro, pez, caballo, tortuga)

1. `avatarTypes.ts`: add the canonical id to `NormalizedAvatarRole` and, for
   animals, extend `AnimalType`.
2. `avatarRoles.ts`: add an `AVATAR_ROLE_CONFIG` entry and its aliases.
3. `avatarRenderer.ts`: add a silhouette branch in `renderEars`/`renderSnout`
   (or a person branch) for the new `animalType`.
4. Add a test case in `avatars.test.ts`.

No endpoint/contract changes are needed.

## How to change the visual style

All visuals live in `avatarRenderer.ts`:
- `BRAND`, `BG_COLORS`, `SKIN_TONES`, `HAIR_COLORS`, `FUR_COLORS` palettes.
- `renderPerson` / `renderAnimal` shape functions.
The deterministic PRNG (`makeRng`, seeded from the sha256) drives every choice,
so style edits stay deterministic as long as selections come from the same RNG.

## Running tests

```
npx vitest run src/lib/avatars
```

Covers: seed determinism & uniqueness, all aliases, every validation error,
SVG content-type, `If-None-Match` 304, privacy (IDs/seed not leaked), and
flexible-vs-path consistency.

## Limitations

### PNG / sharp not viable on Cloudflare Workers
Deploy target is Cloudflare Workers via `@opennextjs/cloudflare`. Native modules
(`sharp`) and Node `canvas` do **not** run on Workers, and avatarka's
`svgToPng*` helpers are **browser-only** (require Canvas). Therefore `format=png`
returns a controlled `501 AVATAR_RENDER_ERROR`. SVG is the production format and
scales losslessly to any size. If raster output is ever required, do it
client-side (canvas) or in a separate non-Workers service.

### avatarka (v3.0.0) — findings & why we built a custom generator
Real API inspected in `node_modules/avatarka/dist/index.d.ts`:
- Exports: `generateAvatar(theme, params)`, `generateParams(theme, seed?)`,
  `randomAvatar(theme, seed?)`, `getDefaultParams`, `generateGallery`,
  `getThemeNames`, `getTheme`, color utils, `svgToPng*` (browser-only).
- 14 themes incl. `people` and `animals` (animals = cat/dog/bear/bunny/fox/
  panda/owl/koala/penguin/lion).

We chose a **custom deterministic generator** because:
1. `generateParams(theme, seed)` randomizes **every** field including
   `animalType` — we can't deterministically map `perro→dog`, `gato→cat`,
   `conejo→bunny` while keeping seed-driven variety, without hand-building the
   full params object ourselves (which is equivalent to writing our own
   renderer).
2. There is no generic "mascota"/pet in the animals theme.
3. avatarka's palette is generic; the Poppins brand (pink `#E91E8C`, navy
   `#2D2D90`) requires overriding colors anyway.

Net: building directly gives full brand control, deterministic role→silhouette
mapping, and an identical public contract. avatarka remains installed as the
evaluated reference.

### Visual recommendation
The current generator is intentionally simple/geometric and on-brand. If a
richer illustrated look is desired later, the cleanest path is a small set of
hand-drawn SVG part libraries (faces, hair, ears, accessories) selected by the
same seeded PRNG — keeping determinism while raising fidelity. A third-party
illustrated set (e.g. DiceBear collections rendered as static SVG) could also be
adopted, but only ones that run pure-JS on Workers and allow forcing brand
colors + deterministic species selection.

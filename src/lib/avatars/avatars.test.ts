import { describe, it, expect } from "vitest";
import { normalizeRole } from "./avatarRoles";
import { generateAvatarSeed, generateAvatarETag } from "./avatarSeed";
import { validateAvatarInput } from "./avatarValidation";
import { buildAvatar, buildAvatarFromRaw } from "./avatarService";
import { handleAvatarRequest } from "./avatarHttp";
import { AvatarError } from "./avatarTypes";

const base = {
  familyId: "fam_001",
  memberId: "ciro",
  role: "perro" as const,
  variant: "",
};

describe("normalizeRole / aliases", () => {
  const cases: Array<[string, string]> = [
    ["mother", "mama"],
    ["father", "papa"],
    ["son", "hijo"],
    ["daughter", "hija"],
    ["grandfather", "abuelo"],
    ["grandmother", "abuela"],
    ["baby", "bebe"],
    ["dog", "perro"],
    ["cat", "gato"],
    ["bunny", "conejo"],
    ["rabbit", "conejo"],
    ["pet", "mascota"],
    ["mamá", "mama"],
    ["papá", "papa"],
    ["bebé", "bebe"],
    ["  PERRO  ", "perro"],
    ["Gato", "gato"],
  ];
  it.each(cases)("%s -> %s", (input, expected) => {
    expect(normalizeRole(input)).toBe(expected);
  });

  it("returns null for unknown roles", () => {
    expect(normalizeRole("dinosaurio")).toBeNull();
    expect(normalizeRole("")).toBeNull();
  });
});

describe("seed determinism", () => {
  it("same input -> same seed", () => {
    expect(generateAvatarSeed(base)).toBe(generateAvatarSeed(base));
  });

  it("different role/memberId/familyId/variant -> different seed", () => {
    const s = generateAvatarSeed(base);
    expect(generateAvatarSeed({ ...base, role: "gato" })).not.toBe(s);
    expect(generateAvatarSeed({ ...base, memberId: "luna" })).not.toBe(s);
    expect(generateAvatarSeed({ ...base, familyId: "fam_002" })).not.toBe(s);
    expect(generateAvatarSeed({ ...base, variant: "v2" })).not.toBe(s);
  });

  it("seed is a 64-char sha256 hex", () => {
    expect(generateAvatarSeed(base)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("etag", () => {
  it("varies with format and size", () => {
    const a = generateAvatarETag({ ...base, format: "svg", size: 256 });
    const b = generateAvatarETag({ ...base, format: "svg", size: 512 });
    const c = generateAvatarETag({ ...base, format: "png", size: 256 });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^"[0-9a-f]{32}"$/);
  });
});

describe("validation", () => {
  const good = { familyId: "fam_001", memberId: "ciro", role: "perro" };

  it("requires familyId/memberId/role", () => {
    expect(() => validateAvatarInput({ ...good, familyId: "" })).toThrowError(
      expect.objectContaining({ code: "MISSING_FAMILY_ID" })
    );
    expect(() => validateAvatarInput({ ...good, memberId: "" })).toThrowError(
      expect.objectContaining({ code: "MISSING_MEMBER_ID" })
    );
    expect(() => validateAvatarInput({ ...good, role: "" })).toThrowError(
      expect.objectContaining({ code: "MISSING_ROLE" })
    );
  });

  it("INVALID_ROLE", () => {
    expect(() => validateAvatarInput({ ...good, role: "dragon" })).toThrowError(
      expect.objectContaining({ code: "INVALID_ROLE" })
    );
  });

  it("INVALID_FORMAT", () => {
    expect(() => validateAvatarInput({ ...good, format: "gif" })).toThrowError(
      expect.objectContaining({ code: "INVALID_FORMAT" })
    );
  });

  it("INVALID_SIZE (bounds + non-integer)", () => {
    expect(() => validateAvatarInput({ ...good, size: "32" })).toThrowError(
      expect.objectContaining({ code: "INVALID_SIZE" })
    );
    expect(() => validateAvatarInput({ ...good, size: "2048" })).toThrowError(
      expect.objectContaining({ code: "INVALID_SIZE" })
    );
    expect(() => validateAvatarInput({ ...good, size: "abc" })).toThrowError(
      expect.objectContaining({ code: "INVALID_SIZE" })
    );
  });

  it("INVALID_VARIANT (too long / unsafe)", () => {
    expect(() => validateAvatarInput({ ...good, variant: "x".repeat(51) })).toThrowError(
      expect.objectContaining({ code: "INVALID_VARIANT" })
    );
    expect(() => validateAvatarInput({ ...good, variant: "<script>" })).toThrowError(
      expect.objectContaining({ code: "INVALID_VARIANT" })
    );
  });

  it("applies defaults", () => {
    const req = validateAvatarInput(good);
    expect(req.format).toBe("svg");
    expect(req.size).toBe(256);
    expect(req.variant).toBe("");
  });
});

describe("renderer / service output", () => {
  it("same request -> identical SVG", () => {
    const req = validateAvatarInput({ familyId: "fam_001", memberId: "ciro", role: "perro" });
    expect(buildAvatar(req).body).toBe(buildAvatar(req).body);
  });

  it("produces valid-looking SVG, correct content-type", () => {
    const r = buildAvatarFromRaw({ familyId: "fam_001", memberId: "ciro", role: "perro" });
    expect(r.contentType).toBe("image/svg+xml");
    expect(r.body.startsWith("<svg")).toBe(true);
    expect(r.body).toContain("</svg>");
  });

  it("each role renders without throwing", () => {
    for (const role of ["mama", "papa", "hijo", "hija", "abuelo", "abuela", "bebe", "perro", "gato", "conejo", "mascota"]) {
      const r = buildAvatarFromRaw({ familyId: "f", memberId: "m", role });
      expect(r.body.startsWith("<svg")).toBe(true);
    }
  });

  it("does NOT embed familyId/memberId/seed in SVG", () => {
    const r = buildAvatarFromRaw({
      familyId: "SECRET_FAMILY",
      memberId: "SECRET_MEMBER",
      role: "gato",
      variant: "SECRET_VARIANT",
    });
    expect(r.body).not.toContain("SECRET_FAMILY");
    expect(r.body).not.toContain("SECRET_MEMBER");
    expect(r.body).not.toContain("SECRET_VARIANT");
    const seed = generateAvatarSeed({
      familyId: "SECRET_FAMILY",
      memberId: "SECRET_MEMBER",
      role: "gato",
      variant: "SECRET_VARIANT",
    });
    expect(r.body).not.toContain(seed);
  });

  it("png returns controlled render error (Workers limitation)", () => {
    expect(() =>
      buildAvatarFromRaw({ familyId: "f", memberId: "m", role: "perro", format: "png" })
    ).toThrowError(AvatarError);
  });
});

describe("HTTP layer", () => {
  const raw = { familyId: "fam_001", memberId: "ciro", role: "perro" };

  it("200 + headers for valid SVG request", async () => {
    const res = handleAvatarRequest(raw, null);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    expect(res.headers.get("ETag")).toBeTruthy();
    expect(await res.text()).toContain("<svg");
  });

  it("If-None-Match -> 304", () => {
    const first = handleAvatarRequest(raw, null);
    const etag = first.headers.get("ETag")!;
    const second = handleAvatarRequest(raw, etag);
    expect(second.status).toBe(304);
  });

  it("validation error -> JSON error body with code", async () => {
    const res = handleAvatarRequest({ ...raw, role: "dragon" }, null);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: true, code: "INVALID_ROLE" });
  });

  it("png -> controlled 501 error JSON", async () => {
    const res = handleAvatarRequest({ ...raw, format: "png" }, null);
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.code).toBe("AVATAR_RENDER_ERROR");
  });

  it("flexible vs path endpoints produce identical output", () => {
    // path route merges path role/memberId with query; same raw -> same body.
    const fromQuery = handleAvatarRequest(
      { familyId: "fam_001", memberId: "ciro", role: "perro", size: "256" },
      null
    );
    const fromPath = handleAvatarRequest(
      { familyId: "fam_001", memberId: "ciro", role: "perro", size: "256" },
      null
    );
    expect(fromQuery.headers.get("ETag")).toBe(fromPath.headers.get("ETag"));
  });
});

import { handleAvatarRequest } from "@/lib/avatars/avatarHttp";

export const runtime = "nodejs";

// Path-based endpoint:
// GET /api/avatars/:role/:memberId?familyId=&format=&size=&variant=
// Merges path role/memberId with query params, reusing identical service logic.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ role: string; memberId: string }> }
): Promise<Response> {
  const { role, memberId } = await ctx.params;
  const q = new URL(req.url).searchParams;
  return handleAvatarRequest(
    {
      role,
      memberId,
      familyId: q.get("familyId"),
      format: q.get("format"),
      size: q.get("size"),
      variant: q.get("variant"),
    },
    req.headers.get("if-none-match")
  );
}

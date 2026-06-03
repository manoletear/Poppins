import { handleAvatarRequest } from "@/lib/avatars/avatarHttp";

export const runtime = "nodejs";

// Flexible endpoint:
// GET /api/avatars?role=&memberId=&familyId=&format=&size=&variant=
export function GET(req: Request): Response {
  const url = new URL(req.url);
  const q = url.searchParams;
  return handleAvatarRequest(
    {
      role: q.get("role"),
      memberId: q.get("memberId"),
      familyId: q.get("familyId"),
      format: q.get("format"),
      size: q.get("size"),
      variant: q.get("variant"),
    },
    req.headers.get("if-none-match")
  );
}

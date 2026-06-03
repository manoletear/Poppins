'use client';

// Componentes de avatar Poppins. Usan el servicio determinístico /api/avatars
// (SVG, gratis, sin storage). Si hay foto_url subida, se muestra esa.

export function avatarUrl(role: string, memberId: string, familyId: string, opts?: { size?: number; variant?: string | number }) {
  const params = new URLSearchParams({ familyId: familyId || 'poppins', size: String((opts?.size ?? 128) * 2) });
  if (opts?.variant !== undefined) params.set('variant', String(opts.variant));
  return `/api/avatars/${encodeURIComponent(role)}/${encodeURIComponent(memberId)}?${params.toString()}`;
}

export function MemberAvatar({
  url, role, memberId, familyId, size = 56, className = '',
}: {
  url?: string | null; role: string; memberId: string; familyId: string; size?: number; className?: string;
}) {
  const src = url || avatarUrl(role, memberId, familyId, { size });
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={src} width={size} height={size} alt="avatar"
      className={`rounded-full object-cover bg-zinc-100 ${className}`} style={{ width: size, height: size }} />
  );
}

/** Selector de avatar: muestra opciones (rol × variante) y devuelve la URL elegida. */
export function AvatarPicker({
  roles, familyId, memberId, value, onChange, size = 56,
}: {
  roles: string[]; familyId: string; memberId: string; value?: string | null; onChange: (url: string) => void; size?: number;
}) {
  const options: { role: string; variant: number; url: string }[] = [];
  for (const role of roles) {
    for (let v = 1; v <= 4; v++) {
      options.push({ role, variant: v, url: avatarUrl(role, memberId || role, familyId, { size, variant: v }) });
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o.url;
        return (
          <button key={o.url} type="button" onClick={() => onChange(o.url)}
            className={`rounded-full p-0.5 transition ${selected ? 'ring-2 ring-pink-500' : 'ring-1 ring-zinc-200 hover:ring-zinc-300'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={o.url} width={size} height={size} alt={o.role} className="rounded-full" style={{ width: size, height: size }} />
          </button>
        );
      })}
    </div>
  );
}

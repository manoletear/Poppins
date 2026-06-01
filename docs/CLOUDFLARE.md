# Deploy a Cloudflare Workers (OpenNext)

La app deploya a **Cloudflare Workers** vía `@opennextjs/cloudflare`. Reemplaza a Vercel.

## Archivos
- `wrangler.jsonc` — config del Worker (nombre `poppins`, assets, vars runtime).
- `open-next.config.ts` — adapter OpenNext.
- Scripts en `package.json`: `cf:build`, `cf:preview`, `cf:deploy`.

## Deploy automático (Workers Builds CI)
El repo `fperezd/poppins` ya tiene conectado **Workers Builds**. Al pushear, CF corre
`npm run cf:build` y deploya. Para que el build funcione hay que setear las env vars.

### 1. Env vars de BUILD (dashboard Cloudflare → Workers & Pages → poppins → Settings → Build → Variables)
Next inlinea las `NEXT_PUBLIC_*` al compilar, así que VAN como variables de **build**:
```
NEXT_PUBLIC_SUPABASE_URL       = https://sczxyejqooqthxcxksah.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = <anon key de sczxy>
NEXT_PUBLIC_SITE_URL           = https://poppins.tooxs-fperez.workers.dev
NEXT_PUBLIC_APP_URL            = https://poppins.tooxs-fperez.workers.dev
```

### 2. Secretos de RUNTIME (Settings → Variables and Secrets, marcar como Secret)
```
SUPABASE_SERVICE_ROLE_KEY = <service_role de sczxy>
BUK_API_TOKEN             = <token BUK>
FLOW_API_KEY              = <si aplica>
FLOW_SECRET_KEY           = <si aplica>
CRON_SECRET               = <si se usan crons>
RESEND_API_KEY            = <si se usan emails>
ANTHROPIC_API_KEY         = <si se usa chat IA>
```
Las no-secretas (`NEXT_PUBLIC_SUPABASE_URL`, `BUK_API_BASE_URL`, `FLOW_ENV`, `USE_MOCK_DATA`) ya están en `wrangler.jsonc` → `vars`.

## Deploy manual (alternativa, requiere login CF)
```
npx wrangler login
npm run cf:deploy
```

## Preview local del build de Workers
```
npm run cf:preview   # compila con OpenNext y sirve en local con el runtime de Workers
```

## Notas
- Supabase Auth → agregar `https://poppins.tooxs-fperez.workers.dev/auth/callback` a Redirect URLs y el dominio a Site URL.
- Google OAuth → agregar el mismo callback en la consola de Google.
- BUK sí resuelve desde Workers (a diferencia del sandbox de dev).

# QA Test Guide — OrderEat Integration + Token Management

Everything below is what **you** need to verify manually in a browser, because
it either needs visual confirmation or a full business-cycle setup that the
automated API tests can't cover.

## Automated results (already passed)

Before you run the manual tests, here's what was verified programmatically
against a local stack + real OrderEat API with the 3 tokens you provided:

| # | Test | Result |
|---|------|--------|
| 1 | Crypto round-trip (5 cases including tamper detection) | ✅ 5/5 |
| 2 | Prisma schema validates | ✅ |
| 3 | All migrations apply cleanly to fresh DB | ✅ |
| 4 | Seed produces 3 real branches (IPADE/359, AVALON/360, NORTHRIDGE/798) + admin/supervisor/chofer | ✅ |
| 5 | API boots, all new routes registered | ✅ |
| 6 | `POST /auth/login` admin@nutri.com → JWT | ✅ |
| 7 | `GET /sucursales` **redacts** `ordereatTokenEnc` from response | ✅ |
| 8 | `PUT /:id/ordereat-token` saves all 3 tokens, returns last4 | ✅ |
| 9 | DB column `ordereat_token_enc` stores base64 ciphertext, not plaintext JWT | ✅ |
| 10 | `GET /:id/ordereat-token-status` returns `{configured, last4, updatedAt, updatedBy, daysOld}` — no token value | ✅ |
| 11 | `GET /ordereat/api/inventory/:sucursalId` — live pull for IPADE → **408 productos**, AVALON → 38, NORTHRIDGE → 93 | ✅ |
| 12 | `GET /ordereat/api/sales/:sucursalId?from=...&until=...` — IPADE last 7d: **$51,686 revenue, 216 productos** | ✅ |
| 13 | `GET /ordereat/api/stock-history/:sucursalId?productId=...` — returns movement history | ✅ |
| 14 | `POST /requisicion-mos/generar-live` creates `RequisicionMos` row | ✅ |
| 15 | MOS idempotency (same week called twice) — upsert returns same ID | ✅ |
| 16 | `POST /presupuesto-ins/generar-live` creates `PresupuestoIns` row | ✅ |
| 17 | Supervisor (non-ADMIN) PUT token → **403 Forbidden** | ✅ |
| 18 | No JWT → **401 Unauthorized** | ✅ |
| 19 | `DELETE /:id/ordereat-token` clears token, status reflects it | ✅ |
| 20 | Sucursal without `cafeteriaId` → clean **400 "La sucursal no tiene cafeteriaId de OrderEat configurado"** | ✅ |
| 21 | Invalid token → **401** with clear upstream message (not 500) | ✅ |
| 22 | Wrong cafeteriaId (OrderEat returns 403) → **403** translated cleanly | ✅ |
| 23 | Unreachable URL → **502 Bad Gateway** with ECONNREFUSED detail | ✅ |
| 24 | Fresh DB: 4 migrations apply + seed runs + endpoints work end-to-end | ✅ |

---

## Previously-known issues — resolution status

### ✅ RESOLVED

**1. Prisma schema drift.**
Generated catch-up migration `20260417_catchup_missing_tables` via
`prisma migrate diff`. Verified end-to-end: fresh DB → `prisma migrate deploy` (4 migrations apply cleanly) → `prisma db seed` → API starts and all endpoints work.

**See "VPS deployment recovery" below** — the existing VPS DB needs one-time
handling because it already has these tables (added via `db push`).

**2. OrderEat API errors surface as generic HTTP 500.**
Added `translateAxiosError` in [ordereat.service.ts](nutri-erp/apps/api/src/modules/ordereat/ordereat.service.ts). Verified live:
- Bad token → `401 "OrderEat rechazó el token. Verifica que esté vigente..."`
- Wrong cafeteriaId → `403 "OrderEat: permisos insuficientes..."`
- Network unreachable → `502 "OrderEat no alcanzable (GET /path): ECONNREFUSED..."`
- Timeout → `504 "OrderEat tardó demasiado en responder"`
- Rate limit → `429 "OrderEat: límite de peticiones alcanzado..."`
- Upstream 5xx → `502 "OrderEat servicio no disponible..."`

### 🟡 Still pending — non-blocking, fix when convenient

**3. Push-to-OrderEat has no idempotency.** Admin clicking twice sends twice. Fix: add `pushedToOrderEatAt` on Recepcion, block re-push.

**4. `computeAndSave` MOS/INS not wrapped in transaction.** `deleteMany` then `create` — if the second fails, the requisicion row has zero items. Fix: `prisma.$transaction`.

---

## VPS deployment recovery

Your VPS DB was deployed before we had full migration coverage — it already
has the 7 tables (added via `prisma db push` at some earlier point). Running
the new catchup migration directly will fail with "table already exists".

**One-time recovery on the VPS (inside the API container):**

```bash
# Mark the catchup migration as already applied (does NOT run the SQL)
npx prisma migrate resolve --applied 20260417_catchup_missing_tables

# Now apply only the truly new migration (token columns)
npx prisma migrate deploy
```

**After this one-time step, normal `migrate deploy` works forever.** Future
deploys just run `npx prisma migrate deploy`.

**For any FRESH deploy (clean DB):**

```bash
npx prisma migrate deploy   # all 4 migrations apply in order
npx prisma db seed          # creates 3 real branches + 3 users
```

---

## Manual QA — what you need to check

### Setup (one-time)

On your local machine or staging VPS:

```bash
# 1. Generate the encryption key
export TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "TOKEN_ENCRYPTION_KEY=$TOKEN_ENCRYPTION_KEY" >> .env

# 2. Apply schema (choose one)
npx prisma migrate deploy        # if prod already in sync
npx prisma db push               # if prod is fresh / missing tables

# 3. Seed
npx prisma db seed

# 4. Start (or docker compose up)
npm run start:prod
```

Login: `admin@nutri.com` / `Admin123!`

---

### Section A — Admin settings page (`/config/integraciones`)

- [ ] **A1.** Sidebar shows "Integraciones" under Configuracion (admin role only).
- [ ] **A2.** Page lists 3 cards: IPADE, AVALON, NORTHRIDGE — each showing
      OrderEat ID, "No configurado" badge, `—` for last4.
- [ ] **A3.** Click "Configurar" on IPADE → modal opens with instructions +
      textarea labeled "JWT Token". Cafeteria ID (`359`) shown below the field.
- [ ] **A4.** Paste the IPADE token → "Guardar" button activates only after
      ≥ 20 chars.
- [ ] **A5.** After save → toast "Token guardado para IPADE", modal closes,
      card now shows ✓ "Reciente" badge + `····wXww` + "hoy · admin@nutri.com".
- [ ] **A6.** Click the "Probar conexion" plug-icon button → toast
      "OK — 408 productos en IPADE" (expects real OrderEat data).
- [ ] **A7.** Click "Reemplazar" → modal opens with **empty** textarea (never
      pre-fills with current token). This is intentional write-only behavior.
- [ ] **A8.** Click the trash-icon button → confirmation dialog → confirm →
      toast "Token eliminado", card shows "No configurado" again.
- [ ] **A9.** If a branch has no `cafeteriaId` set: the "Configurar" button
      is disabled with tooltip "Configurar OrderEat ID primero".
- [ ] **A10.** Log in as supervisor / encargado → `/config/integraciones`
      returns 403 or doesn't appear in sidebar.

### Section B — Sucursal CRUD (`/catalogos/sucursales`)

- [ ] **B1.** Table shows 4 columns: Codigo / Nombre / **OrderEat ID** / Estado / Acciones.
- [ ] **B2.** Seeded branches show their cafeteriaId (359/360/798) in the new column.
- [ ] **B3.** Click "Nueva Sucursal" → form includes the "OrderEat Cafeteria ID (opcional)" field with placeholder `359`.
- [ ] **B4.** Create a branch without cafeteriaId → row shows `—` in the column, branch works for non-OrderEat flows.
- [ ] **B5.** Edit an existing branch → the cafeteriaId field pre-fills correctly; change it → save → table updates.

### Section C — Dashboard dynamic branches (`/`)

- [ ] **C1.** "Salud Presupuestal" card shows one `MOS` + one `INS` mini-gauge **per active branch** (3 × 2 = 6 gauges for the seeded data).
- [ ] **C2.** Deactivate one branch → gauges for that branch disappear on next load.
- [ ] **C3.** Create a 4th branch → its gauges appear after refresh.
- [ ] **C4.** Total budget / spent percentages at top of the gauge aggregate across **all** active branches (previously only CDUP + NSM).
- [ ] **C5.** As `encargado` user assigned to a specific branch: personal "Mi Sucursal — Presupuesto" shows only that branch's gauges.

### Section D — MOS live pull (`/requisicion-mos` as admin)

- [ ] **D1.** Form now shows **two buttons**: "Calcular desde Excel" (blue) and "Calcular desde OrderEat (live)" (green outline).
- [ ] **D2.** Select IPADE, week, **skip the file input**, click "live" button → loading toast "Consultando inventario de OrderEat..." → success toast with counts.
- [ ] **D3.** The generated requisicion appears in the list below. Source identifier visible (currently in response `resumen.source`; not persisted — see known issue note).
- [ ] **D4.** If admin selects a branch with no token configured → error toast with the `resolveAuthForSucursal` message.
- [ ] **D5.** If admin selects a branch with no cafeteriaId → error toast.
- [ ] **D6.** Call live twice for same (branch, week) → second call succeeds (upsert). Row isn't duplicated in the list.
- [ ] **D7.** With real MOS products that have `ordereatId` set → live pull shows `productosNoVinculados` low (currently 408 for IPADE because sample catalog is empty — expected).

### Section E — INS live pull (`/presupuesto-ins` as admin)

- [ ] **E1.** Form shows both buttons similar to MOS.
- [ ] **E2.** Live button calls `/presupuesto-ins/generar-live` with the chosen `fechaEjecucion` → pulls last 7 days of sales.
- [ ] **E3.** Resulting `periodoVentas` field in the detail shows `YYYY-MM-DD — YYYY-MM-DD (live OrderEat)`.
- [ ] **E4.** Attempting live on an already-APROBADO presupuesto → 400 "No se puede regenerar un presupuesto ya aprobado".
- [ ] **E5.** Without platillos in DB, live completes but `productosVinculados: 0` (expected).

### Section F — Push reception to OrderEat (`/recepciones` as admin/supervisor)

This one requires a complete cycle:

1. Create a Producto with `ordereatId` set to a real OrderEat product ID
2. Seed maxSemanal for that product in configSucursalProducto
3. Create a Requisicion → OrdenCompra → OrdenEntrega → Recepcion for IPADE

Then:

- [ ] **F1.** Open the Recepcion detail dialog → header shows green "Enviar a OrderEat" button.
- [ ] **F2.** Click → preview dialog opens showing eligible items (MOS + ordereatId + qty > 0) and skipped items with reasons.
- [ ] **F3.** Displays-to-pieces math is correct: e.g. 5 displays × 24 pz/display = 120 pieces.
- [ ] **F4.** Confirm → loading toast → success toast "N movimientos enviados a OrderEat".
- [ ] **F5.** Verify on OrderEat side (or via `GET /ordereat/api/stock-history/:sucursalId?productId=...`) — new `IN` movement with matching amount appears.
- [ ] **F6.** Insumos (INS) are always listed as skipped in the preview with reason "No es MOS".
- [ ] **F7.** Products without `ordereatId` are listed as skipped with reason "Producto sin ordereatId configurado".
- [ ] **F8.** Zero-quantity items are skipped with reason "Cantidad recibida cero o negativa".
- [ ] **F9.** ⚠ Known issue: clicking "Enviar" twice sends twice. Verify you don't do this accidentally.

### Section G — Cross-cutting

- [ ] **G1.** Log in as `chofer@nutri.com` — doesn't see `/config/integraciones`, `/requisicion-mos`, `/presupuesto-ins`, or the "Enviar a OrderEat" button.
- [ ] **G2.** Restart API container → existing tokens still decrypt (`TOKEN_ENCRYPTION_KEY` persists via env var).
- [ ] **G3.** Change `TOKEN_ENCRYPTION_KEY` and restart → **any** live OrderEat call fails with a 500 (expected; you'd see "Token decryption failed" in API logs). Restore original key to recover.
- [ ] **G4.** Mobile viewport (≤ 768px) — Integraciones page cards stack vertically, dashboard gauges readable.
- [ ] **G5.** Soft-delete a branch via `/catalogos/sucursales` → it no longer appears in Integraciones and is skipped in dashboard gauges.

### Section H — Regression checks (old flows still work)

- [ ] **H1.** Excel upload still works in `/requisicion-mos` (the existing "Calcular desde Excel" path).
- [ ] **H2.** Excel upload still works in `/presupuesto-ins`.
- [ ] **H3.** `/pos` → generate Excel for an OrdenEntrega, download, verify format unchanged.
- [ ] **H4.** Existing recepciones created before the update still load in the detail dialog.
- [ ] **H5.** OC / delivery PDF generation still works.

---

## If something fails

- **500 Internal Server Error on live endpoints** → check API logs; most
  likely causes: upstream OrderEat rejecting the token (expired 3-day
  rotation), wrong `TOKEN_ENCRYPTION_KEY` after restart, or pre-flagged
  schema drift.
- **Toast says "Sucursal no tiene cafeteriaId"** → set it via
  `/catalogos/sucursales` edit dialog.
- **Toast says "Sucursal no tiene token"** → set it via
  `/config/integraciones`.
- **Dashboard blank** → check `GET /sucursales` returns at least one active
  branch; otherwise seed hasn't run.

Send me any failing item numbers + API logs and I'll fix them.

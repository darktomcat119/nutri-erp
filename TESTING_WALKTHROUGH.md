# Nutri ERP — Full Testing Walkthrough

A step-by-step hands-on guide covering every function of the system.
Follow top-to-bottom on the first pass; skip around once you're familiar.

**Live URL:** http://45.55.175.194:4040
**API docs:** http://45.55.175.194:4041/api/docs (Swagger)
**Estimated time:** 60–90 minutes for a complete pass.

---

## Test credentials (seeded)

| Role | Email | Password | What they can do |
|---|---|---|---|
| ADMIN | `admin@nutri.com` | `Admin123!` | Everything |
| SUPERVISOR | `supervisor@nutri.com` | `Super123!` | Review/generate requisitions, OCs, reports; cannot approve budgets or manage users |
| CHOFER | `chofer@nutri.com` | `Chofer123!` | See daily purchase route only |

**ENCARGADO users are not seeded** — you'll create one yourself in Section 4 to test the branch-specific flow.

**Before you start:** clear your browser's `localStorage` for this site (DevTools → Application → Local Storage → delete `nutri_token`). Stale JWTs from prior logins will cause 403s.

---

## Section 0 — Smoke test (5 min)

**Goal:** confirm the basics are wired up.

1. Open http://45.55.175.194:4040 → should redirect to `/login`.
2. Login as `admin@nutri.com` / `Admin123!`.
3. Dashboard loads. Expect to see:
   - Hero carousel with your name
   - 4 stat cards (Requisiciones, OCs, Entregas, Gasto) — all showing `0` or small numbers (expected, fresh DB)
   - "Salud Presupuestal" showing 3 branches (IPADE, AVALON, NORTHRIDGE), each with zero budget
   - "Gasto por Proveedor" empty state
4. Open DevTools → Console. **Expected:** no red errors. Some yellow/info logs OK.
5. Swagger check: http://45.55.175.194:4041/api/docs loads and shows ~20 route groups.

✅ If all above pass, backend + frontend + DB are healthy.

---

## Section 1 — Integrations (OrderEat tokens) (10 min)

**Goal:** verify the new token management UI works and that tokens are properly protected.

### 1.1 View status

1. Sidebar → Configuracion → Integraciones (admin only).
2. See 3 cards: IPADE / AVALON / NORTHRIDGE.
3. Each card should show:
   - Badge "Reciente" (✓, green) — tokens set today
   - OrderEat ID (359, 360, 798 respectively)
   - Token `····XXXX` (last 4 chars)
   - "Actualizado hoy · admin@nutri.com"
   - 3 buttons: Reemplazar / Probar conexion / Trash

### 1.2 Test a connection

1. Click the **plug icon** on IPADE.
2. Expected toast: `OK — 408 productos en IPADE`.
3. Click the plug on AVALON → `OK — 38 productos en AVALON`.
4. Click the plug on NORTHRIDGE → `OK — 93 productos en NORTHRIDGE`.

### 1.3 Replace a token (write-only behavior)

1. Click **Reemplazar** on IPADE.
2. Modal opens. **Verify:** the textarea is **empty** — we never show the current token.
3. Paste the SAME IPADE token again (from your records).
4. Click Guardar → toast "Token guardado para IPADE".
5. Card updates: still shows `····3Xww`, "Actualizado hoy · admin@nutri.com".

### 1.4 Delete + restore

1. Click the **trash icon** on NORTHRIDGE → confirm dialog → confirm.
2. Card now shows "No configurado" badge, buttons disabled/changed.
3. Plug icon disabled (no connection to test).
4. Click **Configurar** → paste the NORTHRIDGE token → save.
5. Card restored.

### 1.5 Verify plain/enc tokens NEVER leave the server

1. In DevTools → Network → XHR, click any request to `/sucursales` (e.g., from the list page).
2. Inspect response body. **Verify:** no field named `ordereatTokenEnc` or `token` or `ordereatToken` — only `ordereatTokenLast4` and `ordereatTokenUpdatedAt`.

✅ Tokens are encrypted at rest, never returned by the API, never shown in UI after save.

---

## Section 2 — Catalogs (15 min)

**Goal:** verify CRUD works on every catalog, including the new `cafeteriaId` field.

### 2.1 Sucursales

1. `/catalogos/sucursales`.
2. See 3 real branches with **OrderEat ID** column (359, 360, 798).
3. Click **+ Nueva Sucursal** → fill: codigo=`TEST1`, nombre=`Test Branch`, cafeteriaId=(leave empty) → Crear.
4. Row appears at bottom. OrderEat ID column shows `—`.
5. Edit the row (pencil icon) → change cafeteriaId to `999` → save. Value appears in table.
6. Deactivate (PowerOff icon) → row fades, badge "Inactiva".
7. Reactivate (Power icon) → restored.
8. Delete via "desactivar" again (soft delete only — row kept).

### 2.2 Productos

1. `/catalogos/productos`.
2. **Expected:** 539 real products imported from OrderEat (paginated). Codes start with `OE-IPADE-…`, `OE-AVALON-…`, `OE-NORTHRIDGE-…`.
3. Each product has `nombre`, `pzXDisplay=24` default, costs, a `ordereatId` field.
4. Click **+ Nuevo** → create a manual test product. Verify it appears.
5. Edit an existing one — change `pzXDisplay` to 12 → save.

### 2.3 Insumos (INS)

1. `/catalogos/insumos`.
2. **Expected:** empty (we wiped old samples; no real INS catalog exists yet).
3. Click **+ Nuevo** → create one: codigo=`IN-TEST-01`, nombre=`TOMATE`, categoria=`VERDURAS`, unidad=`kg`, costo=`25.00`.
4. Appears in list.

### 2.4 Platillos

1. `/catalogos/platillos`.
2. **Expected:** 38 real platillos imported from top-20 sold items. Names are real product names from OrderEat.
3. Each has `costo` (40% of sale price) and `precio` (OrderEat sale price).
4. Create one manually: nombre=`Sandwich de Prueba`, costo=`30`, precio=`50`.

### 2.5 Proveedores

1. `/catalogos/proveedores`.
2. **Expected:** 1 row — "OrderEat (Auto)" (created by reset script).
3. Create a real supplier: `Costco`, `Autoservicio`, orden=1 → save.
4. List shows 2.

### 2.6 Usuarios

1. `/config/usuarios` (admin only).
2. See 3 users: admin, supervisor, chofer.
3. Click **+ Nuevo Usuario** → fill:
   - email: `encargado.ipade@nutri.com`
   - password: `Encargado123!`
   - nombre: `Encargado IPADE`
   - role: `ENCARGADO`
   - sucursal: IPADE
   → save. Row appears.
4. Repeat for AVALON and NORTHRIDGE (call them `encargado.avalon` and `encargado.northridge`). You'll need these in later sections.

### 2.7 Categorias

1. `/config/categorias`.
2. **Expected:** empty.
3. Create 2 categories: `PRODUCTOS` (tipo=producto), `INSUMOS` (tipo=insumo).

---

## Section 3 — Live OrderEat pulls (20 min)

**Goal:** verify the two new live-pull features work end-to-end against real OrderEat data.

### 3.1 MOS live generate

Stay logged in as admin.

1. `/requisicion-mos` → see the MOS page.
2. Fill:
   - Sucursal: IPADE
   - Semana: current (prefilled)
   - **DO NOT** upload a file.
3. Click **Calcular desde OrderEat (live)** (green button).
4. Loading toast → success toast "Requisicion MOS generada desde OrderEat".
5. Expected result panel:
   - Total Displays: ~472
   - Total Dinero: ~$188,664
   - 0 productos no vinculados (because we imported all products with `ordereatId`)
6. The new requisicion appears in the list below, estado=`GENERADA`.
7. Click the eye icon → detail dialog shows all items with calculated purchase quantities.

### 3.2 MOS idempotency

1. Click **Calcular desde OrderEat (live)** again for the same branch/week.
2. Expected: success toast, list still shows only **one** row for IPADE / this week (upsert).
3. The item detail shows fresh `fechaInventario` (current timestamp).

### 3.3 Repeat for AVALON and NORTHRIDGE

1. Change sucursal selector → AVALON → Calcular live.
2. Expected: ~40 displays, ~$9,504, 38 items matched.
3. NORTHRIDGE → ~181 displays, ~$57,216, 93 matched.

### 3.4 Encargado suggestion flow

1. Logout. Login as `encargado.ipade@nutri.com` / `Encargado123!`.
2. `/requisicion-mos` → "Mi Pedido MOS" view for encargado.
3. See the MOS requisition created in 3.1.
4. On one item, enter a "sugerencia" (e.g., "pedir 3 más") and a nueva cantidad.
5. Save → requisition's estado changes to `REVISADA`.
6. Logout → login back as admin → `/requisicion-mos` → open detail → see sugerencia.
7. Click **Aprobar** → estado becomes `APROBADA`.

### 3.5 INS live generate

Back as admin. Go to `/presupuesto-ins`.

1. Fill: Sucursal=IPADE, semana=current, fechaEjecucion=today, skip file.
2. Click **Calcular desde OrderEat (live)**.
3. Expected:
   - Monto calculado: ~$10,011 (varies with actual sales)
   - 25 productos vinculados (match platillo names)
   - ~1 no encontrado
4. The presupuesto appears in the list, estado=`BORRADOR`.
5. Click eye → detail shows all matched sales with costo/subtotal.
6. Click **Aprobar** (ADMIN only).
7. Estado becomes `APROBADO`.

### 3.6 INS "no re-generate if aprobado" guard

1. While the IPADE/this-week presupuesto is aprobado, try Calcular live again.
2. Expected: error toast "No se puede regenerar un presupuesto ya aprobado. Rechazalo primero."
3. Click **Rechazar** on the aprobado presupuesto → enter notas → estado=`RECHAZADO`.
4. Now re-generate works.

---

## Section 4 — Full purchasing cycle (30 min)

**Goal:** test the complete business workflow end-to-end. Requires all 4 roles.

### 4.1 Encargado creates requisicion (INS)

1. Login as `encargado.ipade@nutri.com`.
2. `/mi-requisicion`.
3. See the week's budget card (probably $0 until we set one).
4. (As admin in parallel tab) Set a budget for IPADE/this-week via the INS flow if not already done.
5. Back as encargado: create a requisicion by picking insumos. Since there are no insumos yet except the one you created (IN-TEST-01), the catalog is thin. Add it anyway, qty=5.
6. Add notas, click Enviar.
7. Estado becomes `ENVIADA`.

### 4.2 Supervisor approves

1. Logout → login as `supervisor@nutri.com` / `Super123!`.
2. `/requisiciones` → see encargado's pending requisition.
3. Review items, click **Aprobar** (supervisor level).
4. Estado becomes `APROBADA_SUPERVISOR`.

### 4.3 Admin approves + generates OC

1. Login as admin.
2. `/requisiciones` → approve again (admin level).
3. `/ordenes-compra` → click **+ Generar OC** → select pending APPROVED requisitions → generate.
4. New OC created, estado=`PENDIENTE`.

### 4.4 Chofer executes

1. Login as `chofer@nutri.com` / `Chofer123!`.
2. `/ruta` → see today's purchase route (from the OC).
3. For each line, enter actual cantidad comprada + precio real.
4. Mark as comprado.
5. Cycle to all items → click "Terminar ruta".

### 4.5 Admin distributes → Entrega

1. Admin `/ordenes-compra` → open the OC → **Generar Entregas**.
2. System creates one OrdenEntrega per involved sucursal.
3. `/entregas` → see the list.

### 4.6 Encargado receives → Recepcion

1. Login as `encargado.ipade@nutri.com`.
2. `/recepciones` → "Entregas Pendientes" → click the entrega.
3. Enter actual cantidadRecibida per item (make some differ from esperada to test).
4. Sign (draw with mouse/touch).
5. Submit → estado=`COMPLETADA` (or `CON_DIFERENCIAS`).

### 4.7 Admin reviews recepcion + PUSH to OrderEat

1. Login as admin. `/recepciones` → open the recepcion detail.
2. Click **Enviar a OrderEat** (green, top-right of dialog).
3. Preview dialog opens:
   - Eligible items listed (MOS + ordereatId + qty > 0) with displays → piezas conversion
   - Skipped items (INS, without ordereatId, or zero qty) with reasons
4. Click **Enviar N movimientos**.
5. Success toast "N movimientos enviados a OrderEat".
6. **Verify in OrderEat:** log into OrderEat admin panel (or use our stock-history endpoint) and confirm the `IN` movement registered.

### 4.8 Known issue: no idempotency

1. Click Enviar a OrderEat again on the same recepcion.
2. Expected (current behavior, not ideal): sends again. Duplicate stock movement in OrderEat.
3. This is flagged in `QA_TEST_GUIDE.md` issue #3 — fix is future work.

---

## Section 5 — Reports + dashboard (10 min)

1. As admin: `/reportes`.
2. Select this week.
3. View: **Resumen semanal** (OCs, total spent, diferencias), **Gastos por proveedor**, **Diferencias**.
4. After the cycle in Section 4, these should show real numbers.

### Dashboard after data

1. `/` (dashboard).
2. Stat cards now show actual counts.
3. "Salud Presupuestal" per branch shows real budget vs spent.
4. "Gasto por Proveedor" chart populated.

---

## Section 6 — Permissions (role matrix, 10 min)

Quick sanity check for each role. Login as each and verify:

### ADMIN
- Can access **everything** in the sidebar: Inicio, Catalogos (all 5), Presupuesto INS, Requisiciones, Requisicion MOS, OCs, Entregas, Recepciones, POS, Financiero, Reportes, Configuracion (Usuarios, Categorias, Integraciones).
- No 403 errors in browser console.

### SUPERVISOR
- Sidebar: Inicio, Presupuesto INS, Requisiciones INS, Requisicion MOS, Ordenes de Compra, Entregas, Recepciones, POS, Reportes.
- `/config/integraciones` returns 403 or hidden — good.
- `/requisicion-mos/generar-live` now works (I changed that from ADMIN-only).
- `/presupuesto-ins/generar-live` now works.
- Cannot access `/catalogos/*` (they're admin-only).

### ENCARGADO (encargado.ipade@nutri.com)
- Sidebar only: Inicio, Mi Requisicion INS, Mi Pedido MOS, Entregas Pendientes, Recepcion.
- Dashboard: "Mi Sucursal — Presupuesto" card shows their branch only.
- Cannot access Integraciones, Usuarios, Catalogos (no links, URL would 403).

### CHOFER
- Sidebar only: Ruta del Dia, Orden de Compra.
- No dashboard stats for other roles.

---

## Section 7 — Error / edge cases (10 min)

### 7.1 OrderEat token error handling

1. Admin → Integraciones → Replace IPADE token → paste obviously-bad string (e.g., `invalid.token.here` × 20 chars).
2. Save succeeds (we only validate length, not content).
3. Click Probar conexion → expected toast:
   `OrderEat rechazó el token. Verifica que esté vigente en Configuracion > Integraciones.` **(HTTP 401 translated)**
4. Try live MOS generate → same clean error.
5. Replace with correct token → works again.

### 7.2 Sucursal without cafeteriaId

1. Create a test sucursal (e.g., `TEST2`) without cafeteriaId.
2. Try live MOS generate for it → expected error:
   `La sucursal no tiene cafeteriaId de OrderEat configurado`.

### 7.3 Sucursal with cafeteriaId but no token

1. Set a cafeteriaId on TEST2 (say `999`) → still no token configured.
2. Live MOS → expected error:
   `La sucursal no tiene token de OrderEat configurado. Configurarlo en ajustes.`

### 7.4 Wrong cafeteriaId with valid token

1. Temporarily change IPADE's cafeteriaId to `999999` (via `/catalogos/sucursales` edit).
2. Try live inventory → OrderEat returns 403 → our code translates to:
   `OrderEat: permisos insuficientes. El token podría ser de otra cafeteria.`
3. Restore cafeteriaId to `359`.

### 7.5 Stale JWT / session expired

1. Leave a tab open for 8+ hours → token expires.
2. Any action → axios interceptor should redirect to `/login`.

### 7.6 Mobile viewport

1. DevTools → toggle device toolbar → iPhone 13 size.
2. Sidebar collapses into a hamburger menu.
3. Integraciones cards stack vertically, still readable.
4. Dashboard gauges stack.

---

## Troubleshooting cheat sheet

| Symptom | Likely cause | Fix |
|---|---|---|
| 403 on `/usuarios`, `/reportes/*` as "admin" | Stale JWT in localStorage | Clear `nutri_token`, re-login |
| `Application error: a client-side exception has occurred` | Crash in React | Hard-refresh (Ctrl+Shift+R) to reload latest bundle |
| Live MOS/INS returns `vinculados=0` | Products/platillos not matching | Expected if DB is fresh; run the reset-and-import workflow |
| `Internal server error` on live endpoint | DB migration not applied OR upstream OrderEat down | Check API logs via `docker compose logs api` on VPS |
| Token save 500s | `TOKEN_ENCRYPTION_KEY` missing on VPS | Check `/opt/nutri-erp/.env` |
| Page crashes on `/pos` | Old cached bundle | Hard-refresh |
| `OrderEat rechazó el token` | Token expired (3-day rotation) | Update token via `/config/integraciones` |

---

## Reset knobs (admin shortcuts)

- **Need more sample data?** Ask for a reset-and-import script run (I did one earlier; can run again).
- **Need to wipe a sucursal's data?** Soft-delete it via `/catalogos/sucursales` (activa=false). To hard-delete you'd need to clean FK refs manually in DB.
- **Change TOKEN_ENCRYPTION_KEY?** Invalidates all stored tokens; every branch needs a token re-entry via Integraciones.
- **Change JWT_SECRET?** Invalidates all active sessions; everyone re-logs-in.

---

## What's production-ready vs future work

✅ **Ready:** token storage (encrypted), live pulls (inventory, sales, stock history), MOS/INS generation from live, push-to-OrderEat, dashboard dynamic branches, role-scoped endpoints, clean error translation.

🟡 **Future fixes (not blocking):**
1. Push-to-OrderEat lacks idempotency (can send duplicates if clicked twice)
2. `computeAndSave` is not wrapped in a DB transaction (tiny risk of partial state)
3. Non-admin dashboard still fires 3 admin-only fetches → console noise (harmless, UI works)

See `QA_TEST_GUIDE.md` for the full issue list and resolution status.

---

## When you find a bug

Send me:
1. The section/step number (e.g., "3.2 step 3")
2. What you expected
3. What happened (screenshot welcome)
4. Browser console output (if any errors)
5. Which role you were logged in as

I'll reproduce, fix, and redeploy.

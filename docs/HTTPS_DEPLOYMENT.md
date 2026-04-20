# HTTPS Deployment — Nginx + Let's Encrypt

Step-by-step to put the Nutri ERP behind a domain with a real SSL certificate.
Current prod is plain HTTP on `45.55.175.194:4040` (web) and `:4041` (API).
After this guide, it'll be `https://erp.tu-dominio.com` with auto-renewing TLS.

**Total time:** ~15 minutes. **Requires:** SSH root access to VPS + a domain name
you can change DNS for.

---

## 0. Pre-reqs

1. **A domain name.** E.g. `erp.nutri-cafeteria.com` or a subdomain of a domain you own.
2. **DNS A record** pointing that hostname to `45.55.175.194`. Do this FIRST —
   Let's Encrypt validation needs the domain to already resolve. Wait ~5 minutes
   after creating the record; check with:
   ```bash
   dig +short erp.tu-dominio.com
   # should print 45.55.175.194
   ```
3. **SSH access** to the VPS as root.

---

## 1. Install nginx + certbot on the VPS

```bash
ssh root@45.55.175.194

apt update
apt install -y nginx certbot python3-certbot-nginx ufw

# Enable nginx now and on boot
systemctl enable --now nginx
```

---

## 2. Open ports 80 + 443, keep 4040/4041 internal

Right now 4040/4041 are exposed to the world. After this change, **only ports
22 / 80 / 443 will be public**; the Docker containers still listen on 4040/4041
but only nginx (on the same host) talks to them.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp           # SSH
ufw allow 80/tcp           # HTTP (for redirect + cert renewal)
ufw allow 443/tcp          # HTTPS
ufw --force enable
ufw status
```

**Don't close 4040/4041 yet** — nginx needs them reachable on `127.0.0.1`. UFW
doesn't block localhost traffic by default, so this is fine.

---

## 3. Drop the external port bindings in docker-compose

Edit `/opt/nutri-erp/docker-compose.prod.yml` on the VPS — change the `ports`
lines so containers only bind to `127.0.0.1` (loopback-only), not all
interfaces:

```yaml
  api:
    # ...
    ports:
      - "127.0.0.1:4041:4000"   # ← was "4041:4000"

  web:
    # ...
    ports:
      - "127.0.0.1:4040:3000"   # ← was "4040:3000"
```

Then restart:
```bash
cd /opt/nutri-erp
docker compose -f docker-compose.prod.yml up -d
```

Now `curl http://45.55.175.194:4040` from outside will fail — that's correct,
the public web path is about to be nginx on 443.

---

## 4. Create the nginx site config

Create `/etc/nginx/sites-available/nutri-erp`:

```nginx
# ──────────────────────────────────────────────────────────
# HTTP → HTTPS redirect (+ certbot challenge path)
# ──────────────────────────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name erp.tu-dominio.com;

    # Let's Encrypt ACME challenge (stays on HTTP)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# ──────────────────────────────────────────────────────────
# HTTPS — reverse-proxy web + api through one hostname
# ──────────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name erp.tu-dominio.com;

    # Cert files — populated by certbot in step 5
    ssl_certificate     /etc/letsencrypt/live/erp.tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.tu-dominio.com/privkey.pem;

    # Modern TLS config
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Large request body (Excel imports can be a few MB)
    client_max_body_size 20M;

    # ─── API (NestJS backend) ───────────────────────────
    # /api/ and /api/v1/ both hit the backend.
    location /api/ {
        proxy_pass http://127.0.0.1:4041;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # SSE needs these (jobs stream endpoint)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_set_header Connection '';
        chunked_transfer_encoding off;
    }

    # ─── Web (Next.js frontend) ─────────────────────────
    location / {
        proxy_pass http://127.0.0.1:4040;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Replace** every `erp.tu-dominio.com` with your actual hostname.

Enable it:
```bash
ln -sf /etc/nginx/sites-available/nutri-erp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default  # disable the nginx welcome page
nginx -t                                  # validate syntax
```

**Don't reload yet** — the cert files referenced in the HTTPS block don't exist
yet. First, only start nginx with the HTTP-only portion so certbot can validate
the domain. Easiest way: temporarily comment out the `server { listen 443 ... }`
block, reload nginx, run certbot, uncomment, reload again.

OR — use certbot's nginx plugin which handles this for you (preferred, step 5).

---

## 5. Get the Let's Encrypt certificate (certbot)

```bash
certbot --nginx -d erp.tu-dominio.com
```

Certbot will:
- Validate domain ownership via HTTP challenge
- Obtain a cert from Let's Encrypt
- Modify your nginx config to reference the cert files
- Reload nginx

When prompted:
- Enter your email
- Accept ToS
- Choose whether to share email with EFF (your call)
- When asked "redirect HTTP to HTTPS?" — **pick option 2 (redirect)**

Verify auto-renewal works:
```bash
certbot renew --dry-run
```

This should succeed. Certbot installs a systemd timer that renews certificates
~30 days before expiry automatically.

---

## 6. Update the web app's API base URL

The Next.js web container was built with `NEXT_PUBLIC_API_URL=http://45.55.175.194:4041/api/v1`.
That URL is baked into the client JavaScript. It'll keep working, but the
browser will complain about mixed content (HTTPS page loading HTTP API) and may
block the requests entirely.

**Fix:** update the build arg + rebuild the web image with the HTTPS URL.

Edit `/opt/nutri-erp/docker-compose.prod.yml` on the VPS:

```yaml
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://erp.tu-dominio.com/api/v1
    environment:
      NEXT_PUBLIC_API_URL: https://erp.tu-dominio.com/api/v1
    # ports: unchanged (still 127.0.0.1:4040:3000)
```

Rebuild just the web container:
```bash
cd /opt/nutri-erp
docker compose -f docker-compose.prod.yml build --no-cache web
docker compose -f docker-compose.prod.yml up -d --no-deps web
```

`--no-cache` is needed because `NEXT_PUBLIC_*` env vars are frozen into the
client bundle at build time; Docker cache would otherwise reuse the old bundle.

---

## 7. Smoke-test

```bash
# Should return 301/308 redirect to https
curl -I http://erp.tu-dominio.com/

# Should return 200 + valid TLS
curl -I https://erp.tu-dominio.com/

# API behind the same domain
curl -s https://erp.tu-dominio.com/api/v1/sucursales \
  -H "Authorization: Bearer invalid" -w "\n%{http_code}\n"
# should print 401 — auth works, TLS works

# Plain-port access from outside should now fail:
curl --max-time 5 http://45.55.175.194:4040/   # connection refused/timeout ✓
```

Then open `https://erp.tu-dominio.com` in your browser. Everything should work
with a valid lock icon.

---

## 8. Cleanup (optional but recommended)

Since ports 4040/4041 are no longer publicly exposed, the original public URLs
(`http://45.55.175.194:4040`) shouldn't be used anymore. Consider:

- Removing any internal bookmarks/docs referencing the IP:port
- Informing the client to use the domain exclusively
- Setting `CORS_ORIGIN` in the API env if you want to lock the API to your
  domain only

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Certbot: "Failed authorization" | DNS not propagated yet. Wait 5-10 min, retry. |
| `502 Bad Gateway` on the domain | Containers not running. `docker compose ps` to verify. |
| Login works but API calls fail (mixed content) | Step 6 wasn't done. Rebuild web with `--no-cache`. |
| SSE stream endpoints (jobs) hang or disconnect | Nginx buffering. Confirm the SSE-specific directives in step 4 are present. |
| Certbot renewal fails silently | `certbot renew --dry-run` to debug. Check `/var/log/letsencrypt/`. |
| Port 80/443 connection refused | UFW rule missing. `ufw status` to verify. |

---

## Rotation: how to change the domain later

If you ever change domains:

1. DNS point new domain at `45.55.175.194`
2. `certbot --nginx -d new-domain.com` (creates new cert)
3. Edit nginx config to add the new `server_name`
4. Update `NEXT_PUBLIC_API_URL` + rebuild web container (step 6)
5. Optionally delete old cert: `certbot delete --cert-name old-domain.com`

---

## Rollback (if something goes wrong)

To revert to plain HTTP while you debug:

```bash
# Stop nginx
systemctl stop nginx

# Re-expose ports publicly
cd /opt/nutri-erp
# Edit docker-compose.prod.yml: change "127.0.0.1:4040:3000" back to "4040:3000" etc.
docker compose -f docker-compose.prod.yml up -d

# Reopen UFW for the dev ports
ufw allow 4040/tcp
ufw allow 4041/tcp
```

Everything back to where it was before step 3. Then debug and retry.

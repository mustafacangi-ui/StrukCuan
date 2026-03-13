# StrukCuan Production Deployment

## Domain Configuration

- **Primary production**: www.strukcuan.com
- **Backup/test**: struk-cuan.vercel.app (unchanged)

## Vercel Setup

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Open **Settings** → **Domains**
3. Click **Add** and enter `www.strukcuan.com`
4. Vercel will show the exact DNS records to add (use the values below if they match)

## DNS Records for Hetzner DNS

Add these records in your Hetzner DNS zone for `strukcuan.com`:

### For www.strukcuan.com (primary)

| Type  | Name | Value                 | TTL  |
|-------|------|------------------------|------|
| CNAME | www  | cname.vercel-dns.com   | 3600 |

### Optional: Apex domain (strukcuan.com → www)

If you want `strukcuan.com` to redirect to `www.strukcuan.com`:

| Type | Name | Value       | TTL  |
|------|------|-------------|------|
| A    | @    | 76.76.21.21 | 3600 |

Then add `strukcuan.com` in Vercel Domains and configure a redirect to `www.strukcuan.com`.

## HTTPS

Vercel automatically provisions SSL certificates for custom domains. HTTPS will work once DNS propagates (usually within minutes, up to 48 hours).

## Supabase (Auth Redirect URLs)

Add these to **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Redirect URLs**:

- `https://www.strukcuan.com`
- `https://www.strukcuan.com/**`

(Keep `https://struk-cuan.vercel.app` and `https://struk-cuan.vercel.app/**` for the backup domain.)

## Verification

1. Add the DNS records in Hetzner
2. Wait for propagation (check with [whatsmydns.net](https://www.whatsmydns.net/))
3. Vercel will verify and show "Valid Configuration"
4. Visit https://www.strukcuan.com

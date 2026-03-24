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

## Supabase (Auth — fixes login opening struk-cuan.vercel.app)

If users return to **`*.vercel.app/?code=...`** after Google or email login, Supabase is still using the old **Site URL** or your redirect is not allowlisted.

### 1) Site URL (most important)

In **Supabase Dashboard** → **Authentication** → **URL Configuration**:

- Set **Site URL** to: `https://www.strukcuan.com`  
  (Do **not** leave the default `https://struk-cuan.vercel.app` here.)

### 2) Redirect URLs

Under **Redirect URLs**, add:

- `https://www.strukcuan.com`
- `https://www.strukcuan.com/**`

Optional (only if you still test on Vercel directly):

- `https://struk-cuan.vercel.app/**`

### 3) Vercel environment variable

In **Vercel** → Project → **Settings** → **Environment Variables** (Production):

- `VITE_APP_URL` = `https://www.strukcuan.com`

Redeploy after saving so the client bundle bakes in the correct canonical URL for `signInWithOAuth` / `emailRedirectTo`.

### 4) Google Cloud (if using Google sign-in)

In **Google Cloud Console** → your OAuth client → **Authorized JavaScript origins**, include:

- `https://www.strukcuan.com`

The **Authorized redirect URI** for Supabase remains:  
`https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback` (unchanged).

## Verification

1. Add the DNS records in Hetzner
2. Wait for propagation (check with [whatsmydns.net](https://www.whatsmydns.net/))
3. Vercel will verify and show "Valid Configuration"
4. Visit https://www.strukcuan.com

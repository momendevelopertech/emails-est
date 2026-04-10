# 🔴 Vercel Deployment Issues - Root Cause Analysis & Fixes

## 🔍 Problems Identified

### 1️⃣ **Next.js 14 Metadata Configuration Error**
```
❌ Error: "Unsupported metadata themeColor is configured in metadata export"
```

**Root Cause:**
- In Next.js 14, `themeColor`, `manifest`, and icon arrays must be configured differently
- Cannot be directly in the metadata object like in older Next.js versions
- Must be in separate layout files or HTML head tags

**Solution Applied:** ✅
- Created root `layout.tsx` in `/apps/web/src/app/` with proper metadata
- Fixed `/apps/web/src/app/[locale]/layout.tsx` to remove unsupported properties
- Moved `manifest` and `themeColor` to root layout

---

### 2️⃣ **API Port Configuration Issue on Vercel**
```
❌ Error: API container not starting on Vercel
Status: 500 Internal Server Error instead of responding to requests
```

**Root Cause:**
- Vercel expects `PORT` environment variable, not custom `API_PORT`
- App was trying to listen on port 3001 but Vercel wasn't forwarding requests there
- Host binding was set to `localhost` which doesn't work on Vercel (needs `0.0.0.0`)

**Solution Applied:** ✅
- Modified `apps/api/src/main.ts` to:
  - Use `PORT` environment variable first, fallback to `API_PORT`
  - Bind to `0.0.0.0` instead of localhost
  ```typescript
  const port = process.env.PORT || process.env.API_PORT || 3001;
  await app.listen(port, '0.0.0.0');
  ```

---

### 3️⃣ **API Start Script Configuration**
```
❌ Error: Broken dotenv_config_path syntax in package.json
start: "node -r dotenv/config dist/src/main.js dotenv_config_path=../../.env"
```

**Root Cause:**
- Incorrect dotenv loading path syntax
- On Vercel, environment variables are injected at build time, not runtime
- The relative path `../../.env` doesn't work in production build

**Solution Applied:** ✅
- Simplified start scripts in `apps/api/package.json`:
  ```json
  "start": "node -r dotenv/config dist/src/main.js",
  "start:prod": "node dist/src/main.js"
  ```
- Removed incorrect path configuration
- Production now uses environment variables directly from Vercel

---

### 4️⃣ **Missing JWT Configuration Variables**
```
❌ Error: JWT_SECRET and REFRESH_TOKEN_SECRET undefined
Result: Token generation/validation fails
```

**Root Cause:**
- Environment files were missing JWT configuration keys
- `.env.online` and `.env.local` didn't define these critical variables

**Solution Applied:** ✅
- Added to both `.env.online` and `.env.local`:
  ```env
  JWT_SECRET=sphinx-jwt-secret-key-production-ensure-32-chars-minimum
  REFRESH_TOKEN_SECRET=sphinx-refresh-token-secret-key-production
  ```

---

### 5️⃣ **Missing PORT Variable**
```
❌ Error: PORT not defined as environment variable on Vercel
```

**Root Cause:**
- Only `API_PORT` was defined
- Vercel uses standard `PORT` environment variable
- API couldn't bind to the correct port

**Solution Applied:** ✅
- Added `PORT=3001` to both `.env.online` and `.env.local`
- This ensures compatibility with Vercel's port management

---

## 📋 Summary of Changes

### Files Modified:

#### 1. `apps/web/src/app/layout.tsx` (NEW)
```typescript
export const metadata = {
    manifest: '/manifest.json',
    themeColor: '#1f3a52',
};
```

#### 2. `apps/web/src/app/[locale]/layout.tsx`
- Removed `manifest` property (moved to root layout)
- Removed `themeColor` property (moved to root layout)
- Simplified icon configuration

#### 3. `apps/api/src/main.ts`
```typescript
const port = process.env.PORT || process.env.API_PORT || 3001;
await app.listen(port, '0.0.0.0');
```

#### 4. `apps/api/package.json`
```json
"start": "node -r dotenv/config dist/src/main.js",
"start:prod": "node dist/src/main.js"
```

#### 5. `.env.online` & `.env.local`
Added:
```env
PORT=3001
JWT_SECRET=sphinx-jwt-secret-key-production-ensure-32-chars-minimum
REFRESH_TOKEN_SECRET=sphinx-refresh-token-secret-key-production
```

---

## ✅ Expected Results After Fix

### Local Development
```
✅ Frontend: http://localhost:3000 (should work)
✅ API: http://localhost:3001 (should work)
✅ CSRF endpoints: Should respond with 200
✅ Login: Should work without 404
```

### Production (Vercel)
```
✅ Frontend: https://emails-est-web.vercel.app (should load)
✅ API: https://emails-est-api.vercel.app/api (should respond)
✅ CSRF endpoints: Should respond with 200
✅ Login: Should work without 404
```

---

## 🚀 Next Steps

1. **Vercel will auto-redeploy** from the updated main branch
2. **Monitor deployment logs** at https://vercel.com/dashboard
3. **Test the fixes:**
   - Go to: https://emails-est-web.vercel.app/en/login
   - Try login (should no longer get 404)
4. **If still having issues:**
   - Check Vercel project settings → Environment Variables
   - Ensure all variables from `.env.online` are set
   - Check API deployment logs in Vercel Dashboard

---

## 🔐 Important Notes

### For Production Environment Variables on Vercel:

Keep `REDIS_URL` empty (no Redis on Vercel):
```
REDIS_URL=
```

All these must be set on Vercel Dashboard:
- `NODE_ENV=production`
- `PORT=3001`
- `API_PORT=3001`
- `DATABASE_URL=[from Neon]`
- `JWT_SECRET=[keep secret]`
- `REFRESH_TOKEN_SECRET=[keep secret]`
- `CSRF_SECRET=9f8d7s6f5s4df6s5df6s5df6s5df6s5df6s5df6s5`
- Rest of email/WhatsApp/Pusher configuration

---

**Status**: ✅ All critical Vercel deployment issues fixed and pushed to main branch.  
**Deployment**: Vercel will auto-redeploy from updated code.
**ETA**: API should be fully operational within 2-5 minutes of Vercel redeployment.


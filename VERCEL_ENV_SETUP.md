# 🚀 Vercel Environment Variables Setup

## ⚠️ تم git push على main بنجاح!

Vercel سيعمل redeploy تلقائياً في خلال 30 ثانية.

---

## ✅ الخطوات المتبقية - تحديث Vercel Dashboard

### ما الذي تم إرساله؟
- ✅ Updated `.env.online` for production
- ✅ Created `.env.local` for local development
- ✅ Fixed REDIS_URL issue
- ✅ Pushed to main branch on GitHub

### ما الذي تحتاج لعمله يدويا على Vercel?

1. **اذهب إلى Vercel Dashboard:**
   - https://vercel.com/dashboard
   - اختر project: `emails-est` أو `emails-est-web`

2. **اذهب إلى Settings → Environment Variables**

3. **تأكد من أن هذه متغيرات موجودة:**

```env
NODE_ENV=production
API_PORT=3001
FRONTEND_URL=https://emails-est-web.vercel.app/
DATABASE_URL=postgresql://neondb_owner:npg_bMFwTj1aKAh8@ep-misty-mode-am72hie8-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
REDIS_URL=                          # ⚠️ اتركها فارغة!
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CSRF_SECRET=9f8d7s6f5s4df6s5df6s5df6s5df6s5df6s5df6s5
AUTH_COOKIE_MODE=same-site
AUTH_COOKIE_SAMESITE=lax
AUTH_DEBUG_COOKIES=0
MAIL_HOST=smtp.zoho.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_REQUIRE_TLS=true
MAIL_USER=sphinx.publishing.company@zohomail.com
MAIL_PASS=MJU6MiKnKX2E
MAIL_FROM="SPHINX HR <sphinx.publishing.company@zohomail.com>"
SENDER_NAME="SPHINX HR"
SENDER_EMAIL=sphinx.publishing.company@zohomail.com
MAIL_POOL_MAX_CONNECTIONS=5
MAIL_POOL_MAX_MESSAGES=100
MAIL_TLS_REJECT_UNAUTHORIZED=true
EVOLUTION_API_BASE_URL=https://nonprinting-rampant-vida.ngrok-free.dev/
EVOLUTION_API_TIMEOUT_MS=10000
NEXT_PUBLIC_PUSHER_KEY=0fb7606e8df92ee810a0
NEXT_PUBLIC_PUSHER_CLUSTER=eu
PUSHER_APP_ID=2126553
PUSHER_KEY=0fb7606e8df92ee810a0
PUSHER_SECRET=6a3507827b2a92c46af8
PUSHER_CLUSTER=eu
NEXT_PUBLIC_API_URL=https://emails-est-api.vercel.app/api
NEXT_PUBLIC_DISABLE_SERVICE_WORKER=0
THROTTLE_TTL=60
THROTTLE_LIMIT=100
REPORTS_CACHE_TTL=60
```

4. **اضغط Save/Update** بعد كل متغير

5. **اضغط Redeploy** لو لم يعمل تلقائياً

---

## 📝 Local Development

عشان تختبر locally:

```bash
cd e:\emails-est

# تثبيت dependencies (أول مرة فقط)
npm install

# تشغيل الـ dev servers
npm run dev
```

**يفتح في:**
- Frontend: http://localhost:3000
- API: http://localhost:3001/api

**اختبر login:**
- وإذا شغّل بدون 404 = يعني تمام! ✅

---

## 🔍 Troubleshooting

### إذا ما زال 404 error على https://emails-est-web.vercel.app:

1. ✅ تأكد من أن NEXT_PUBLIC_API_URL = `https://emails-est-api.vercel.app/api`
2. ✅ تأكد من أن DATABASE_URL صحيح
3. ✅ تأكد من أن API deployment متحدث (Vercel should auto-redeploy)
4. ✅ شيّك Vercel logs في Dashboard

### Local Testing:

```bash
# اختبر API مباشرة
curl http://localhost:3001/api/auth/csrf

# اختبر login endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"password"}'
```

---

## ✨ Status

| Item | Status |
|------|--------|
| 🟢 Git Push | ✅ Complete (commit: 644a793) |
| 🟡 Vercel Redeploy | ⏳ Auto-deploying... |
| 🔴 Env Vars Manual Setup | ⏳ Pending (Go to Vercel dashboard) |
| 🟢 Local Config | ✅ Ready (.env.local created) |

**Next Step:** Go to Vercel Dashboard and confirm env variables ✅


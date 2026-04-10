# 🧪 اختبار اللوجن - دليل شامل

## ✅ الخطوات المحلية (Local Testing)

### 1. اختبار الـ CSRF Endpoint محليًا

```bash
# تأكد من أن API يعمل على localhost:3001
curl -s -c cookies.txt http://localhost:3001/api/auth/csrf | jq .
# يجب أن يرجع: { "csrfToken": "..." }
```

### 2. تسجيل الدخول محليًا

```bash
# أولاً: جلب CSRF Token
curl -s -c cookies.txt -X GET http://localhost:3001/api/auth/csrf

# ثم: محاولة اللوجن
curl -s -b cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"superadmin@sphinx.com","password":"Admin@123456"}'
```

### 3. اختبار واجهة الإنترنت محليًا

```bash
# اذهب إلى http://localhost:3000/en/login
# أدخل البيانات
# تحقق من:
# - console.log في browser dev tools
# - Network tab لـ /auth/csrf و /auth/login requests
```

---

## 🚀 الاختبار على Vercel (Production)

### 1. التحقق من Deployment Status

```bash
# تحقق من logs
git log --oneline -5

# يجب أن تجد commit جديد:
# fix(auth): CSRF token endpoint 404 error on production
```

### 2. انتظر Auto-Redeploy

Vercel سيعمل redeploy تلقائي في خلال:
- ⏱️ **30 ثانية** تقريباً بعد الـ push

⏳ **يمكنك متابعة الـ deployment على:**
- https://vercel.com/dashboard
- اختر project: `emails-est-web` أو `emails-est-api`
- اضغط على "Deployments" tab

### 3. اختبار الـ Endpoints على Vercel

```bash
# اختبر CSRF endpoint
curl -s https://emails-est-api.vercel.app/api/auth/csrf | jq .

# يجب أن يرجع:
# {
#   "csrfToken": "..."
# }
```

### 4. الخطوة النهائية: اختبر اللوجن الفعلي

**رابط الاختبار:**
```
https://emails-est-web.vercel.app/en/login
```

**البيانات:**
- **البريد:** `superadmin@sphinx.com`
- **كلمة المرور:** `Admin@123456`

**ما يجب أن تراه:**
- ✅ الصفحة تحمل بدون أخطاء
- ✅ حقول الـ input معبأة
- ✅ زر "Sign In" يعمل
- ✅ بعد الضغط → يعيد التوجيه إلى `/messaging/upload` (على الأسرع)
- ✅ لا يوجد "HTTP 404" error

---

## 🔍 كيفية اكتشاف المشاكل (Debugging)

### في Browser (Client Side)

1. **افتح Developer Tools** (F12 أو Ctrl+Shift+I)

2. **ذهب إلى Console tab:**
   - ابحث عن أي أخطاء حمراء 🔴
   - ابحث عن logs من الـ auth system

3. **ذهب إلى Network tab:**
   - صفّي بـ "XHR" (Ajax requests)
   - تحقق من:
     ```
     GET /api/auth/csrf → Status: 200 ✅
     POST /api/auth/login → Status: 200 ✅
     ```

4. **ذهب إلى Application tab:**
   - تحقق من "Cookies" → يجب أن ترى:
     - `access_token`
     - `refresh_token`
     - `csrf_secret`
     - `sphinx_session`

### على Vercel Dashboard

1. **اذهب إلى:** https://vercel.com/dashboard

2. **اختر المشروع:** `emails-est-api`

3. **انقر على "Deployments":**
   - ابحث عن الـ deployment الأخير
   - انقر عليه

4. **اذهب إلى "Logs":**
   ```
   Project → Deployment → Logs
   ```

5. **ابحث عن:**
   - `[auth] CSRF token generation failed` (errors 🔴)
   - `Emails EST API running on` (startup success ✅)

---

## 📊 Troubleshooting المشاكل الشائعة

### المشكلة: HTTP 404 على /auth/csrf

**الحل:**
```typescript
// تأكد من bootstrap.ts لديك:
const shouldSkipCsrf =
    ((method === 'POST' &&
    (requestPath === '/api/auth/refresh' || requestPath === '/api/auth/logout')) ||
    (method === 'GET' && requestPath === '/api/auth/csrf')); // ✅ هذا يجب أن يكون موجود
```

**إذا لم يظهر:**
- اعمل git pull
- تأكد من أن commit الأخير موجود
- اعمل npm install
- اعمل npm run dev

### المشكلة: "Invalid CSRF token"

**السبب الأساسي:**
- الـ cookies لم تحتفظ بـ CSRF secret
- الـ domain أو sameSite settings غير صحيحة

**الحل:**
```env
# تأكد من وجود في .env:
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_MODE=same-site
CSRF_SECRET=dev-csrf-secret-1234567890
```

### المشكلة: Redirect loop

**السبب:**
- الـ JWT tokens expired
- الـ refresh logic مكسور

**الحل:**
1. افتح browser dev tools
2. اذهب إلى Application → Cookies
3. احذف كل الـ sphinx cookies:
   ```
   access_token
   refresh_token
   sphinx_session
   csrf_secret
   ```
4. اعد تحديث الصفحة وحاول اللوجن مرة أخرى

---

## ✨ Best Practices

✅ **دائماً افحص:**
- Network requests في dev tools
- Console errors
- Vercel deployment logs

✅ **عند التعديل:**
- جرب محلياً أولاً
- ثم اعمل git push
- ثم انتظر Vercel redeploy
- ثم اختبر على الإنتاج

✅ **عند المشاكل:**
- تحقق من Browser Console
- افحص Network tab لـ 404/500 errors
- اقرأ Vercel logs
- تأكد من Environment Variables

---

## 📞 Quick Reference

| المرحلة | الـ URL | الحالة المتوقعة |
|--------|--------|-----------------|
| CSRF Request | https://emails-est-api.vercel.app/api/auth/csrf | ✅ 200 + csrfToken |
| Login | https://emails-est-api.vercel.app/api/auth/login | ✅ 200 + user data |
| Cookies | Browser Storage | ✅ access_token + refresh_token |
| Redirect | https://emails-est-web.vercel.app/en/messaging/upload | ✅ 200 (dashboard loads) |

---

## 🎯 الـ Expected Flow

```
1. User opens https://emails-est-web.vercel.app/en/login
                 ↓
2. Frontend loads → calls /api/auth/csrf
                 ↓
3. Backend returns csrfToken
                 ↓
4. Frontend stores token in memory
                 ↓
5. User enters credentials and clicks Sign In
                 ↓
6. Frontend sends POST /api/auth/login + X-CSRF-Token header
                 ↓
7. Backend validates CSRF token
                 ↓
8. Backend returns user data + access_token
                 ↓
9. Frontend sets cookies and redirects to dashboard
                 ↓
10. ✅ Success! User logged in
```

---

## ⏱️ الـ Timeline المتوقع

- **الآن:** الـ commit تم رفع إلى GitHub main branch
- **30 ثانية:** Vercel يبدأ الـ deployment
- **1-2 دقيقة:** API deployment يكمل
- **1-2 دقيقة:** Web deployment يكمل
- **2-3 دقائق:** يمكنك اختبار على الموقع الأونلاين

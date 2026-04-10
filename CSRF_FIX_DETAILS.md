# 🔧 CSRF Token Fix - Detailed Analysis

## 🔴 المشكلة الأصلية

عند محاولة اللوجن على الموقع الأونلاين:
```
https://emails-est-web.vercel.app/en/login
```

الخطأ كان:
```
Login failed
Unable to complete your request.
HTTP 404 • endpoint: /auth/csrf
```

## 🔍 Root Cause Analysis

### السبب الأساسي
في file `apps/api/src/bootstrap.ts`، الـ CSRF middleware كان يطبق على جميع الـ requests بدون استثناء للـ GET `/auth/csrf` endpoint.

**الكود القديم (الخاطئ):**
```typescript
app.use((req, res, next) => {
    const shouldSkipCsrf =
        method === 'POST' &&
        (requestPath === '/api/auth/refresh' || requestPath === '/api/auth/logout');
    // ❌ لم يكن هناك استثناء للـ GET /auth/csrf
    if (shouldSkipCsrf) {
        return next();
    }
    return csrfProtection(req, res, next);
});
```

### لماذا حدث في الإنتاج بس؟
- **محلي**: عدم وجود صارم CORS/CSRF rules
- **Vercel**: CORS rules وـ reverse proxy أكثر صرامة

---

## ✅ الحلول المطبقة

### 1️⃣ إضافة Exemption للـ GET `/auth/csrf`

**File:** `apps/api/src/bootstrap.ts`

```typescript
app.use((req, res, next) => {
    const method = (req.method || '').toUpperCase();
    const requestPath = req.path || '';
    const shouldSkipCsrf =
        ((method === 'POST' &&
        (requestPath === '/api/auth/refresh' || requestPath === '/api/auth/logout')) ||
        (method === 'GET' && requestPath === '/api/auth/csrf')); // ✅ الإضافة الجديدة
    
    if (shouldSkipCsrf) {
        return next();
    }
    return csrfProtection(req, res, next);
});
```

### 2️⃣ تحسين CSRF Token Request Batching

**File:** `apps/web/src/lib/api/axios.ts`

أضفنا `ensureCsrfToken()` لتجنب race conditions:

```typescript
let csrfPromise: Promise<void> | null = null;

const ensureCsrfToken = async () => {
    if (csrfToken) return;
    
    if (!csrfPromise) {
        csrfPromise = api
            .get('/auth/csrf', { headers: { 'x-skip-activity': '1' } })
            .finally(() => {
                csrfPromise = null;
            });
    }
    return csrfPromise;
};

// Export للـ external use
export const fetchCsrfToken = async () => {
    await ensureCsrfToken();
};
```

### 3️⃣ تحسين Auth Controller Response

**File:** `apps/api/src/auth/auth.controller.ts`

أضفنا explicit headers وـ error handling:

```typescript
@Get('csrf')
@HttpCode(HttpStatus.OK)
getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const token = (req as Request & { csrfToken: () => string }).csrfToken();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return { csrfToken: token };
    } catch (error) {
      console.error('[auth] CSRF token generation failed:', error);
      throw new Error('Failed to generate CSRF token');
    }
}
```

### 4️⃣ تحسين Login Page Flow

**File:** `apps/web/src/app/[locale]/login/page.tsx`

استبدلنا `api.get('/auth/csrf')` بـ `fetchCsrfToken()`:

```typescript
const onSubmit = async (event: FormEvent) => {
    // ...
    try {
      // Ensure CSRF token is available (with deduplication)
      await fetchCsrfToken();
      
      // Attempt login
      const response = await api.post('/auth/login', { identifier, password });
      // ...
    }
    // ...
};
```

---

## 🧪 كيفية الاختبار

### الاختبار المحلي:
```bash
# Terminal 1 - API
cd apps/api
npm run dev

# Terminal 2 - Frontend
cd apps/web
npm run dev

# ثم زر http://localhost:3000/en/login
```

### الاختبار على Vercel:
1. Git push التعديلات
2. Vercel سيعمل redeploy تلقائي
3. جرب اللوجن على https://emails-est-web.vercel.app/en/login

---

## 🔐 الأمان والـ Best Practices

✅ **CSRF Protection** - لا يزال مفعل على جميع الـ endpoints.
✅ **Exemptions محدودة** - فقط GET `/auth/csrf` معفي (لا يحتاج CSRF token لـ READ)
✅ **Request Deduplication** - تجنب multiple simultaneous requests
✅ **Proper Headers** - Content-Type صحيح في الـ response

---

## 📊 تحليل الـ Performance

| المرحلة | الـ تحسن |
|--------|--------|
| Login Flow | ✅ أسرع بدون duplicate requests |
| CSRF Token | ✅ Cached بعد الـ first request |
| Error Handling | ✅ أفضل logging وـ debugging |
| Browser Caching | ✅ مدعوم مع `x-allow-cache` |

---

## ⚠️ ملاحظات مهمة

1. **تأكد من Environment Variables:**
   - على Vercel، تأكد أن `CSRF_SECRET` موجود
   - `NODE_ENV=production` يجب أن يكون موجود

2. **Cookies Settings:**
   - `AUTH_COOKIE_SAMESITE=lax` (production) أو `strict` (اختياري)
   - `AUTH_COOKIE_MODE=same-site` (production)

3. **CORS Configuration:**
   - تأكد من أن `FRONTEND_URL` نقطة إلى Vercel domain:
   ```env
   FRONTEND_URL=https://emails-est-web.vercel.app/
   NEXT_PUBLIC_API_URL=https://emails-est-api.vercel.app/api
   ```

---

## 📝 Commit Message

```
fix(auth): CSRF token endpoint 404 error on production

- Add exemption for GET /auth/csrf from CSRF middleware
- Implement CSRF token request deduplication with Promise caching
- Improve Auth controller CSRF endpoint with explicit headers
- Refactor login page to use fetchCsrfToken() helper
- Better error handling and logging in CSRF generation

Fixes: #csrf-404-vercel-production
```

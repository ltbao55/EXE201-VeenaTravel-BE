# 🔧 Hướng Dẫn Khắc Phục Lỗi CORS

## 📋 Tóm Tắt Vấn Đề

Frontend đang gặp lỗi CORS khi gọi API từ `http://localhost:5173` đến backend trên Vercel.

## ✅ Đã Sửa

### 1. CORS Configuration
- ✅ Luôn cho phép localhost origins (cho development/testing)
- ✅ Đọc production URLs từ environment variables
- ✅ Cải thiện logging để debug dễ hơn
- ✅ Xử lý preflight requests (OPTIONS) đúng cách

### 2. Các Thay Đổi Chính

**File: `src/server.js`**

1. **Luôn cho phép localhost:**
   - `http://localhost:5173` (Vite dev server)
   - `http://localhost:3000` (React dev server)
   - Các localhost ports khác

2. **Production URLs từ env:**
   - Đọc từ `FRONTEND_URL` hoặc `FRONTEND_URLS`
   - Hỗ trợ nhiều URLs (comma-separated)

3. **Logging cải thiện:**
   - Log tất cả CORS requests (không chỉ development)
   - Log khi origin bị reject
   - Dễ debug hơn

---

## 🚀 Cách Setup Trên Vercel

### Bước 1: Set Environment Variables

1. Vào **Vercel Dashboard** → Chọn project → **Settings** → **Environment Variables**

2. Thêm các biến sau:

   **Cho Production:**
   ```
   Key: NODE_ENV
   Value: production
   Environment: Production
   ```

   ```
   Key: FRONTEND_URL
   Value: https://your-frontend-domain.vercel.app
   Environment: Production
   ```

   **Nếu có nhiều frontend URLs:**
   ```
   Key: FRONTEND_URLS
   Value: https://app1.vercel.app,https://app2.vercel.app,https://yourdomain.com
   Environment: Production
   ```

3. **Quan trọng:** 
   - Không cần thêm `http://localhost:5173` vào env var
   - Code đã tự động cho phép localhost origins

### Bước 2: Redeploy

- **Tự động:** Push code mới lên GitHub, Vercel sẽ tự deploy
- **Manual:** Vào Vercel Dashboard → Deployments → Redeploy

---

## 🔍 Kiểm Tra CORS

### 1. Test với curl

```bash
# Test preflight request
curl -X OPTIONS https://exe-201-veena-travel-be.vercel.app/api/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  -v

# Kiểm tra response headers:
# ✅ Access-Control-Allow-Origin: http://localhost:5173
# ✅ Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
# ✅ Access-Control-Allow-Headers: Content-Type, Authorization, ...
# ✅ Access-Control-Allow-Credentials: true
```

### 2. Test với Browser DevTools

1. Mở Chrome DevTools (F12)
2. Tab **Network**
3. Thực hiện login trên frontend
4. Xem request `OPTIONS /api/auth/login` (preflight)
5. Kiểm tra **Response Headers** có:
   - `Access-Control-Allow-Origin: http://localhost:5173`
   - `Access-Control-Allow-Methods: ...`
   - `Access-Control-Allow-Headers: ...`

### 3. Test Health Check

```bash
curl https://exe-201-veena-travel-be.vercel.app/api/health \
  -H "Origin: http://localhost:5173" \
  -v
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. URL Prefix `/api`

**Vấn đề phát hiện từ error report:**
- Frontend config: `BASE_URL: "https://exe-201-veena-travel-be.vercel.app/api"`
- Nhưng actual requests: `https://exe-201-veena-travel-be.vercel.app/auth/login` ❌

**Backend routes:**
- Tất cả routes có prefix `/api`:
  - `/api/auth/login`
  - `/api/auth/profile`
  - `/api/health`
  - etc.

**Giải pháp cho Frontend:**
- Đảm bảo frontend gọi đúng URL với prefix `/api`
- Ví dụ: `POST /api/auth/login` (không phải `/auth/login`)

### 2. Environment Variables

**Development (local):**
- Không cần set env vars
- Localhost origins được tự động cho phép

**Production (Vercel):**
- **Bắt buộc:** Set `NODE_ENV=production`
- **Khuyến nghị:** Set `FRONTEND_URL` với production frontend URL
- Localhost vẫn được cho phép (cho testing)

### 3. CORS Headers

Backend sẽ tự động trả về:
- `Access-Control-Allow-Origin`: Origin của request (nếu được phép)
- `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE, OPTIONS, PATCH
- `Access-Control-Allow-Headers`: Content-Type, Authorization, X-Requested-With, Accept, Origin
- `Access-Control-Allow-Credentials`: true
- `Access-Control-Max-Age`: 86400 (24 hours)

---

## 🐛 Debug CORS Issues

### 1. Kiểm tra Logs trên Vercel

Vào **Vercel Dashboard** → **Deployments** → Chọn deployment → **Logs**

Tìm các dòng:
```
✅ CORS: Allowed origins: [...]
🔍 [CORS] OPTIONS /api/auth/login | Origin: http://localhost:5173
✅ [CORS] Preflight allowed for origin: http://localhost:5173
```

Nếu thấy:
```
❌ [CORS] Preflight rejected. Origin: ... | Allowed: [...]
⚠️  [CORS] Origin ... not in allowed list
```
→ Origin không được phép

### 2. Kiểm tra Environment Variables

```bash
# Trên Vercel, check env vars có được set đúng không
# Vào Settings → Environment Variables
```

### 3. Test với Postman

```http
OPTIONS https://exe-201-veena-travel-be.vercel.app/api/auth/login
Headers:
  Origin: http://localhost:5173
  Access-Control-Request-Method: POST
  Access-Control-Request-Headers: content-type,authorization
```

---

## 📝 Checklist

Sau khi deploy, kiểm tra:

- [ ] Environment variable `NODE_ENV=production` đã được set trên Vercel
- [ ] Environment variable `FRONTEND_URL` đã được set (nếu có production frontend)
- [ ] Code đã được push và deploy lên Vercel
- [ ] Test preflight request với curl → có CORS headers
- [ ] Test từ frontend localhost → không còn lỗi CORS
- [ ] Kiểm tra logs trên Vercel → thấy CORS logs
- [ ] Frontend đang gọi đúng URL với prefix `/api`

---

## 🔗 Links Hữu Ích

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Backend URL:** https://exe-201-veena-travel-be.vercel.app
- **Health Check:** https://exe-201-veena-travel-be.vercel.app/api/health
- **API Docs:** https://exe-201-veena-travel-be.vercel.app/api/docs

---

## 📞 Support

Nếu vẫn gặp lỗi sau khi làm theo hướng dẫn:

1. Kiểm tra logs trên Vercel
2. Test với curl để verify CORS headers
3. Kiểm tra frontend có gọi đúng URL với `/api` prefix không
4. Verify environment variables trên Vercel

---

**Last Updated:** $(date)
**Version:** 1.0.0



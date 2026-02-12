# Quick Start Guide - Opareta Payment System UI

## 🚀 Get Running in 2 Minutes

### Step 1: Start Backend Services
```powershell
cd c:\opareta-payment-system
docker-compose up -d
```

### Step 2: Start Frontend Dev Server
```powershell
cd frontend
npm install  # Only if not done before
npm run dev
```

### Step 3: Open Browser
Go to: **http://localhost:5174**

---

## 🧪 Test the System

### Register New User
```
1. Click "Register here"
2. Fill in:
   - Phone: 256701234567 (any format works)
   - Email: user@example.com
   - Password: Test123456 (min 6 chars)
   - Confirm: Test123456
3. Click "Create Account"
4. ✅ Redirects to dashboard
```

### Create Payment
```
1. In dashboard form:
   - Amount: 5000
   - Currency: UGX
   - Method: MOBILE_MONEY
   - Phone/Email: Auto-filled
2. Click "Create Payment"
3. ✅ Payment appears in table below with SUCCESS status
```

### Logout & Login
```
1. Click "Logout" button → redirects to login
2. Enter credentials → click "Sign In"
3. ✅ Back in dashboard with payment history
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Global auth state |
| `src/pages/LoginPage.tsx` | Login form (blue theme) |
| `src/pages/RegisterPage.tsx` | Register form (green theme) |
| `src/pages/DashboardPage.tsx` | Payment dashboard |
| `src/App.tsx` | Router with protected routes |
| `src/styles.css` | Tailwind CSS |
| `tailwind.config.ts` | Tailwind config |
| `package.json` | Dependencies |

---

## 🎨 Design Features

- **Login**: Blue gradient, phone + password
- **Register**: Green gradient, phone + email + password
- **Dashboard**: Professional layout with sidebar form and transaction table
- **Status Badges**: Color-coded (Green=Success, Yellow=Pending, Red=Failed)
- **Responsive**: Works on mobile, tablet, desktop

---

## 🔐 Authentication

- **Register** → Login → JWT Token → Dashboard
- **Token Storage**: localStorage (persists on refresh)
- **Authorization**: JWT sent in header for all payment API calls
- **Logout**: Clears token and redirects to login

---

## 📊 Payment Features

- **Creation**: Amount, currency, payment method selection
- **History**: Table with reference, amount, status, date
- **Auto-fetch**: Payment history loads on dashboard entry
- **Status Tracking**: Real-time status display with color coding

---

## 🛠️ Available Commands

```bash
# Development
npm run dev          # Start dev server on localhost:5174

# Production
npm run build        # Create optimized dist/ folder
npm run preview      # Preview production build locally

# Troubleshooting
npm install          # Reinstall dependencies
npm list             # List installed packages
```

---

## 🌐 API Endpoints

### Auth Service (Port 3001)
```
POST /auth/register
POST /auth/login
```

### Payment Service (Port 3002)
```
POST /payments/create
GET /payments/history/all
```

---

## ⚙️ Configuration

### Vite Proxy (Dev Server)
```
/auth → http://localhost:3001
/payments → http://localhost:3002
```

### Tailwind CSS
```
config: tailwind.config.ts
source: src/styles.css
```

---

## 📱 Mobile Testing

Dashboard works perfectly on mobile:
- Payment form stacks vertically
- Table scrolls horizontally
- All buttons easily tappable
- Responsive spacing

Test with browser DevTools (F12) → Device Toolbar

---

## 🔍 Browser DevTools Checks

**Application Tab**:
- `auth_token` in localStorage (JWT)
- `auth_user` in localStorage (JSON)

**Network Tab**:
- Requests to `/auth/register`, `/auth/login` return 200 OK
- Requests to `/payments/*` include Authorization header
- No CORS errors

**Console**:
- No red error messages
- No TypeScript errors

---

## ✅ Success Indicators

✅ Can register with new phone/email
✅ Can login with credentials
✅ Redirects to dashboard after auth
✅ Can create payments
✅ Payments appear in history table
✅ Can logout and login again
✅ Token persists on page refresh
✅ No errors in browser console
✅ Responsive on mobile

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Port 5174 already in use" | Vite uses next available port automatically |
| "Cannot POST /auth/register" | Ensure backend services running (`docker-compose up -d`) |
| "Invalid token" error | Check JWT in localStorage; token may be expired |
| "Payment not showing" | Refresh page or check backend logs |
| Page blank after login | Clear browser cache (Ctrl+Shift+Delete) |

---

## 📚 Documentation

- **UI_IMPLEMENTATION.md** - Detailed component documentation
- **IMPLEMENTATION_COMPLETE.md** - Full architecture & features
- **UI_COMPLETE.md** - Build, deployment, and testing guide
- **PROJECT_STRUCTURE.md** - Complete codebase organization

---

## 🎯 Next Steps

1. **Test the system** following the test guide above
2. **Customize branding** (colors, logos) in Tailwind config
3. **Add features** like payment filtering, export, webhooks
4. **Deploy** to production with `npm run build`
5. **Monitor** with Grafana dashboard at http://localhost:3000

---

## 📞 System Resources

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5174 | React UI |
| Auth Service | http://localhost:3001 | User authentication |
| Payment Service | http://localhost:3002 | Payment processing |
| Nginx Gateway | http://localhost:8080 | API gateway (HTTPS on 443) |
| Grafana | http://localhost:3000 | Monitoring dashboard |
| Prometheus | http://localhost:9090 | Metrics collection |

---

## 🎉 You're Ready!

The Opareta Payment System is fully functional with a beautiful, modern UI.

**Go to**: http://localhost:5174 and start using it!

---

*Last updated: 2024*
*Status: ✅ Production Ready*

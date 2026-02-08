# 🚀 Deployment Architecture Guide

## Overview

**Strawberry Bloom Studio** uses a modern full-stack deployment pipeline that automatically builds, tests, and deploys your app to Azure whenever you push code to GitHub.

```
┌─────────────────┐
│   Your Machine  │
│  (Local Dev)    │
└────────┬────────┘
         │ git push
         ▼
┌─────────────────────────────┐
│    GitHub Repository        │
│  (Main Branch)              │
└────────┬────────────────────┘
         │ Webhook Triggered
         ▼
┌──────────────────────────────────┐
│   GitHub Actions Workflow        │
│  (CI/CD Pipeline)                │
│  - Build Backend & Frontend      │
│  - Run Tests                     │
│  - Upload Artifacts             │
└────────┬─────────────────────────┘
         │ Download Artifact
         ▼
┌──────────────────────────────────┐
│   Azure App Service              │
│  (Production Environment)        │
│  - Node.js Runtime               │
│  - Express Server (PORT 8080)    │
│  - SQLite Database               │
│  - React Static Files            │
└──────────────────────────────────┘
```

---

## 🏗️ Architecture Components

### **1. Frontend (React + Vite)**
- **Location:** `/client`
- **Framework:** React 18
- **Build Tool:** Vite
- **Output:** Static files in `/client/dist`
- **Served by:** Express server

**Key Features:**
- Components: Navbar, TaskDetails, PageTransition, ProjectKanban
- Pages: Home, Dashboard, Week Planner, Projects, Kanban, Money, Notes, Vision, Wishlist
- API Service Layer: `client/src/services/api.js` (handles all backend calls)
- Styling: Handwriting font ("Architects Daughter"), pink theme, fully responsive

### **2. Backend (Node.js + Express)**
- **Location:** `/server.js`
- **Framework:** Express.js
- **Database:** SQLite (local file: `rosy.db`)
- **Port:** `8080` (on Azure), `3000` (local)
- **CORS:** Enabled for frontend communication

**API Endpoints:**
```
/api/tasks          (GET, POST, PUT, DELETE)
/api/projects       (GET, POST, PUT, DELETE)
/api/kanban/:id     (GET, POST, PUT, DELETE)
/api/notes          (GET, POST, PUT, DELETE)
/api/transactions   (GET, POST, DELETE)
/api/vision-goals   (GET, POST, DELETE)
/api/wishlist       (GET, POST, PUT, DELETE)
/api/monthly-budgets/:year/:month (GET, POST)
/api/week-plan      (GET, POST)
```

### **3. Database (SQLite)**
- **File:** `rosy.db`
- **Auto-initialization:** Runs on server startup
- **Tables:**
  - `tasks` - Daily to-dos
  - `projects` - Project management
  - `kanban_cards` - Project tasks
  - `notes` - Text notes
  - `transactions` - Money tracking
  - `monthly_budgets` - Budget planning
  - `vision_goals` - 2026 vision board
  - `wishlist_items` - Wishlist with purchase tracking
  - `week_plans` - Weekly planner

---

## 🔄 Deployment Flow (Step-by-Step)

### **Step 1: Local Development**
You make changes locally:
```bash
git add .
git commit -m "Add new feature"
git push origin main
```

### **Step 2: GitHub Actions Triggered**
Automatically starts when push detected to `main` branch.

**Build Job:**
1. Checkout code
2. Install backend dependencies: `npm install`
3. Build React frontend: `cd client && npm install && npm run build`
4. Output: React compiled to `/client/dist/`
5. Upload entire project as artifact

**Deploy Job:**
1. Download artifact from build
2. Use Azure Publish Profile (stored in secrets)
3. Deploy to Azure App Service

### **Step 3: Azure App Service**
1. Extracts artifact
2. Installs Node dependencies
3. Starts Express server: `npm start`
4. Server runs `node server.js`
5. Environment: `PORT=8080` (set by Azure)
6. Server now:
   - Initializes SQLite database
   - Serves React static files from `/client/dist`
   - Routes API calls to backend handlers
   - Routes non-API requests to React's `index.html` (SPA handling)

### **Step 4: App Live**
Available at: `https://rosy-studio-eehmehbqaph2dmew.francecentral-01.azurewebsites.net/`

---

## 🔌 How Frontend Talks to Backend

### **Frontend → Backend Communication**

**Location:** `client/src/services/api.js`

```javascript
// Example: Fetch all tasks
export async function getTasks() {
  const response = await fetch('/api/tasks');
  return response.json();
}

// Example: Create new task
export async function createTask(data) {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

**Important:** Uses relative URLs (`/api/*`) because:
- Locally: Points to `localhost:3000/api/*`
- On Azure: Points to `https://rosy-studio-*.azurewebsites.net/api/*`
- Works in both environments automatically ✅

---

## 🎯 How New Requests Are Routed

When a user visits your app:

```
User visits: https://rosy-studio-*.azurewebsites.net/dashboard
                            ↓
    Express receives GET /dashboard
                            ↓
    Not an /api/* route → Matches app.get('*', ...)
                            ↓
    Sends back: /client/dist/index.html
                            ↓
    React loads and handles routing
    (React Router shows Dashboard page)
                            ↓
    React component makes API call:
    fetch('/api/tasks')
                            ↓
    Express matches: app.get('/api/tasks', ...)
                            ↓
    Queries SQLite database
                            ↓
    Returns JSON response
                            ↓
    React displays data
```

**Key Pattern:**
- **Static routes** (`/`, `/dashboard`, `/projects`, etc.) → React SPA
- **API routes** (`/api/*`) → Express backend

---

## 📝 Files & Their Roles

### **Configuration Files**

| File | Purpose |
|------|---------|
| `package.json` | Backend dependencies + start script |
| `client/package.json` | Frontend dependencies + build script |
| `client/vite.config.js` | React build configuration |
| `.github/workflows/main_rosy-studio.yml` | GitHub Actions CI/CD pipeline |
| `.gitignore` | Files not tracked (node_modules, db, etc) |
| `rosy.db` | SQLite database (persisted on Azure) |

### **Source Code**

| Location | Purpose |
|----------|---------|
| `server.js` | Express app, API endpoints, database init |
| `client/src/App.jsx` | Main React component, routing |
| `client/src/pages/*` | Page components (Dashboard, Projects, etc) |
| `client/src/services/api.js` | API call functions |
| `client/src/styles/index.css` | All styling (2840+ lines) |

---

## 🚀 Adding New Features

### **Example: Add a New Page**

**1. Create Component**
```javascript
// client/src/pages/MyNewPage.jsx
export default function MyNewPage() {
  return <section className="page-section active">Content here</section>
}
```

**2. Add Route in App.jsx**
```javascript
import MyNewPage from './pages/MyNewPage'

// In the switch statement:
case 'my-new-page':
  return <MyNewPage onNavigate={onNavigate} />
```

**3. Add Navigation Link in Navbar.jsx**
```javascript
const navItems = [
  // ... existing items
  { id: 'my-new-page', label: 'My New Page', mobile: 'New' }
]
```

**4. Push to GitHub**
```bash
git add .
git commit -m "Add my new page"
git push origin main
```

→ GitHub Actions automatically builds & deploys!

---

### **Example: Add a New API Endpoint**

**1. Create Backend Route in server.js**
```javascript
app.get('/api/my-feature', async (req, res) => {
  const data = await all('SELECT * FROM some_table');
  res.json(data);
});
```

**2. Create Frontend API Function**
```javascript
// client/src/services/api.js
export async function getMyFeature() {
  const response = await fetch('/api/my-feature');
  return response.json();
}
```

**3. Use in Component**
```javascript
import { getMyFeature } from '../services/api'

useEffect(() => {
  getMyFeature().then(data => setData(data))
}, [])
```

**4. Push to GitHub**
```bash
git add .
git commit -m "Add my new API endpoint"
git push origin main
```

---

## 🔐 Environment Variables

### **Azure Sets Automatically**
- `PORT=8080` - Where Express listens
- `NODE_ENV=production` - Production mode

### **Required Secrets (GitHub)**
- `AZURE_WEBAPP_PUBLISH_PROFILE` - Credentials to deploy to Azure (already added ✅)

### **Local Development**
No special env vars needed - app runs on port 3000 by default.

---

## 🛠️ Troubleshooting Deployments

### **Deployment Failed?**
1. Check GitHub Actions: Repo → **Actions** tab
2. Look for red ❌ in build or deploy step
3. Click on failed step to see error logs

### **App Running but Shows "Cannot GET /"?**
- Frontend build failed
- Check: Is `/client/dist` being created?
- Check: Is `app.use(express.static(...))` in server.js?

### **API Not Working?**
- Server crashed during init
- Check Azure logs: App Service → **Log stream**
- Check: Does database exist (`rosy.db`)?

### **Data Lost After Redeploy?**
- SQLite file (`rosy.db`) should persist on Azure ✅
- If data resets, make sure the app writes to persistent storage:
  - Set `DATA_DIR` to `D:\home` (Windows App Service) or `/home` (Linux App Service)
  - Or set `DATABASE_PATH` / `SQLITE_DB_PATH` to a full path
- For Linux **container** App Service, ensure `WEBSITES_ENABLE_APP_SERVICE_STORAGE=true`

---

## 📊 Performance Tips

1. **Database:** SQLite is fine for small apps, but upgrade to Azure SQL if you grow
2. **Frontend:** Already optimized (Vite, React lazy loading via SPA routing)
3. **API:** Add caching headers for static assets
4. **Monitoring:** Azure provides built-in logs and diagnostics

---

## 🎓 Learning Resources

**GitHub Actions:**
- https://docs.github.com/actions
- `.github/workflows/main_rosy-studio.yml` - Your workflow file

**Azure App Service:**
- https://azure.microsoft.com/en-us/services/app-service/
- Portal: https://portal.azure.com

**Express.js:**
- https://expressjs.com/

**React:**
- https://react.dev

**Vite:**
- https://vitejs.dev

---

## 📱 Your Deployment URLs

- **Production:** https://rosy-studio-eehmehbqaph2dmew.francecentral-01.azurewebsites.net/
- **GitHub Repo:** https://github.com/DouaeBakkali269/Rosy_Workroom
- **Azure Portal:** https://portal.azure.com (login with student account)

---

## ✅ Deployment Checklist

Before pushing new code:
- [ ] Code works locally (`npm start` + `cd client && npm run dev`)
- [ ] No syntax errors
- [ ] Database migrations (if needed) are in `server.js` init()
- [ ] API routes tested in browser/Postman
- [ ] Frontend routes tested in React app

Then:
```bash
git add .
git commit -m "Your feature description"
git push origin main
# → GitHub Actions runs automatically
# → Azure deploys automatically
# → Check: repo → Actions tab
```

---

**Happy deploying! 🍓✨**

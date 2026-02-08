# Strawberry Bloom Studio

A cute and girly productivity app built with React and Node.js, deployed on Azure with automated CI/CD.

**🌐 Live App:** https://rosy-studio-eehmehbqaph2dmew.francecentral-01.azurewebsites.net/

**📚 Want to understand deployment?** → Read [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md)

## Project Structure

```
Rosy_Workroom/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── styles/         # CSS files
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   ├── public/             # Static assets
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server.js               # Backend API server
├── package.json            # Backend dependencies
└── rosy.db                 # SQLite database (auto-created)
```

## Installation

### Backend Setup

1. Install backend dependencies:
```bash
npm install
```

2. Start the backend server:
```bash
npm start
```

The API will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to client folder:
```bash
cd client
```

2. Install frontend dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will run on `http://localhost:5173`

## Features

- **Home Page**: Welcome page with cute design
- **Dashboard**: Task management with CRUD operations
- **Projects**: Create and manage projects
- **Money Tracker**: Track income and expenses
- **Kanban Board**: Visual task organization
- **Notes**: Quick note-taking
- **Wishlist**: Track items you want
- **Vision Board**: Set and visualize goals

## Tech Stack

- **Frontend**: React 18, Vite, "Architects Daughter" font
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Styling**: Custom CSS with pink theme, glassmorphism, responsive design
- **Deployment**: GitHub Actions → Azure App Service
- **Version Control**: Git + GitHub

## Deployment

This app uses automated CI/CD:
1. Push code to GitHub main branch
2. GitHub Actions automatically builds frontend & backend
3. Azure deploys to production
4. **Zero manual steps!**

For detailed deployment architecture, see [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md)

## Data Persistence (Azure)

The app stores SQLite data and uploads in a persistent data directory. If data resets after deploys, set an explicit data path in Azure App Service:

- `DATA_DIR`: `D:\home` (Windows App Service) or `/home` (Linux App Service)
- Optional override: `DATABASE_PATH` or `SQLITE_DB_PATH` (full file path to `rosy.db`)

If you use a Linux **container** App Service, also enable persistent storage:

- App Service Settings → **Configuration** → **Application settings** → `WEBSITES_ENABLE_APP_SERVICE_STORAGE=true`

## Adding Features

**Quick start for new features:**

```bash
# 1. Create new component or API endpoint
# 2. Test locally
git add .
git commit -m "Your feature"
git push origin main
# → GitHub Actions builds & deploys automatically!
```

See [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md) for step-by-step examples.

## Tech Stack Details
- **Backend**: Node.js, Express
- **Database**: SQLite3
- **Styling**: Custom CSS with glassmorphism effects

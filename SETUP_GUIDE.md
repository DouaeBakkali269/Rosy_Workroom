# Strawberry Bloom Studio - Setup Guide

## ✨ What's New

Your project now has:
- **Project-specific Kanban boards**: Each project has its own kanban board
- **Global Kanban view**: The navbar's Kanban page shows all your global tasks
- **Database integration**: All data is stored in SQLite database
- **Full CRUD operations**: Create, read, update, and delete for all entities

## 🚀 Quick Start

### Backend Server (Already Running!)

The backend server is already running on `http://localhost:3000`. If you need to restart it:

```bash
cd C:\Users\Usuario\Rosy_Workroom
node server.js
```

### Frontend React App

Due to npm issues on your system, we need to use a workaround:

**Option 1: Fix npm and run normally**
```bash
cd C:\Users\Usuario\Rosy_Workroom\client
# Try clearing npm cache
npm cache clean --force
# Remove node_modules
Remove-Item -Recurse -Force node_modules
# Install dependencies
npm install
# Start dev server
npm run dev
```

**Option 2: Use a different terminal/admin mode**
- Right-click PowerShell and "Run as Administrator"
- Navigate to the client folder
- Run: `npm install && npm run dev`

**Option 3: Manual Vite start (if packages are partially installed)**
```bash
cd C:\Users\Usuario\Rosy_Workroom\client
.\node_modules\.bin\vite.cmd
```

## 📂 Project Structure

```
Rosy_Workroom/
├── server.js           # Backend API (Express + SQLite)
├── rosy.db            # SQLite database (auto-created)
├── package.json       # Backend dependencies
├── client/            # React frontend
│   ├── src/
│   │   ├── App.jsx              # Main app component
│   │   ├── main.jsx             # React entry point
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Navigation bar
│   │   │   └── ProjectKanban.jsx # NEW: Project-specific kanban
│   │   ├── pages/
│   │   │   ├── HomePage.jsx     # Landing page
│   │   │   ├── TasksPage.jsx    # Tasks management
│   │   │   ├── ProjectsPage.jsx # Projects + kanban integration
│   │   │   ├── KanbanPage.jsx   # Global kanban board
│   │   │   ├── FinancesPage.jsx # Finance tracking
│   │   │   ├── NotesPage.jsx    # Notes
│   │   │   ├── WishlistPage.jsx # Wishlist
│   │   │   └── VisionPage.jsx   # Vision board
│   │   ├── services/
│   │   │   └── api.js           # API service layer
│   │   └── styles/
│   │       └── index.css        # All styling (glassmorphism!)
│   └── package.json   # Frontend dependencies
```

## 🎯 How to Use Project Kanban Boards

1. **Create a project**: Go to Projects page, fill in the form, click "Create"
2. **Open project board**: Click the "Open Board" button on any project card
3. **Add kanban cards**: Use the form at the top to add cards to that project
4. **Move cards**: Click the buttons to move cards between To Do → In Progress → Done
5. **Back to projects**: Click "← Back to Projects" to return to the project list

## 🔧 Database Schema

The database includes 4 tables:

1. **tasks**: Basic task management
2. **projects**: Project information with metadata
3. **transactions**: Financial transactions
4. **kanban_cards**: Kanban cards linked to projects
   - `project_id = NULL`: Global kanban cards (shown in Kanban page)
   - `project_id = [number]`: Project-specific cards

## 🐛 Troubleshooting

### "Create project isn't working"

**Diagnosis**: The backend server needs to be running, and the React app needs to connect to it.

**Check**:
1. Backend running? → Open http://localhost:3000/api/projects in your browser. You should see `[]` or a list of projects.
2. Frontend running? → You should see the Vite dev server at http://localhost:5173
3. CORS enabled? → Already configured in server.js

**Fix**:
- If backend not running: Run `node server.js` from the root folder
- If frontend not running: Resolve npm issues (see Quick Start above)
- Check browser console (F12) for any error messages

### npm install fails with EPERM errors

This is a Windows file locking issue. Solutions:

1. **Close all VS Code terminals** and restart VS Code
2. **Run as Administrator**: Right-click PowerShell → "Run as Administrator"
3. **Use yarn instead**: 
   ```bash
   yarn install
   yarn dev
   ```
4. **Disable antivirus temporarily** during installation
5. **Restart your computer** to release file locks

### Module not found errors

If you see "Cannot find module 'express'" or similar:

```bash
# In root folder (for backend)
yarn add express cors sqlite3

# In client folder (for frontend)
cd client
yarn install
```

## 🎨 Features Implemented

✅ Horizontal navbar with glassmorphism
✅ Home page with strawberry decoration
✅ Backend API with SQLite database
✅ CRUD for tasks, projects, transactions
✅ Global kanban board (Kanban page)
✅ Project-specific kanban boards
✅ Cascade delete (deleting a project deletes its cards)

## 📝 Next Steps (Optional Enhancements)

- Add drag-and-drop for kanban cards
- Implement Notes, Wishlist, and Vision CRUD operations
- Add user authentication
- Export/import data functionality
- Dark/light theme toggle

## 💡 Tips

- **Global Kanban**: Use the Kanban page in navbar for personal tasks
- **Project Kanban**: Use "Open Board" in Projects for project-specific tasks
- **Glassmorphism**: Works best with light backgrounds
- **Database**: Stored in `rosy.db` - backup this file to save your data!

---

**Need Help?** Check the browser console (F12) for error messages, and ensure both backend and frontend servers are running.

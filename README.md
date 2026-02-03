# Strawberry Bloom Studio

A cute and girly productivity app built with React and Node.js

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

- **Frontend**: React 18, Vite
- **Backend**: Node.js, Express
- **Database**: SQLite3
- **Styling**: Custom CSS with glassmorphism effects

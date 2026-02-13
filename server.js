const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

console.log("🚀 Starting Rosy Workroom Server...");
console.log("📂 Current directory:", __dirname);
console.log("🔧 PORT:", process.env.PORT || 3000);

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 15 * 60 * 1000);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 8);
const loginAttempts = new Map();
const DEFAULT_VISION_TYPE_KEYS = new Set([
  "financial",
  "business",
  "relationships",
  "health_fitness",
  "fun_recreation",
  "personal",
  "contribution"
]);

function resolvePersistentBaseDir() {
  const explicitBase = process.env.DATA_DIR || process.env.APP_DATA_DIR || null;
  if (explicitBase) return explicitBase;

  const homeEnv = process.env.HOME
    || process.env.USERPROFILE
    || (process.env.HOMEDRIVE && process.env.HOMEPATH
      ? path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)
      : null);

  if (homeEnv && /site[\\/]+wwwroot/i.test(homeEnv)) {
    return path.resolve(homeEnv, "..", "..");
  }

  return homeEnv || null;
}

const persistentBaseDir = resolvePersistentBaseDir();
const defaultDataDir = persistentBaseDir
  ? path.join(persistentBaseDir, "data")
  : path.join(__dirname, "data");

if (!fs.existsSync(defaultDataDir)) {
  fs.mkdirSync(defaultDataDir, { recursive: true });
}

const localDbPath = path.join(__dirname, "rosy.db");
const dbPath = process.env.SQLITE_DB_PATH
  || process.env.DATABASE_PATH
  || (fs.existsSync(localDbPath) ? localDbPath : path.join(defaultDataDir, "rosy.db"));

const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log("💾 Database path:", dbPath);
console.log("📦 Data directory:", dataDir);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Failed to open database:", err);
  } else {
    console.log("✅ Database connection established");
  }
});

app.use(cors());
app.use(express.json());

// Setup uploads directory
const uploadsDir = path.join(dataDir, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedImageMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "wishlist-" + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "profile-" + uniqueSuffix + ext);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function issueSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await run(
    "INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, tokenHash, expiresAt]
  );
  return { token, expiresAt };
}

async function revokeSessionByHash(tokenHash) {
  if (!tokenHash) return;
  await run("DELETE FROM user_sessions WHERE token_hash = ?", [tokenHash]);
}

function authAttemptKey(req, username) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || req.ip || "unknown").split(",")[0].trim();
  return `${String(username || "").toLowerCase()}::${ip}`;
}

function registerFailedLogin(key) {
  const now = Date.now();
  const existing = loginAttempts.get(key);
  if (!existing || now > existing.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  existing.count += 1;
  loginAttempts.set(key, existing);
}

function clearFailedLogin(key) {
  loginAttempts.delete(key);
}

function isLoginRateLimited(key) {
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  const now = Date.now();
  if (now > attempt.resetAt) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.count >= LOGIN_MAX_ATTEMPTS;
}

// Middleware to resolve authenticated user from bearer token
app.use(async (req, res, next) => {
  try {
    req.userId = null;
    req.authTokenHash = null;

    const authHeader = req.headers.authorization || "";
    let token = "";

    if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (req.headers["x-auth-token"]) {
      token = String(req.headers["x-auth-token"]).trim();
    }

    if (!token) return next();

    const tokenHash = hashToken(token);
    req.authTokenHash = tokenHash;
    const [session] = await all(
      "SELECT user_id FROM user_sessions WHERE token_hash = ? AND julianday(expires_at) > julianday('now') LIMIT 1",
      [tokenHash]
    );
    req.userId = session ? Number(session.user_id) : null;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Authentication middleware failed" });
  }
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, "client/dist")));

// Serve uploads folder as static
app.use("/uploads", express.static(uploadsDir));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

async function hashPassword(rawPassword) {
  const saltRounds = 10;
  return bcrypt.hash(rawPassword, saltRounds);
}

async function verifyPassword(rawPassword, storedPassword) {
  if (!storedPassword) return false;
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(rawPassword, storedPassword);
  }
  return rawPassword === storedPassword;
}

async function removeUploadFile(fileUrl) {
  if (!fileUrl) return;
  const fileName = path.basename(fileUrl);
  const fullPath = path.join(uploadsDir, fileName);
  try {
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  } catch (err) {
    console.error("⚠️  Failed to remove upload:", err.message);
  }
}

function normalizeUsernameArray(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  for (const item of raw) {
    const name = String(item || "").trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(name);
  }
  return result;
}

async function resolveExistingUsernames(usernames) {
  const normalized = normalizeUsernameArray(usernames);
  if (!normalized.length) return { resolved: [], missing: [] };

  const placeholders = normalized.map(() => "?").join(", ");
  const rows = await all(
    `SELECT username FROM users WHERE lower(username) IN (${placeholders})`,
    normalized.map((name) => name.toLowerCase())
  );

  const existingByLower = new Map(rows.map((row) => [row.username.toLowerCase(), row.username]));
  const resolved = [];
  const missing = [];

  for (const name of normalized) {
    const lower = name.toLowerCase();
    const canonical = existingByLower.get(lower);
    if (!canonical) {
      missing.push(name);
      continue;
    }
    resolved.push(canonical);
  }

  return { resolved, missing };
}

async function getCurrentUser(req) {
  if (!req.userId) return null;
  const [user] = await all("SELECT id, username, email, created_at FROM users WHERE id = ?", [req.userId]);
  return user || null;
}

async function canAccessProject(projectId, req) {
  if (!projectId) return false;
  const user = await getCurrentUser(req);
  if (!user) return false;
  const [project] = await all("SELECT id, user_id, members FROM projects WHERE id = ?", [projectId]);
  if (!project) return false;
  if (project.user_id === req.userId) return true;
  const members = parseJsonArray(project.members).map(name => String(name).toLowerCase());
  return members.includes(String(user.username).toLowerCase());
}

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStartKey(date = new Date()) {
  const start = new Date(date);
  const dayIndex = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayIndex);
  start.setHours(0, 0, 0, 0);
  return formatDateLocal(start);
}


async function init() {
  console.log("🔄 Starting database initialization...");
  
  try {
    await run(
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tags TEXT,
      members TEXT,
      dueDate TEXT,
      description TEXT,
      taskCount INTEGER DEFAULT 0
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS kanban_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT NOT NULL,
      label TEXT,
      status TEXT DEFAULT 'todo',
      dueDate TEXT,
      description TEXT,
      amount REAL DEFAULT 0,
      position INTEGER DEFAULT 0,
      tags TEXT,
      priority TEXT,
      assignees TEXT,
      attachments TEXT,
      checklist_groups TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS kanban_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      project_id INTEGER,
      user_id INTEGER,
      UNIQUE(key, user_id)
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS monthly_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      budget REAL NOT NULL,
      user_id INTEGER,
      UNIQUE(year, month, user_id)
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS vision_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT DEFAULT '✨',
      category TEXT DEFAULT 'personal',
      achieved INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      achieved_at TEXT,
      user_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS vision_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS vision_type_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      disabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item TEXT NOT NULL,
      price TEXT,
      status TEXT DEFAULT 'wishlist',
      purchased_date TEXT,
      image_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS week_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_key TEXT NOT NULL,
      plan_data TEXT NOT NULL,
      user_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(week_key, user_id)
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
  await run("CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at)");
  await run("DELETE FROM user_sessions WHERE julianday(expires_at) <= julianday('now')");

  // Migrate users table to add profile columns
  const userColumns = await all("PRAGMA table_info(users)");
  const userExisting = new Set(userColumns.map((col) => col.name));
  const userMigrations = [
    { name: "display_name", sql: "ALTER TABLE users ADD COLUMN display_name TEXT" },
    { name: "focus", sql: "ALTER TABLE users ADD COLUMN focus TEXT" },
    { name: "bio", sql: "ALTER TABLE users ADD COLUMN bio TEXT" },
    { name: "mantra", sql: "ALTER TABLE users ADD COLUMN mantra TEXT" },
    { name: "birthday", sql: "ALTER TABLE users ADD COLUMN birthday TEXT" },
    { name: "theme_mood", sql: "ALTER TABLE users ADD COLUMN theme_mood TEXT" },
    { name: "language", sql: "ALTER TABLE users ADD COLUMN language TEXT" },
    { name: "avatar_url", sql: "ALTER TABLE users ADD COLUMN avatar_url TEXT" },
    { name: "joined_date", sql: "ALTER TABLE users ADD COLUMN joined_date TEXT" }
  ];

  for (const migration of userMigrations) {
    if (!userExisting.has(migration.name)) {
      await run(migration.sql);
    }
  }

  if (!userExisting.has("joined_date")) {
    await run("UPDATE users SET joined_date = created_at WHERE joined_date IS NULL");
  } else {
    await run("UPDATE users SET joined_date = created_at WHERE joined_date IS NULL");
  }

  const columns = await all("PRAGMA table_info(kanban_cards)");
  const existing = new Set(columns.map((col) => col.name));

  if (existing.has("column_id")) {
    await run("PRAGMA foreign_keys = OFF");
    await run(
      `CREATE TABLE IF NOT EXISTS kanban_cards_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        title TEXT NOT NULL,
        label TEXT,
        status TEXT DEFAULT 'todo',
        dueDate TEXT,
        description TEXT,
        amount REAL DEFAULT 0,
        position INTEGER DEFAULT 0,
        tags TEXT,
        priority TEXT,
        assignees TEXT,
        attachments TEXT,
        checklist_groups TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`
    );

    const selectExprs = [
      existing.has("id") ? "id" : "NULL as id",
      existing.has("project_id") ? "project_id" : "NULL as project_id",
      existing.has("title") ? "title" : "'' as title",
      existing.has("label") ? "label" : "NULL as label",
      existing.has("status") ? "status" : "'todo' as status",
      existing.has("dueDate") ? "dueDate" : "NULL as dueDate",
      existing.has("description") ? "description" : "NULL as description",
      existing.has("amount") ? "amount" : "0 as amount",
      existing.has("position") ? "position" : "id as position",
      existing.has("tags") ? "tags" : "NULL as tags",
      existing.has("priority") ? "priority" : "NULL as priority",
      existing.has("assignees") ? "assignees" : "NULL as assignees",
      existing.has("attachments") ? "attachments" : "NULL as attachments",
      existing.has("checklist_groups") ? "checklist_groups" : "NULL as checklist_groups",
    ];

    await run(
      `INSERT INTO kanban_cards_new (id, project_id, title, label, status, dueDate, description, amount, position, tags, priority, assignees, attachments, checklist_groups)
       SELECT ${selectExprs.join(", ")} FROM kanban_cards`
    );

    await run("DROP TABLE kanban_cards");
    await run("ALTER TABLE kanban_cards_new RENAME TO kanban_cards");
    await run("PRAGMA foreign_keys = ON");
  }

  const columnsAfter = await all("PRAGMA table_info(kanban_cards)");
  const existingAfter = new Set(columnsAfter.map((col) => col.name));
  const migrations = [
    { name: "project_id", sql: "ALTER TABLE kanban_cards ADD COLUMN project_id INTEGER" },
    { name: "label", sql: "ALTER TABLE kanban_cards ADD COLUMN label TEXT" },
    { name: "status", sql: "ALTER TABLE kanban_cards ADD COLUMN status TEXT DEFAULT 'todo'" },
    { name: "dueDate", sql: "ALTER TABLE kanban_cards ADD COLUMN dueDate TEXT" },
    { name: "description", sql: "ALTER TABLE kanban_cards ADD COLUMN description TEXT" },
    { name: "amount", sql: "ALTER TABLE kanban_cards ADD COLUMN amount REAL DEFAULT 0" },
    { name: "position", sql: "ALTER TABLE kanban_cards ADD COLUMN position INTEGER DEFAULT 0" },
    { name: "tags", sql: "ALTER TABLE kanban_cards ADD COLUMN tags TEXT" },
    { name: "priority", sql: "ALTER TABLE kanban_cards ADD COLUMN priority TEXT" },
    { name: "assignees", sql: "ALTER TABLE kanban_cards ADD COLUMN assignees TEXT" },
    { name: "attachments", sql: "ALTER TABLE kanban_cards ADD COLUMN attachments TEXT" },
    { name: "checklist_groups", sql: "ALTER TABLE kanban_cards ADD COLUMN checklist_groups TEXT" },
  ];

  for (const migration of migrations) {
    if (!existingAfter.has(migration.name)) {
      await run(migration.sql);
    }
  }

  // Migrate notes table to add updated_at if missing
  const notesColumns = await all("PRAGMA table_info(notes)");
  const notesExisting = new Set(notesColumns.map((col) => col.name));
  
  if (!notesExisting.has("updated_at")) {
    await run("ALTER TABLE notes ADD COLUMN updated_at TEXT");
    // Set initial value for existing rows
    await run("UPDATE notes SET updated_at = created_at WHERE updated_at IS NULL");
  }

  // Migrate projects table to add tags/members columns and copy from tag if needed
  try {
    const projectColumns = await all("PRAGMA table_info(projects)");
    const projectExisting = new Set(projectColumns.map((col) => col.name));

    if (!projectExisting.has("tags")) {
      await run("ALTER TABLE projects ADD COLUMN tags TEXT");
    }

    if (!projectExisting.has("members")) {
      await run("ALTER TABLE projects ADD COLUMN members TEXT");
    }

    if (projectExisting.has("tag")) {
      // Copy single tag into tags JSON array if tags is empty
      await run("UPDATE projects SET tags = json_array(tag) WHERE tag IS NOT NULL AND (tags IS NULL OR tags = '')");
    }
  } catch (err) {
    console.error("⚠️  Failed to migrate projects tags:", err.message);
  }

  // Migrate kanban_cards to add checklist column if missing
  try {
    const kanbanColumnsCheck = await all("PRAGMA table_info(kanban_cards)");
    const kanbanExisting = new Set(kanbanColumnsCheck.map((col) => col.name));
    
    if (!kanbanExisting.has("checklist")) {
      console.log("Adding checklist column to kanban_cards...");
      await run("ALTER TABLE kanban_cards ADD COLUMN checklist TEXT");
      console.log("✅ Checklist column added");
    }
  } catch (err) {
    console.error("⚠️  Failed to add checklist column:", err.message);
    // Continue anyway
  }

  try {
    await run("UPDATE kanban_cards SET position = id WHERE position IS NULL OR position = 0");
  } catch (err) {
    console.error("⚠️  Failed to backfill kanban positions:", err.message);
  }

  try {
    const kanbanColumnDefs = await all("PRAGMA table_info(kanban_columns)");
    const kanbanColumnNames = new Set(kanbanColumnDefs.map((col) => col.name));
    if (!kanbanColumnNames.has("project_id")) {
      await run("ALTER TABLE kanban_columns ADD COLUMN project_id INTEGER");
    }
  } catch (err) {
    console.error("⚠️  Failed to migrate kanban_columns project scope:", err.message);
  }

  try {
    const columns = await all("SELECT * FROM kanban_columns WHERE user_id IS NULL AND project_id IS NULL");
    if (!columns.length) {
      await run(
        "INSERT INTO kanban_columns (key, name, position, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
        ["todo", "To Do", 1, null, null]
      );
      await run(
        "INSERT INTO kanban_columns (key, name, position, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
        ["inprogress", "In Progress", 2, null, null]
      );
      await run(
        "INSERT INTO kanban_columns (key, name, position, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
        ["done", "Done", 3, null, null]
      );
    }
  } catch (err) {
    console.error("⚠️  Failed to seed kanban columns:", err.message);
  }

  // Migrate wishlist_items table to ensure all columns exist
  const wishlistColumns = await all("PRAGMA table_info(wishlist_items)");
  const wishlistExisting = new Set(wishlistColumns.map((col) => col.name));
  
  if (!wishlistExisting.has("status")) {
    await run("ALTER TABLE wishlist_items ADD COLUMN status TEXT");
    await run("UPDATE wishlist_items SET status = 'wishlist' WHERE status IS NULL");
  }
  
  if (!wishlistExisting.has("purchased_date")) {
    await run("ALTER TABLE wishlist_items ADD COLUMN purchased_date TEXT");
  }

  if (!wishlistExisting.has("image_path")) {
    console.log("Adding image_path column to wishlist_items...");
    await run("ALTER TABLE wishlist_items ADD COLUMN image_path TEXT");
    console.log("✅ Image_path column added to wishlist_items");
  }

  // Add user_id columns to all tables for multi-user support
  console.log("🔄 Adding user_id columns to tables...");
  const tablesToMigrate = ['tasks', 'projects', 'kanban_cards', 'notes', 'transactions', 'monthly_budgets', 'vision_goals', 'wishlist_items', 'week_plans'];
  
  for (const tableName of tablesToMigrate) {
    try {
      const columns = await all(`PRAGMA table_info(${tableName})`);
      const existing = new Set(columns.map(col => col.name));
      
      if (!existing.has('user_id')) {
        await run(`ALTER TABLE ${tableName} ADD COLUMN user_id INTEGER`);
        console.log(`✅ Added user_id to ${tableName}`);
      }
    } catch (err) {
      console.error(`⚠️  Failed to add user_id to ${tableName}:`, err.message);
    }
  }
  console.log("✅ User ID migration completed");

  // Migrate vision_goals to add achieved flag if missing
  try {
    const visionColumns = await all("PRAGMA table_info(vision_goals)");
    const visionExisting = new Set(visionColumns.map((col) => col.name));
    if (!visionExisting.has("achieved")) {
      await run("ALTER TABLE vision_goals ADD COLUMN achieved INTEGER DEFAULT 0");
      await run("UPDATE vision_goals SET achieved = 0 WHERE achieved IS NULL");
    }
    if (!visionExisting.has("category")) {
      await run("ALTER TABLE vision_goals ADD COLUMN category TEXT DEFAULT 'personal'");
      await run("UPDATE vision_goals SET category = 'personal' WHERE category IS NULL OR TRIM(category) = ''");
    }
    if (!visionExisting.has("archived")) {
      await run("ALTER TABLE vision_goals ADD COLUMN archived INTEGER DEFAULT 0");
      await run("UPDATE vision_goals SET archived = COALESCE(achieved, 0)");
    }
    if (!visionExisting.has("achieved_at")) {
      await run("ALTER TABLE vision_goals ADD COLUMN achieved_at TEXT");
      await run("UPDATE vision_goals SET achieved_at = CURRENT_TIMESTAMP WHERE achieved = 1 AND achieved_at IS NULL");
    }
    await run("UPDATE vision_goals SET category = 'personal' WHERE category IS NULL OR TRIM(category) = ''");
    await run("UPDATE vision_goals SET archived = COALESCE(achieved, 0) WHERE archived IS NULL");
  } catch (err) {
    console.error("⚠️  Failed to add achieved column to vision_goals:", err.message);
  }

  try {
    const visionTypeColumns = await all("PRAGMA table_info(vision_types)");
    const visionTypeExisting = new Set(visionTypeColumns.map((col) => col.name));
    if (!visionTypeExisting.has("position")) {
      await run("ALTER TABLE vision_types ADD COLUMN position INTEGER DEFAULT 0");
      await run("UPDATE vision_types SET position = id WHERE position IS NULL OR position = 0");
    }
  } catch (err) {
    console.error("⚠️  Failed to migrate vision_types:", err.message);
  }

  // Fix monthly_budgets UNIQUE constraint to include user_id
  console.log("🔄 Fixing monthly_budgets UNIQUE constraint...");
  try {
    // Check if the constraint needs fixing by examining the table
    const budgetColumns = await all("PRAGMA table_info(monthly_budgets)");
    const hasUserId = budgetColumns.some(col => col.name === 'user_id');
    
    if (hasUserId) {
      // Recreate table with correct constraint
      await run("DROP TABLE IF EXISTS monthly_budgets_backup");
      await run("CREATE TABLE monthly_budgets_backup AS SELECT * FROM monthly_budgets");
      await run("DROP TABLE monthly_budgets");
      await run(`CREATE TABLE monthly_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        budget REAL NOT NULL,
        user_id INTEGER,
        UNIQUE(year, month, user_id)
      )`);
      await run("INSERT INTO monthly_budgets SELECT * FROM monthly_budgets_backup");
      await run("DROP TABLE monthly_budgets_backup");
      console.log("✅ Fixed monthly_budgets UNIQUE constraint");
    }
  } catch (err) {
    console.error("⚠️  Failed to fix monthly_budgets constraint:", err.message);
  }

  // Fix week_plans UNIQUE constraint to include user_id
  console.log("🔄 Fixing week_plans UNIQUE constraint...");
  try {
    const weekColumns = await all("PRAGMA table_info(week_plans)");
    const hasUserId = weekColumns.some(col => col.name === 'user_id');
    
    if (hasUserId) {
      // Recreate table with correct constraint
      await run("DROP TABLE IF EXISTS week_plans_backup");
      await run("CREATE TABLE week_plans_backup AS SELECT * FROM week_plans");
      await run("DROP TABLE week_plans");
      await run(`CREATE TABLE week_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_key TEXT NOT NULL,
        plan_data TEXT NOT NULL,
        user_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(week_key, user_id)
      )`);
      await run("INSERT INTO week_plans SELECT * FROM week_plans_backup");
      await run("DROP TABLE week_plans_backup");
      console.log("✅ Fixed week_plans UNIQUE constraint");
    }
  } catch (err) {
    console.error("⚠️  Failed to fix week_plans constraint:", err.message);
  }

  // Seed default notes if table is empty
  const existingNotes = await all("SELECT COUNT(*) as count FROM notes");
  if (existingNotes[0].count === 0) {
    const defaultNotes = [
      { title: 'Project description', content: 'Build a gentle pink workspace with tracker pages and kanban.', tags: JSON.stringify(['Project', 'Design']) },
      { title: 'Meeting recap', content: 'Client loves the rose gradient, wants more rounded corners.', tags: JSON.stringify(['Client', 'Feedback']) },
      { title: 'Personal reminder', content: 'Schedule wellness day after campaign launch.', tags: JSON.stringify(['Self-care', 'Life']) }
    ];
    for (const note of defaultNotes) {
      await run("INSERT INTO notes (title, content, tags) VALUES (?, ?, ?)", [note.title, note.content, note.tags]);
    }
  }

  // Seed sample transactions for the last 6 months if table is empty
  const existingTransactions = await all("SELECT COUNT(*) as count FROM transactions");
  if (existingTransactions[0].count === 0) {
    const now = new Date();
    const sampleTransactions = [
      // September 2025
      { date: '2025-09-05', item: 'Groceries', category: 'Food', amount: 120.50 },
      { date: '2025-09-12', item: 'Coffee shop', category: 'Food', amount: 45.00 },
      { date: '2025-09-18', item: 'Skincare', category: 'Beauty', amount: 85.00 },
      { date: '2025-09-25', item: 'Uber', category: 'Transport', amount: 32.00 },
      
      // October 2025
      { date: '2025-10-03', item: 'Groceries', category: 'Food', amount: 150.00 },
      { date: '2025-10-10', item: 'Nail salon', category: 'Beauty', amount: 60.00 },
      { date: '2025-10-15', item: 'Netflix', category: 'Subscriptions', amount: 15.99 },
      { date: '2025-10-20', item: 'Gas', category: 'Transport', amount: 50.00 },
      { date: '2025-10-28', item: 'Restaurant', category: 'Food', amount: 75.00 },
      
      // November 2025
      { date: '2025-11-02', item: 'Groceries', category: 'Food', amount: 180.00 },
      { date: '2025-11-08', item: 'Makeup', category: 'Beauty', amount: 120.00 },
      { date: '2025-11-14', item: 'Spotify', category: 'Subscriptions', amount: 10.99 },
      { date: '2025-11-22', item: 'Birthday gift', category: 'Gifts', amount: 95.00 },
      { date: '2025-11-28', item: 'Uber', category: 'Transport', amount: 28.00 },
      
      // December 2025
      { date: '2025-12-05', item: 'Groceries', category: 'Food', amount: 200.00 },
      { date: '2025-12-10', item: 'Christmas gifts', category: 'Gifts', amount: 350.00 },
      { date: '2025-12-15', item: 'Holiday dinner', category: 'Food', amount: 120.00 },
      { date: '2025-12-20', item: 'Hair salon', category: 'Beauty', amount: 90.00 },
      { date: '2025-12-28', item: 'New Year outfit', category: 'Shopping', amount: 150.00 },
      
      // January 2026
      { date: '2026-01-05', item: 'Groceries', category: 'Food', amount: 160.00 },
      { date: '2026-01-12', item: 'Gym membership', category: 'Health', amount: 45.00 },
      { date: '2026-01-18', item: 'Books', category: 'Shopping', amount: 55.00 },
      { date: '2026-01-25', item: 'Coffee supplies', category: 'Food', amount: 40.00 },
      
      // February 2026 (current month)
      { date: '2026-02-01', item: 'Groceries', category: 'Food', amount: 130.00 },
      { date: '2026-02-02', item: 'Gas', category: 'Transport', amount: 45.00 }
    ];
    
    for (const tx of sampleTransactions) {
      await run(
        "INSERT INTO transactions (date, item, category, amount) VALUES (?, ?, ?, ?)",
        [tx.date, tx.item, tx.category, tx.amount]
      );
    }
  }

  // Seed vision goals if table is empty
  const existingGoals = await all("SELECT COUNT(*) as count FROM vision_goals");
  if (existingGoals[0].count === 0) {
    const defaultGoals = [
      { title: 'Career bloom', description: 'Launch my signature design studio & sign 5 dreamy clients.', icon: '✨' },
      { title: 'Home sanctuary', description: 'Create a cozy studio corner with soft lighting and plants.', icon: '🌺' },
      { title: 'Travel & joy', description: 'Plan two getaways that feel slow, romantic, and inspiring.', icon: '💙' },
      { title: 'Wellbeing ritual', description: 'Daily journaling + weekly movement, with monthly spa time.', icon: '💛' }
    ];
    for (const goal of defaultGoals) {
      await run(
        "INSERT INTO vision_goals (title, description, icon) VALUES (?, ?, ?)",
        [goal.title, goal.description, goal.icon]
      );
    }
  }

  // Seed wishlist items if table is empty
  const existingWishlist = await all("SELECT COUNT(*) as count FROM wishlist_items");
  if (existingWishlist[0].count === 0) {
    const defaultWishlist = [
      { item: 'Rose gold desk organizer', price: '28 MAD', status: 'wishlist' },
      { item: 'Soft pink office chair', price: '120 MAD', status: 'wishlist' },
      { item: 'Planner refill set', price: '22 MAD', status: 'wishlist' }
    ];
    const defaultPurchased = [
      { item: 'Floral mousepad', status: 'purchased', purchased_date: '2026-01-25' },
      { item: 'Notebook set', status: 'purchased', purchased_date: '2026-01-20' },
      { item: 'Candle trio', status: 'purchased', purchased_date: '2026-01-12' }
    ];
    for (const item of defaultWishlist) {
      await run(
        "INSERT INTO wishlist_items (item, price, status) VALUES (?, ?, ?)",
        [item.item, item.price, item.status]
      );
    }
    for (const item of defaultPurchased) {
      await run(
        "INSERT INTO wishlist_items (item, status, purchased_date) VALUES (?, ?, ?)",
        [item.item, item.status, item.purchased_date]
      );
    }
  }
  
  // Seed minimal collaboration demo data once (safe and non-destructive).
  const [existingDemoProject] = await all(
    "SELECT id FROM projects WHERE name = ? LIMIT 1",
    ["Collab Launch Demo"]
  );
  if (!existingDemoProject && process.env.NODE_ENV !== "production") {
    const [existingAlice] = await all("SELECT id, username FROM users WHERE username = ?", ["alice"]);
    const [existingLina] = await all("SELECT id, username FROM users WHERE username = ?", ["lina"]);

    if (!existingAlice) {
      const hashed = await hashPassword("alice123");
      await run(
        "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
        ["alice", hashed, "alice@example.com"]
      );
    }
    if (!existingLina) {
      const hashed = await hashPassword("lina123");
      await run(
        "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
        ["lina", hashed, "lina@example.com"]
      );
    }

    const [alice] = await all("SELECT id, username FROM users WHERE username = ?", ["alice"]);
    const [lina] = await all("SELECT id, username FROM users WHERE username = ?", ["lina"]);
    if (alice && lina) {
      const projectInsert = await run(
        "INSERT INTO projects (name, tags, members, dueDate, description, taskCount, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          "Collab Launch Demo",
          JSON.stringify(["Work", "Collab"]),
          JSON.stringify([lina.username]),
          "2026-03-10",
          "Demo collaborative project seeded for testing assignments.",
          2,
          alice.id
        ]
      );

      const seededCards = [
        {
          title: "Prepare launch brief",
          status: "todo",
          dueDate: "2026-02-20",
          description: "Draft kickoff notes and assign responsibilities.",
          priority: "high",
          assignees: [alice.username, lina.username],
          position: 1
        },
        {
          title: "Collect reference assets",
          status: "inprogress",
          dueDate: "2026-02-22",
          description: "Gather brand visuals and moodboard files.",
          priority: "medium",
          assignees: [lina.username],
          position: 1
        }
      ];

      for (const card of seededCards) {
        await run(
          "INSERT INTO kanban_cards (project_id, title, label, status, dueDate, description, amount, checklist, checklist_groups, tags, priority, assignees, attachments, position, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            projectInsert.lastID,
            card.title,
            "Collab",
            card.status,
            card.dueDate,
            card.description,
            0,
            JSON.stringify([]),
            JSON.stringify([]),
            JSON.stringify(["Collab"]),
            card.priority,
            JSON.stringify(card.assignees),
            JSON.stringify([]),
            card.position,
            alice.id
          ]
        );
      }
    }
  }

  // Seed profile details for user 'bakkali douae' if available
  try {
    const [bakkali] = await all(
      "SELECT id, username FROM users WHERE lower(username) = ?",
      ["bakkali douae"]
    );
    if (bakkali) {
      await run(
        "UPDATE users SET display_name = ?, focus = ?, bio = ?, mantra = ?, birthday = ?, theme_mood = ?, language = ?, joined_date = COALESCE(joined_date, created_at) WHERE id = ?",
        [
          "Bakkali Douae",
          "Ship sweet features with calm focus",
          "Dreamy planner + soft builder of cozy workrooms.",
          "Small steps, soft wins",
          "1999-06-12",
          "Strawberry",
          "French",
          bakkali.id
        ]
      );
    }
  } catch (err) {
    console.error("⚠️  Failed to seed profile details:", err.message);
  }

  console.log("✅ Database initialization completed successfully");
  
  } catch (error) {
    console.error("❌ Error during database initialization:", error);
    console.error("Stack trace:", error.stack);
    throw error; // Re-throw to be caught by init().catch()
  }
}

app.get("/api/tasks", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const rows = await all("SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC", [req.userId]);
  res.json(rows.map((row) => ({ ...row, done: Boolean(row.done) })));
});

app.post("/api/tasks", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { title } = req.body;
  if (!title) return res.status(400).send("Title required");
  const result = await run("INSERT INTO tasks (title, user_id) VALUES (?, ?)", [title, req.userId]);
  const [task] = await all("SELECT * FROM tasks WHERE id = ?", [result.lastID]);
  res.status(201).json({ ...task, done: Boolean(task.done) });
});

app.put("/api/tasks/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  const { title, done } = req.body;
  const task = await all("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [id, req.userId]);
  if (!task.length) return res.status(404).send("Not found");
  const nextTitle = title ?? task[0].title;
  const nextDone = typeof done === "boolean" ? Number(done) : task[0].done;
  await run("UPDATE tasks SET title = ?, done = ? WHERE id = ? AND user_id = ?", [nextTitle, nextDone, id, req.userId]);
  const [updated] = await all("SELECT * FROM tasks WHERE id = ?", [id]);
  res.json({ ...updated, done: Boolean(updated.done) });
});

app.delete("/api/tasks/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  await run("DELETE FROM tasks WHERE id = ? AND user_id = ?", [id, req.userId]);
  res.status(204).send();
});

app.get("/api/projects", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).send("Unauthorized");
  const rows = await all(
    `SELECT p.*,
            COUNT(k.id) as taskCount,
            CASE WHEN p.user_id = ? THEN 1 ELSE 0 END as isOwner
     FROM projects p
     LEFT JOIN kanban_cards k ON k.project_id = p.id
     WHERE p.user_id = ?
        OR EXISTS (
          SELECT 1 FROM json_each(COALESCE(p.members, '[]')) m
          WHERE lower(m.value) = lower(?)
        )
     GROUP BY p.id
     ORDER BY p.id DESC`,
    [req.userId, req.userId, user.username]
  );
  const parsed = rows.map((p) => ({
    ...p,
    tags: p.tags ? JSON.parse(p.tags) : [],
    members: p.members ? JSON.parse(p.members) : [],
    isOwner: Boolean(p.isOwner)
  }));
  res.json(parsed);
});

app.post("/api/projects", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { name, tags, members, dueDate, description } = req.body;
  if (!name) return res.status(400).send("Name required");
  const { resolved: validMembers, missing: missingMembers } = await resolveExistingUsernames(members || []);
  if (missingMembers.length) {
    return res.status(400).json({
      error: "Some project members do not exist",
      missingUsers: missingMembers
    });
  }
  const tagsJson = Array.isArray(tags)
    ? JSON.stringify(tags)
    : (tags ? JSON.stringify([tags]) : JSON.stringify([]));
  const membersJson = JSON.stringify(validMembers);
  const result = await run(
    "INSERT INTO projects (name, tags, members, dueDate, description, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [name, tagsJson, membersJson, dueDate || null, description || null, req.userId]
  );
  const [project] = await all("SELECT * FROM projects WHERE id = ?", [result.lastID]);
  if (project && project.tags) {
    project.tags = JSON.parse(project.tags);
  }
  project.members = project?.members ? JSON.parse(project.members) : [];
  res.status(201).json(project);
});

app.put("/api/projects/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  const existing = await all("SELECT * FROM projects WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).send("Not found");
  if (existing[0].user_id !== req.userId) return res.status(403).send("Only project owner can edit project settings");
  const { name, tags, members, dueDate, description, taskCount } = req.body;
  let membersJson = existing[0].members;
  if (members !== undefined) {
    const { resolved: validMembers, missing: missingMembers } = await resolveExistingUsernames(members);
    if (missingMembers.length) {
      return res.status(400).json({
        error: "Some project members do not exist",
        missingUsers: missingMembers
      });
    }
    membersJson = JSON.stringify(validMembers);
  }
  const tagsJson = Array.isArray(tags)
    ? JSON.stringify(tags)
    : (tags ? JSON.stringify([tags]) : existing[0].tags);
  const next = {
    name: name ?? existing[0].name,
    tags: tagsJson ?? existing[0].tags,
    members: membersJson ?? existing[0].members,
    dueDate: dueDate ?? existing[0].dueDate,
    description: description ?? existing[0].description,
    taskCount: typeof taskCount === "number" ? taskCount : existing[0].taskCount,
  };
  await run(
    "UPDATE projects SET name = ?, tags = ?, members = ?, dueDate = ?, description = ?, taskCount = ? WHERE id = ? AND user_id = ?",
    [next.name, next.tags, next.members, next.dueDate, next.description, next.taskCount, id, req.userId]
  );

  // Keep task assignees coherent with current project collaborators.
  const owner = await getCurrentUser(req);
  const allowedAssignees = new Set([
    ...parseJsonArray(next.members).map((name) => String(name).toLowerCase()),
    String(owner?.username || "").toLowerCase()
  ]);
  const projectCards = await all(
    "SELECT id, assignees FROM kanban_cards WHERE project_id = ?",
    [id]
  );
  for (const projectCard of projectCards) {
    const currentAssignees = parseJsonArray(projectCard.assignees);
    const filteredAssignees = currentAssignees.filter((name) => allowedAssignees.has(String(name).toLowerCase()));
    if (JSON.stringify(filteredAssignees) !== JSON.stringify(currentAssignees)) {
      await run(
        "UPDATE kanban_cards SET assignees = ? WHERE id = ?",
        [JSON.stringify(filteredAssignees), projectCard.id]
      );
    }
  }

  const [project] = await all("SELECT * FROM projects WHERE id = ?", [id]);
  if (project && project.tags) {
    project.tags = JSON.parse(project.tags);
  }
  project.members = project?.members ? JSON.parse(project.members) : [];
  res.json(project);
});

app.delete("/api/projects/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  const existing = await all("SELECT id, user_id FROM projects WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).send("Not found");
  if (existing[0].user_id !== req.userId) return res.status(403).send("Only project owner can delete project");
  await run("DELETE FROM projects WHERE id = ?", [id]);
  res.status(204).send();
});

app.get("/api/transactions", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const rows = await all("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC", [req.userId]);
  res.json(rows);
});

app.post("/api/transactions", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { date, item, category, amount } = req.body;
  if (!date || !item || !category || typeof amount !== "number") {
    return res.status(400).send("Invalid transaction");
  }
  const result = await run(
    "INSERT INTO transactions (date, item, category, amount, user_id) VALUES (?, ?, ?, ?, ?)",
    [date, item, category, amount, req.userId]
  );
  const [tx] = await all("SELECT * FROM transactions WHERE id = ?", [result.lastID]);
  res.status(201).json(tx);
});

app.delete("/api/transactions/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  await run("DELETE FROM transactions WHERE id = ? AND user_id = ?", [id, req.userId]);
  res.status(204).send();
});

// Kanban Cards
app.get("/api/kanban/columns", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const projectIdRaw = req.query.projectId;
  const hasProjectParam = projectIdRaw !== undefined && projectIdRaw !== null && String(projectIdRaw).trim() !== "";

  let rows = [];
  if (hasProjectParam && String(projectIdRaw) !== "0") {
    const projectId = Number(projectIdRaw);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return res.status(400).send("Invalid projectId");
    }
    const hasAccess = await canAccessProject(projectId, req);
    if (!hasAccess) return res.status(403).send("Forbidden");
    rows = await all(
      `SELECT key, name, position
       FROM kanban_columns
       WHERE (user_id IS NULL AND project_id IS NULL) OR project_id = ?
       ORDER BY position ASC, id ASC`,
      [projectId]
    );
  } else {
    rows = await all(
      `SELECT key, name, position
       FROM kanban_columns
       WHERE (user_id IS NULL AND project_id IS NULL) OR (project_id IS NULL AND user_id = ?)
       ORDER BY position ASC, id ASC`,
      [req.userId]
    );
  }
  if (!rows.length) {
    return res.json([
      { key: "todo", name: "To Do", position: 1 },
      { key: "inprogress", name: "In Progress", position: 2 },
      { key: "done", name: "Done", position: 3 }
    ]);
  }
  res.json(rows);
});

app.post("/api/kanban/columns", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { name, projectId } = req.body;
  if (!name || typeof name !== "string") return res.status(400).send("Name required");
  const isProjectScoped = projectId !== undefined && projectId !== null && String(projectId) !== "0";
  let normalizedProjectId = null;
  if (isProjectScoped) {
    normalizedProjectId = Number(projectId);
    if (!Number.isFinite(normalizedProjectId) || normalizedProjectId <= 0) {
      return res.status(400).send("Invalid projectId");
    }
    const hasAccess = await canAccessProject(normalizedProjectId, req);
    if (!hasAccess) return res.status(403).send("Forbidden");
  }
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "column";
  let row;
  if (isProjectScoped) {
    [row] = await all(
      "SELECT COUNT(*) as count FROM kanban_columns WHERE key LIKE ? AND ((user_id IS NULL AND project_id IS NULL) OR project_id = ?)",
      [`${slug}%`, normalizedProjectId]
    );
  } else {
    [row] = await all(
      "SELECT COUNT(*) as count FROM kanban_columns WHERE key LIKE ? AND ((user_id IS NULL AND project_id IS NULL) OR (project_id IS NULL AND user_id = ?))",
      [`${slug}%`, req.userId]
    );
  }
  const suffix = row?.count ? `-${row.count + 1}` : "";
  const key = `${slug}${suffix}`;
  let positionRow;
  if (isProjectScoped) {
    [positionRow] = await all(
      "SELECT COALESCE(MAX(position), 0) as maxPos FROM kanban_columns WHERE (user_id IS NULL AND project_id IS NULL) OR project_id = ?",
      [normalizedProjectId]
    );
  } else {
    [positionRow] = await all(
      "SELECT COALESCE(MAX(position), 0) as maxPos FROM kanban_columns WHERE (user_id IS NULL AND project_id IS NULL) OR (project_id IS NULL AND user_id = ?)",
      [req.userId]
    );
  }
  const position = (positionRow?.maxPos || 0) + 1;
  await run(
    "INSERT INTO kanban_columns (key, name, position, project_id, user_id) VALUES (?, ?, ?, ?, ?)",
    [key, name.trim(), position, normalizedProjectId, isProjectScoped ? null : req.userId]
  );
  res.status(201).json({ key, name: name.trim(), position });
});

app.put("/api/kanban/columns/:key", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { key } = req.params;
  const { name, position, projectId } = req.body;
  const isProjectScoped = projectId !== undefined && projectId !== null && String(projectId) !== "0";
  let existing = [];

  if (isProjectScoped) {
    const normalizedProjectId = Number(projectId);
    if (!Number.isFinite(normalizedProjectId) || normalizedProjectId <= 0) {
      return res.status(400).send("Invalid projectId");
    }
    const hasAccess = await canAccessProject(normalizedProjectId, req);
    if (!hasAccess) return res.status(403).send("Forbidden");
    existing = await all(
      "SELECT * FROM kanban_columns WHERE key = ? AND project_id = ?",
      [key, normalizedProjectId]
    );
  } else {
    existing = await all(
      "SELECT * FROM kanban_columns WHERE key = ? AND project_id IS NULL AND (user_id IS NULL OR user_id = ?)",
      [key, req.userId]
    );
  }
  if (!existing.length) return res.status(404).send("Not found");
  const nextName = typeof name === "string" && name.trim() ? name.trim() : existing[0].name;
  const nextPosition = typeof position === "number" ? position : existing[0].position;
  if (isProjectScoped) {
    await run(
      "UPDATE kanban_columns SET name = ?, position = ? WHERE key = ? AND project_id = ?",
      [nextName, nextPosition, key, Number(projectId)]
    );
  } else {
    await run(
      "UPDATE kanban_columns SET name = ?, position = ?, user_id = ? WHERE key = ? AND project_id IS NULL AND (user_id IS NULL OR user_id = ?)",
      [nextName, nextPosition, req.userId, key, req.userId]
    );
  }
  res.json({ key, name: nextName, position: nextPosition });
});

app.delete("/api/kanban/columns/:key", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { key } = req.params;
  const projectIdRaw = req.query.projectId;
  const isProjectScoped = projectIdRaw !== undefined && projectIdRaw !== null && String(projectIdRaw) !== "" && String(projectIdRaw) !== "0";
  let existing = [];

  if (isProjectScoped) {
    const normalizedProjectId = Number(projectIdRaw);
    if (!Number.isFinite(normalizedProjectId) || normalizedProjectId <= 0) {
      return res.status(400).send("Invalid projectId");
    }
    const hasAccess = await canAccessProject(normalizedProjectId, req);
    if (!hasAccess) return res.status(403).send("Forbidden");
    existing = await all(
      "SELECT * FROM kanban_columns WHERE key = ? AND project_id = ?",
      [key, normalizedProjectId]
    );
  } else {
    existing = await all(
      "SELECT * FROM kanban_columns WHERE key = ? AND project_id IS NULL AND (user_id IS NULL OR user_id = ?)",
      [key, req.userId]
    );
  }
  if (!existing.length) return res.status(404).send("Not found");

  if (isProjectScoped) {
    const normalizedProjectId = Number(projectIdRaw);
    await run(
      "UPDATE kanban_cards SET status = 'todo' WHERE project_id = ? AND status = ?",
      [normalizedProjectId, key]
    );
    await run(
      "DELETE FROM kanban_columns WHERE key = ? AND project_id = ?",
      [key, normalizedProjectId]
    );
  } else {
    await run(
      "UPDATE kanban_cards SET status = 'todo' WHERE user_id = ? AND project_id IS NULL AND status = ?",
      [req.userId, key]
    );
    await run(
      "DELETE FROM kanban_columns WHERE key = ? AND project_id IS NULL AND (user_id IS NULL OR user_id = ?)",
      [key, req.userId]
    );
  }
  res.status(204).send();
});

app.get("/api/kanban/:projectId", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { projectId } = req.params;
  let rows = [];
  if (projectId === '0') {
    rows = await all(
      "SELECT * FROM kanban_cards WHERE user_id = ? AND project_id IS NULL ORDER BY status ASC, position ASC, id ASC",
      [req.userId]
    );
  } else {
    const hasAccess = await canAccessProject(Number(projectId), req);
    if (!hasAccess) return res.status(403).send("Forbidden");
    rows = await all(
      "SELECT * FROM kanban_cards WHERE project_id = ? ORDER BY status ASC, position ASC, id ASC",
      [projectId]
    );
  }
  // Parse checklist JSON
  const cardsWithChecklist = rows.map(card => ({
    ...card,
    checklist: card.checklist ? JSON.parse(card.checklist) : [],
    checklistGroups: card.checklist_groups
      ? JSON.parse(card.checklist_groups)
      : (card.checklist ? [{ id: "default", name: "Checklist", items: JSON.parse(card.checklist) }] : []),
    tags: card.tags ? JSON.parse(card.tags) : [],
    assignees: card.assignees ? JSON.parse(card.assignees) : [],
    attachments: card.attachments ? JSON.parse(card.attachments) : [],
  }));
  res.json(cardsWithChecklist);
});

app.post("/api/kanban", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { project_id, title, label, status, dueDate, description, amount, checklist, checklistGroups, position, tags, priority, assignees, attachments } = req.body;
  if (!title) return res.status(400).send("Title required");
  const checklistJson = JSON.stringify(checklist || []);
  const checklistGroupsJson = JSON.stringify(checklistGroups || []);
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  const normalizedAssignees = normalizeUsernameArray(assignees || []);
  let validAssignees = normalizedAssignees;
  const attachmentsJson = JSON.stringify(Array.isArray(attachments) ? attachments : []);
  const projectParam = project_id || null;

  if (projectParam) {
    const hasAccess = await canAccessProject(Number(projectParam), req);
    if (!hasAccess) return res.status(403).send("Forbidden");
    const [project] = await all(
      `SELECT p.members, owner.username as owner_username
       FROM projects p
       LEFT JOIN users owner ON owner.id = p.user_id
       WHERE p.id = ?`,
      [projectParam]
    );
    if (!project) return res.status(404).send("Project not found");
    const allowedAssignees = new Set([
      ...parseJsonArray(project.members).map((name) => String(name).toLowerCase()),
      String(project.owner_username || "").toLowerCase()
    ]);
    const outsideProject = normalizedAssignees.filter((name) => !allowedAssignees.has(name.toLowerCase()));
    if (outsideProject.length) {
      return res.status(400).json({
        error: "Assignees must be collaborators in this project",
        invalidAssignees: outsideProject
      });
    }
    const { resolved, missing } = await resolveExistingUsernames(normalizedAssignees);
    if (missing.length) {
      return res.status(400).json({
        error: "Some assignees do not exist",
        missingUsers: missing
      });
    }
    validAssignees = resolved;
  } else if (normalizedAssignees.length) {
    return res.status(400).send("Assignees are only allowed for project tasks");
  }

  let nextPosition = typeof position === "number" ? position : null;
  if (nextPosition === null) {
    let row;
    if (projectParam) {
      [row] = await all(
        "SELECT COALESCE(MAX(position), 0) as maxPos FROM kanban_cards WHERE status = ? AND project_id = ?",
        [status || 'todo', projectParam]
      );
    } else {
      [row] = await all(
        "SELECT COALESCE(MAX(position), 0) as maxPos FROM kanban_cards WHERE user_id = ? AND status = ? AND project_id IS NULL",
        [req.userId, status || 'todo']
      );
    }
    nextPosition = (row?.maxPos || 0) + 1;
  }
  const assigneesJson = JSON.stringify(validAssignees);
  const result = await run(
    "INSERT INTO kanban_cards (project_id, title, label, status, dueDate, description, amount, checklist, checklist_groups, tags, priority, assignees, attachments, position, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [project_id || null, title, label || null, status || 'todo', dueDate || null, description || null, amount || 0, checklistJson, checklistGroupsJson, tagsJson, priority || null, assigneesJson, attachmentsJson, nextPosition, req.userId]
  );
  const [card] = await all("SELECT * FROM kanban_cards WHERE id = ?", [result.lastID]);
  res.status(201).json({
    ...card,
    checklist: card.checklist ? JSON.parse(card.checklist) : [],
    checklistGroups: card.checklist_groups
      ? JSON.parse(card.checklist_groups)
      : (card.checklist ? [{ id: "default", name: "Checklist", items: JSON.parse(card.checklist) }] : []),
    tags: card.tags ? JSON.parse(card.tags) : [],
    assignees: card.assignees ? JSON.parse(card.assignees) : [],
    attachments: card.attachments ? JSON.parse(card.attachments) : [],
  });
});

app.put("/api/kanban/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  const existing = await all("SELECT * FROM kanban_cards WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).send("Not found");
  const card = existing[0];
  if (card.project_id) {
    const hasAccess = await canAccessProject(card.project_id, req);
    if (!hasAccess) return res.status(403).send("Forbidden");
  } else if (card.user_id !== req.userId) {
    return res.status(403).send("Forbidden");
  }
  const { title, label, status, dueDate, description, amount, checklist, checklistGroups, position, tags, priority, assignees, attachments } = req.body;
  let nextAssignees = existing[0].assignees;
  if (assignees !== undefined) {
    const normalizedAssignees = normalizeUsernameArray(assignees);
    if (!card.project_id && normalizedAssignees.length) {
      return res.status(400).send("Assignees are only allowed for project tasks");
    }
    if (card.project_id) {
      const [project] = await all(
        `SELECT p.members, owner.username as owner_username
         FROM projects p
         LEFT JOIN users owner ON owner.id = p.user_id
         WHERE p.id = ?`,
        [card.project_id]
      );
      if (!project) return res.status(404).send("Project not found");
      const allowedAssignees = new Set([
        ...parseJsonArray(project.members).map((name) => String(name).toLowerCase()),
        String(project.owner_username || "").toLowerCase()
      ]);
      const outsideProject = normalizedAssignees.filter((name) => !allowedAssignees.has(name.toLowerCase()));
      if (outsideProject.length) {
        return res.status(400).json({
          error: "Assignees must be collaborators in this project",
          invalidAssignees: outsideProject
        });
      }
    }
    const { resolved, missing } = await resolveExistingUsernames(normalizedAssignees);
    if (missing.length) {
      return res.status(400).json({
        error: "Some assignees do not exist",
        missingUsers: missing
      });
    }
    nextAssignees = JSON.stringify(resolved);
  }
  const next = {
    title: title ?? existing[0].title,
    label: label ?? existing[0].label,
    status: status ?? existing[0].status,
    dueDate: dueDate ?? existing[0].dueDate,
    description: description ?? existing[0].description,
    amount: typeof amount === "number" ? amount : existing[0].amount,
    checklist: checklist !== undefined ? JSON.stringify(checklist) : existing[0].checklist,
    checklistGroups: checklistGroups !== undefined ? JSON.stringify(checklistGroups) : existing[0].checklist_groups,
    tags: tags !== undefined ? JSON.stringify(Array.isArray(tags) ? tags : []) : existing[0].tags,
    priority: priority ?? existing[0].priority,
    assignees: nextAssignees,
    attachments: attachments !== undefined ? JSON.stringify(Array.isArray(attachments) ? attachments : []) : existing[0].attachments,
    position: typeof position === "number" ? position : existing[0].position,
  };
  await run(
    "UPDATE kanban_cards SET title = ?, label = ?, status = ?, dueDate = ?, description = ?, amount = ?, checklist = ?, checklist_groups = ?, tags = ?, priority = ?, assignees = ?, attachments = ?, position = ? WHERE id = ?",
    [next.title, next.label, next.status, next.dueDate, next.description, next.amount, next.checklist, next.checklistGroups, next.tags, next.priority, next.assignees, next.attachments, next.position, id]
  );
  const [updatedCard] = await all("SELECT * FROM kanban_cards WHERE id = ?", [id]);
  res.json({
    ...updatedCard,
    checklist: updatedCard.checklist ? JSON.parse(updatedCard.checklist) : [],
    checklistGroups: updatedCard.checklist_groups
      ? JSON.parse(updatedCard.checklist_groups)
      : (updatedCard.checklist ? [{ id: "default", name: "Checklist", items: JSON.parse(updatedCard.checklist) }] : []),
    tags: updatedCard.tags ? JSON.parse(updatedCard.tags) : [],
    assignees: updatedCard.assignees ? JSON.parse(updatedCard.assignees) : [],
    attachments: updatedCard.attachments ? JSON.parse(updatedCard.attachments) : [],
  });
});

app.delete("/api/kanban/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  const existing = await all("SELECT * FROM kanban_cards WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).send("Not found");
  const card = existing[0];
  if (card.project_id) {
    const hasAccess = await canAccessProject(card.project_id, req);
    if (!hasAccess) return res.status(403).send("Forbidden");
  } else if (card.user_id !== req.userId) {
    return res.status(403).send("Forbidden");
  }
  await run("DELETE FROM kanban_cards WHERE id = ?", [id]);
  res.status(204).send();
});

// Notes endpoints
app.get("/api/notes", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const rows = await all("SELECT id, title, content, tags, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC", [req.userId]);
  res.json(rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : []
  })));
});

app.post("/api/notes", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { title, content, tags } = req.body;
  if (!title) return res.status(400).send("Title required");
  if (!content) return res.status(400).send("Content required");
  
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  const result = await run(
    "INSERT INTO notes (title, content, tags, user_id) VALUES (?, ?, ?, ?)",
    [title, content, tagsJson, req.userId]
  );
  
  const [note] = await all("SELECT id, title, content, tags, created_at, updated_at FROM notes WHERE id = ?", [result.lastID]);
  res.status(201).json({
    ...note,
    tags: JSON.parse(note.tags)
  });
});

app.put("/api/notes/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  const existing = await all("SELECT * FROM notes WHERE id = ? AND user_id = ?", [id, req.userId]);
  if (!existing.length) return res.status(404).send("Not found");
  
  const { title, content, tags } = req.body;
  const next = {
    title: title ?? existing[0].title,
    content: content ?? existing[0].content,
    tags: tags ?? JSON.parse(existing[0].tags)
  };
  
  const tagsJson = JSON.stringify(next.tags);
  await run(
    "UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
    [next.title, next.content, tagsJson, id, req.userId]
  );
  
  const [note] = await all("SELECT id, title, content, tags, created_at, updated_at FROM notes WHERE id = ?", [id]);
  res.json({
    ...note,
    tags: JSON.parse(note.tags)
  });
});

app.delete("/api/notes/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  await run("DELETE FROM notes WHERE id = ? AND user_id = ?", [id, req.userId]);
  res.status(204).send();
});

// Vision Goals endpoints
app.get("/api/vision-goals", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const rows = await all("SELECT * FROM vision_goals WHERE user_id = ? ORDER BY id ASC", [req.userId]);
  res.json(rows);
});

app.get("/api/vision-types", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const rows = await all(
    "SELECT id, key, name, description, position, created_at FROM vision_types WHERE user_id = ? ORDER BY position ASC, id ASC",
    [req.userId]
  );
  res.json(rows);
});

app.get("/api/vision-type-preferences", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const rows = await all(
    "SELECT key, disabled FROM vision_type_preferences WHERE user_id = ?",
    [req.userId]
  );
  res.json(rows);
});

app.post("/api/vision-types", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { name, description } = req.body;
  const trimmedName = String(name || "").trim();
  const trimmedDescription = String(description || "").trim();
  if (!trimmedName || !trimmedDescription) {
    return res.status(400).json({ error: "Name and description are required" });
  }

  const baseKey = trimmedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "custom";

  const reservedKeys = new Set([
    "financial",
    "business",
    "relationships",
    "health_fitness",
    "fun_recreation",
    "personal",
    "contribution",
    "all",
    "completed"
  ]);

  let key = baseKey;
  let suffix = 2;
  while (reservedKeys.has(key)) {
    key = `${baseKey}_${suffix++}`;
  }

  while (true) {
    const [existing] = await all(
      "SELECT id FROM vision_types WHERE user_id = ? AND key = ? LIMIT 1",
      [req.userId, key]
    );
    if (!existing) break;
    key = `${baseKey}_${suffix++}`;
  }

  const [positionRow] = await all(
    "SELECT COALESCE(MAX(position), 0) as maxPos FROM vision_types WHERE user_id = ?",
    [req.userId]
  );
  const nextPosition = (positionRow?.maxPos || 0) + 1;

  const result = await run(
    "INSERT INTO vision_types (user_id, key, name, description, position) VALUES (?, ?, ?, ?, ?)",
    [req.userId, key, trimmedName, trimmedDescription, nextPosition]
  );
  const [created] = await all(
    "SELECT id, key, name, description, position, created_at FROM vision_types WHERE id = ?",
    [result.lastID]
  );
  res.status(201).json(created);
});

app.delete("/api/vision-types/:key", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { key } = req.params;
  const normalizedKey = String(key || "").trim().toLowerCase();
  if (!normalizedKey) return res.status(400).json({ error: "Type key is required" });

  const isDefaultType = DEFAULT_VISION_TYPE_KEYS.has(normalizedKey);

  if (isDefaultType) {
    await run(
      `INSERT INTO vision_type_preferences (user_id, key, disabled)
       VALUES (?, ?, 1)
       ON CONFLICT(user_id, key) DO UPDATE SET disabled = 1`,
      [req.userId, normalizedKey]
    );
  } else {
    const [existing] = await all(
      "SELECT id FROM vision_types WHERE user_id = ? AND key = ? LIMIT 1",
      [req.userId, normalizedKey]
    );
    if (!existing) return res.status(404).json({ error: "Type not found" });
  }

  await run(
    "UPDATE vision_goals SET category = 'personal' WHERE user_id = ? AND lower(category) = ?",
    [req.userId, normalizedKey]
  );

  if (!isDefaultType) {
    await run(
      "DELETE FROM vision_types WHERE user_id = ? AND key = ?",
      [req.userId, normalizedKey]
    );
  }
  res.status(204).send();
});

app.post("/api/vision-goals", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { title, description, icon, category } = req.body;
  if (!title || !description) {
    return res.status(400).send("Title and description required");
  }
  const normalizedCategory = String(category || "personal").trim().toLowerCase() || "personal";
  const result = await run(
    "INSERT INTO vision_goals (title, description, icon, category, achieved, archived, achieved_at, user_id) VALUES (?, ?, ?, ?, 0, 0, NULL, ?)",
    [title, description, icon || '✨', normalizedCategory, req.userId]
  );
  const [goal] = await all("SELECT * FROM vision_goals WHERE id = ?", [result.lastID]);
  res.status(201).json(goal);
});

async function updateVisionGoalAchieved(req, res) {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  const { achieved } = req.body;

  if (typeof achieved !== "boolean" && achieved !== 0 && achieved !== 1) {
    return res.status(400).json({ message: "Invalid achieved value" });
  }

  const achievedValue = achieved ? 1 : 0;
  await run(
    "UPDATE vision_goals SET achieved = ?, archived = ?, achieved_at = CASE WHEN ? = 1 THEN COALESCE(achieved_at, CURRENT_TIMESTAMP) ELSE NULL END WHERE id = ? AND user_id = ?",
    [achievedValue, achievedValue, achievedValue, id, req.userId]
  );

  const rows = await all(
    "SELECT * FROM vision_goals WHERE id = ? AND user_id = ?",
    [id, req.userId]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "Goal not found" });
  }

  return res.json(rows[0]);
}

app.put("/api/vision-goals/:id", updateVisionGoalAchieved);
app.patch("/api/vision-goals/:id", updateVisionGoalAchieved);
app.post("/api/vision-goals/:id/toggle", updateVisionGoalAchieved);

app.delete("/api/vision-goals/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  await run("DELETE FROM vision_goals WHERE id = ? AND user_id = ?", [id, req.userId]);
  res.status(204).send();
});

// Wishlist endpoints
app.get("/api/wishlist", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const rows = await all("SELECT * FROM wishlist_items WHERE user_id = ? ORDER BY created_at DESC", [req.userId]);
  res.json(rows);
});

app.post("/api/wishlist", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { item, price, status } = req.body;
  if (!item) {
    return res.status(400).send("Item required");
  }
  const result = await run(
    "INSERT INTO wishlist_items (item, price, status, user_id) VALUES (?, ?, ?, ?)",
    [item, price || '0 MAD', status || 'wishlist', req.userId]
  );
  const [wishlistItem] = await all("SELECT * FROM wishlist_items WHERE id = ?", [result.lastID]);
  res.status(201).json(wishlistItem);
});

app.put("/api/wishlist/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  const existing = await all("SELECT * FROM wishlist_items WHERE id = ? AND user_id = ?", [id, req.userId]);
  if (!existing.length) return res.status(404).send("Not found");
  
  const { status, purchased_date, item, price } = req.body;
  const next = {
    item: item ?? existing[0].item,
    price: price ?? existing[0].price,
    status: status ?? existing[0].status,
    purchased_date: purchased_date ?? existing[0].purchased_date
  };
  
  await run(
    "UPDATE wishlist_items SET item = ?, price = ?, status = ?, purchased_date = ? WHERE id = ? AND user_id = ?",
    [next.item, next.price, next.status, next.purchased_date, id, req.userId]
  );
  
  const [item_result] = await all("SELECT * FROM wishlist_items WHERE id = ?", [id]);
  res.json(item_result);
});

app.delete("/api/wishlist/:id", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;
  await run("DELETE FROM wishlist_items WHERE id = ? AND user_id = ?", [id, req.userId]);
  res.status(204).send();
});

// Image upload endpoint for wishlist items
app.post("/api/wishlist/:id/upload-image", upload.single("image"), async (req, res) => {
  console.log("📸 Upload image request for item:", req.params.id, "User:", req.userId);
  if (!req.userId) return res.status(401).send("Unauthorized");
  if (!req.file) {
    console.log("❌ No file uploaded");
    return res.status(400).send("No file uploaded");
  }
  console.log("✅ File received:", req.file.filename, "Size:", req.file.size);

  const { id } = req.params;
  
  try {
    // Verify item exists and belongs to user
    const existing = await all("SELECT * FROM wishlist_items WHERE id = ? AND user_id = ?", [id, req.userId]);
    if (!existing.length) {
      console.log("❌ Item not found:", id);
      return res.status(404).send("Item not found");
    }
    console.log("✅ Item found:", existing[0].item);

    // Delete old image if it exists
    if (existing[0].image_path) {
      const oldPath = path.join(uploadsDir, path.basename(existing[0].image_path));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new image path to database
    const imagePath = `/uploads/${req.file.filename}`;
    console.log("💾 Saving image path:", imagePath);
    await run(
      "UPDATE wishlist_items SET image_path = ? WHERE id = ? AND user_id = ?",
      [imagePath, id, req.userId]
    );

    const [item] = await all("SELECT * FROM wishlist_items WHERE id = ?", [id]);
    console.log("✅ Image saved successfully. Item:", item);
    res.json(item);
  } catch (err) {
    console.error("❌ Image upload error:", err);
    res.status(500).json({ error: "Image upload failed" });
  }
});

// Delete image endpoint for wishlist items
app.delete("/api/wishlist/:id/delete-image", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { id } = req.params;

  try {
    // Verify item exists and belongs to user
    const existing = await all("SELECT * FROM wishlist_items WHERE id = ? AND user_id = ?", [id, req.userId]);
    if (!existing.length) return res.status(404).send("Item not found");

    // Delete image file if it exists
    if (existing[0].image_path) {
      const imagePath = path.join(uploadsDir, path.basename(existing[0].image_path));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Clear image_path from database
    await run(
      "UPDATE wishlist_items SET image_path = NULL WHERE id = ? AND user_id = ?",
      [id, req.userId]
    );

    const [item] = await all("SELECT * FROM wishlist_items WHERE id = ?", [id]);
    res.json(item);
  } catch (err) {
    console.error("❌ Image delete error:", err);
    res.status(500).json({ error: "Image deletion failed" });
  }
});

// Monthly Budgets
app.get("/api/monthly-budgets", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const rows = await all(
    "SELECT * FROM monthly_budgets WHERE user_id = ?",
    [req.userId]
  );
  res.json(rows);
});

app.get("/api/monthly-budgets/:year/:month", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { year, month } = req.params;
  const rows = await all(
    "SELECT * FROM monthly_budgets WHERE year = ? AND month = ? AND user_id = ?",
    [year, month, req.userId]
  );
  res.json(rows.length > 0 ? rows[0] : null);
});

app.post("/api/monthly-budgets", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { year, month, budget } = req.body;
  if (!year || !month || budget === undefined) {
    return res.status(400).send("Year, month, and budget required");
  }
  
  const existing = await all(
    "SELECT * FROM monthly_budgets WHERE year = ? AND month = ? AND user_id = ?",
    [year, month, req.userId]
  );
  
  if (existing.length > 0) {
    await run(
      "UPDATE monthly_budgets SET budget = ? WHERE year = ? AND month = ? AND user_id = ?",
      [budget, year, month, req.userId]
    );
  } else {
    await run(
      "INSERT INTO monthly_budgets (year, month, budget, user_id) VALUES (?, ?, ?, ?)",
      [year, month, budget, req.userId]
    );
  }
  
  const [record] = await all(
    "SELECT * FROM monthly_budgets WHERE year = ? AND month = ? AND user_id = ?",
    [year, month, req.userId]
  );
  res.status(201).json(record);
});

// Week Planner
app.get("/api/week-plan/current", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const weekKey = getWeekStartKey();
  const rows = await all(
    "SELECT plan_data FROM week_plans WHERE week_key = ? AND user_id = ?",
    [weekKey, req.userId]
  );

  if (rows.length > 0) {
    try {
      return res.json({ weekKey, plan: JSON.parse(rows[0].plan_data) });
    } catch {
      return res.json({ weekKey, plan: [] });
    }
  }

  await run(
    "INSERT INTO week_plans (week_key, plan_data, user_id) VALUES (?, ?, ?)",
    [weekKey, JSON.stringify([]), req.userId]
  );
  return res.json({ weekKey, plan: [] });
});

app.get("/api/week-plan", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const weekKey = req.query.weekKey || getWeekStartKey();
  const rows = await all(
    "SELECT plan_data FROM week_plans WHERE week_key = ? AND user_id = ?",
    [weekKey, req.userId]
  );

  if (rows.length > 0) {
    try {
      return res.json({ weekKey, plan: JSON.parse(rows[0].plan_data) });
    } catch {
      return res.json({ weekKey, plan: [] });
    }
  }

  return res.json({ weekKey, plan: [] });
});

app.get("/api/week-plan/history", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const rows = await all(
    "SELECT week_key, created_at, updated_at FROM week_plans WHERE user_id = ? ORDER BY week_key DESC",
    [req.userId]
  );
  res.json({ currentWeekKey: getWeekStartKey(), weeks: rows });
});

app.post("/api/week-plan", async (req, res) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  const { body } = req;
  const weekKey = body && typeof body.weekKey === "string" ? body.weekKey : getWeekStartKey();
  const planPayload = body && Object.prototype.hasOwnProperty.call(body, "plan") ? body.plan : body;
  const isArrayPlan = Array.isArray(planPayload);
  const isObjectPlan = planPayload && typeof planPayload === "object" && Array.isArray(planPayload.days);

  if (!isArrayPlan && !isObjectPlan) {
    return res.status(400).send("Week plan data required");
  }

  const planData = JSON.stringify(planPayload);
  const existing = await all(
    "SELECT id FROM week_plans WHERE week_key = ? AND user_id = ?",
    [weekKey, req.userId]
  );

  if (existing.length > 0) {
    await run(
      "UPDATE week_plans SET plan_data = ?, updated_at = CURRENT_TIMESTAMP WHERE week_key = ? AND user_id = ?",
      [planData, weekKey, req.userId]
    );
  } else {
    await run(
      "INSERT INTO week_plans (week_key, plan_data, user_id) VALUES (?, ?, ?)",
      [weekKey, planData, req.userId]
    );
  }

  res.status(201).json({ weekKey, plan: planPayload });
});

// Authentication endpoints
app.post("/api/auth/signup", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const trimmedUsername = String(username).trim();
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  
  try {
    // Check if username exists
    const existing = await all("SELECT id FROM users WHERE lower(username) = lower(?)", [trimmedUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }
    
    const hashedPassword = await hashPassword(password);
    const result = await run(
      "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
      [trimmedUsername, hashedPassword, email || null]
    );
    
    const [user] = await all("SELECT id, username, email FROM users WHERE id = ?", [result.lastID]);
    res.status(201).json({ user, message: "Account created successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  
  try {
    const loginKey = authAttemptKey(req, username);
    if (isLoginRateLimited(loginKey)) {
      return res.status(429).json({ error: "Too many login attempts. Please try again later." });
    }

    const [user] = await all("SELECT * FROM users WHERE lower(username) = lower(?)", [String(username).trim()]);
    
    if (!user) {
      registerFailedLogin(loginKey);
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      registerFailedLogin(loginKey);
      return res.status(401).json({ error: "Invalid username or password" });
    }
    clearFailedLogin(loginKey);

    if (user.password && !isBcryptHash(user.password)) {
      const nextHash = await hashPassword(password);
      await run("UPDATE users SET password = ? WHERE id = ?", [nextHash, user.id]);
    }

    const session = await issueSession(user.id);
    
    // Return user without password
    res.json({ 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        themeMood: user.theme_mood,
        language: user.language,
        avatarUrl: user.avatar_url,
        created_at: user.created_at,
        joinedDate: user.joined_date || user.created_at
      },
      token: session.token,
      tokenExpiresAt: session.expiresAt,
      message: "Login successful"
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  if (!req.userId || !req.authTokenHash) return res.status(401).json({ error: "Unauthorized" });
  try {
    await revokeSessionByHash(req.authTokenHash);
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Failed to logout" });
  }
});

// Profile endpoints
app.get("/api/profile", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [user] = await all(
      "SELECT id, username, email, created_at, display_name, focus, bio, mantra, birthday, theme_mood, language, avatar_url, joined_date FROM users WHERE id = ?",
      [req.userId]
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      focus: user.focus,
      bio: user.bio,
      mantra: user.mantra,
      birthday: user.birthday,
      themeMood: user.theme_mood,
      language: user.language,
      avatarUrl: user.avatar_url,
      joinedDate: user.joined_date || user.created_at
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

app.put("/api/profile", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const {
    displayName,
    focus,
    bio,
    mantra,
    birthday,
    themeMood,
    language
  } = req.body;

  try {
    await run(
      "UPDATE users SET display_name = ?, focus = ?, bio = ?, mantra = ?, birthday = ?, theme_mood = ?, language = ? WHERE id = ?",
      [
        displayName || null,
        focus || null,
        bio || null,
        mantra || null,
        birthday || null,
        themeMood || null,
        language || null,
        req.userId
      ]
    );
    const [user] = await all(
      "SELECT id, username, email, created_at, display_name, focus, bio, mantra, birthday, theme_mood, language, avatar_url, joined_date FROM users WHERE id = ?",
      [req.userId]
    );
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      focus: user.focus,
      bio: user.bio,
      mantra: user.mantra,
      birthday: user.birthday,
      themeMood: user.theme_mood,
      language: user.language,
      avatarUrl: user.avatar_url,
      joinedDate: user.joined_date || user.created_at
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.post("/api/profile/avatar", profileUpload.single("avatar"), async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const [existing] = await all("SELECT avatar_url FROM users WHERE id = ?", [req.userId]);
    const avatarUrl = `/uploads/${req.file.filename}`;
    await run("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, req.userId]);
    if (existing?.avatar_url) {
      await removeUploadFile(existing.avatar_url);
    }
    const [user] = await all(
      "SELECT id, username, email, created_at, display_name, focus, bio, mantra, birthday, theme_mood, language, avatar_url, joined_date FROM users WHERE id = ?",
      [req.userId]
    );
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      focus: user.focus,
      bio: user.bio,
      mantra: user.mantra,
      birthday: user.birthday,
      themeMood: user.theme_mood,
      language: user.language,
      avatarUrl: user.avatar_url,
      joinedDate: user.joined_date || user.created_at
    });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

app.delete("/api/profile/avatar", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [existing] = await all("SELECT avatar_url FROM users WHERE id = ?", [req.userId]);
    await run("UPDATE users SET avatar_url = NULL WHERE id = ?", [req.userId]);
    if (existing?.avatar_url) {
      await removeUploadFile(existing.avatar_url);
    }
    const [user] = await all(
      "SELECT id, username, email, created_at, display_name, focus, bio, mantra, birthday, theme_mood, language, avatar_url, joined_date FROM users WHERE id = ?",
      [req.userId]
    );
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      focus: user.focus,
      bio: user.bio,
      mantra: user.mantra,
      birthday: user.birthday,
      themeMood: user.theme_mood,
      language: user.language,
      avatarUrl: user.avatar_url,
      joinedDate: user.joined_date || user.created_at
    });
  } catch (err) {
    console.error("Avatar delete error:", err);
    res.status(500).json({ error: "Failed to remove avatar" });
  }
});

app.post("/api/profile/password", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password required" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  try {
    const [user] = await all("SELECT password FROM users WHERE id = ?", [req.userId]);
    if (!user) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const hashed = await hashPassword(newPassword);
    await run("UPDATE users SET password = ? WHERE id = ?", [hashed, req.userId]);
    res.json({ message: "Password updated" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ error: "Failed to update password" });
  }
});

app.get("/api/users/search", async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.json([]);
  const rows = await all(
    "SELECT id, username, email FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY username ASC LIMIT 10",
    [`%${query}%`, `%${query}%`]
  );
  res.json(rows);
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

init()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Rosy Workroom API running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Listening on 0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to init database:", err);
    console.error("Stack trace:", err.stack);
    
    // Start server anyway on port to prevent 503
    // Let frontend handle errors gracefully
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`⚠️  Server started on port ${PORT} with database errors`);
      console.log("Some features may not work correctly");
    });
  });

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
});

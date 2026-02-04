const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database("rosy.db");

app.use(cors());
app.use(express.json());

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

async function init() {
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
      tag TEXT,
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
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
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
      UNIQUE(year, month)
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS vision_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT DEFAULT '✨',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item TEXT NOT NULL,
      price TEXT,
      status TEXT DEFAULT 'wishlist',
      purchased_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS week_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_key TEXT UNIQUE NOT NULL,
      plan_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

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
    ];

    await run(
      `INSERT INTO kanban_cards_new (id, project_id, title, label, status, dueDate, description, amount)
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
}

app.get("/api/tasks", async (req, res) => {
  const rows = await all("SELECT * FROM tasks ORDER BY id DESC");
  res.json(rows.map((row) => ({ ...row, done: Boolean(row.done) })));
});

app.post("/api/tasks", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).send("Title required");
  const result = await run("INSERT INTO tasks (title) VALUES (?)", [title]);
  const [task] = await all("SELECT * FROM tasks WHERE id = ?", [result.lastID]);
  res.status(201).json({ ...task, done: Boolean(task.done) });
});

app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { title, done } = req.body;
  const task = await all("SELECT * FROM tasks WHERE id = ?", [id]);
  if (!task.length) return res.status(404).send("Not found");
  const nextTitle = title ?? task[0].title;
  const nextDone = typeof done === "boolean" ? Number(done) : task[0].done;
  await run("UPDATE tasks SET title = ?, done = ? WHERE id = ?", [nextTitle, nextDone, id]);
  const [updated] = await all("SELECT * FROM tasks WHERE id = ?", [id]);
  res.json({ ...updated, done: Boolean(updated.done) });
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  await run("DELETE FROM tasks WHERE id = ?", [id]);
  res.status(204).send();
});

app.get("/api/projects", async (req, res) => {
  const rows = await all(
    `SELECT p.*, COUNT(k.id) as taskCount
     FROM projects p
     LEFT JOIN kanban_cards k ON k.project_id = p.id
     GROUP BY p.id
     ORDER BY p.id DESC`
  );
  res.json(rows);
});

app.post("/api/projects", async (req, res) => {
  const { name, tag, dueDate, description } = req.body;
  if (!name) return res.status(400).send("Name required");
  const result = await run(
    "INSERT INTO projects (name, tag, dueDate, description) VALUES (?, ?, ?, ?)",
    [name, tag || null, dueDate || null, description || null]
  );
  const [project] = await all("SELECT * FROM projects WHERE id = ?", [result.lastID]);
  res.status(201).json(project);
});

app.put("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await all("SELECT * FROM projects WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).send("Not found");
  const { name, tag, dueDate, description, taskCount } = req.body;
  const next = {
    name: name ?? existing[0].name,
    tag: tag ?? existing[0].tag,
    dueDate: dueDate ?? existing[0].dueDate,
    description: description ?? existing[0].description,
    taskCount: typeof taskCount === "number" ? taskCount : existing[0].taskCount,
  };
  await run(
    "UPDATE projects SET name = ?, tag = ?, dueDate = ?, description = ?, taskCount = ? WHERE id = ?",
    [next.name, next.tag, next.dueDate, next.description, next.taskCount, id]
  );
  const [project] = await all("SELECT * FROM projects WHERE id = ?", [id]);
  res.json(project);
});

app.delete("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  await run("DELETE FROM projects WHERE id = ?", [id]);
  res.status(204).send();
});

app.get("/api/transactions", async (req, res) => {
  const rows = await all("SELECT * FROM transactions ORDER BY date DESC, id DESC");
  res.json(rows);
});

app.post("/api/transactions", async (req, res) => {
  const { date, item, category, amount } = req.body;
  if (!date || !item || !category || typeof amount !== "number") {
    return res.status(400).send("Invalid transaction");
  }
  const result = await run(
    "INSERT INTO transactions (date, item, category, amount) VALUES (?, ?, ?, ?)",
    [date, item, category, amount]
  );
  const [tx] = await all("SELECT * FROM transactions WHERE id = ?", [result.lastID]);
  res.status(201).json(tx);
});

app.delete("/api/transactions/:id", async (req, res) => {
  const { id } = req.params;
  await run("DELETE FROM transactions WHERE id = ?", [id]);
  res.status(204).send();
});

// Kanban Cards
app.get("/api/kanban/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const rows = await all(
    "SELECT * FROM kanban_cards WHERE project_id = ? OR (project_id IS NULL AND ? = '0') ORDER BY id DESC",
    [projectId === '0' ? null : projectId, projectId]
  );
  res.json(rows);
});

app.post("/api/kanban", async (req, res) => {
  const { project_id, title, label, status, dueDate, description, amount } = req.body;
  if (!title) return res.status(400).send("Title required");
  const result = await run(
    "INSERT INTO kanban_cards (project_id, title, label, status, dueDate, description, amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [project_id || null, title, label || null, status || 'todo', dueDate || null, description || null, amount || 0]
  );
  const [card] = await all("SELECT * FROM kanban_cards WHERE id = ?", [result.lastID]);
  res.status(201).json(card);
});

app.put("/api/kanban/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await all("SELECT * FROM kanban_cards WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).send("Not found");
  const { title, label, status, dueDate, description, amount } = req.body;
  const next = {
    title: title ?? existing[0].title,
    label: label ?? existing[0].label,
    status: status ?? existing[0].status,
    dueDate: dueDate ?? existing[0].dueDate,
    description: description ?? existing[0].description,
    amount: typeof amount === "number" ? amount : existing[0].amount,
  };
  await run(
    "UPDATE kanban_cards SET title = ?, label = ?, status = ?, dueDate = ?, description = ?, amount = ? WHERE id = ?",
    [next.title, next.label, next.status, next.dueDate, next.description, next.amount, id]
  );
  const [card] = await all("SELECT * FROM kanban_cards WHERE id = ?", [id]);
  res.json(card);
});

app.delete("/api/kanban/:id", async (req, res) => {
  const { id } = req.params;
  await run("DELETE FROM kanban_cards WHERE id = ?", [id]);
  res.status(204).send();
});

// Notes endpoints
app.get("/api/notes", async (req, res) => {
  const rows = await all("SELECT id, title, content, tags, created_at, updated_at FROM notes ORDER BY updated_at DESC");
  res.json(rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : []
  })));
});

app.post("/api/notes", async (req, res) => {
  const { title, content, tags } = req.body;
  if (!title) return res.status(400).send("Title required");
  if (!content) return res.status(400).send("Content required");
  
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  const result = await run(
    "INSERT INTO notes (title, content, tags) VALUES (?, ?, ?)",
    [title, content, tagsJson]
  );
  
  const [note] = await all("SELECT id, title, content, tags, created_at, updated_at FROM notes WHERE id = ?", [result.lastID]);
  res.status(201).json({
    ...note,
    tags: JSON.parse(note.tags)
  });
});

app.put("/api/notes/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await all("SELECT * FROM notes WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).send("Not found");
  
  const { title, content, tags } = req.body;
  const next = {
    title: title ?? existing[0].title,
    content: content ?? existing[0].content,
    tags: tags ?? JSON.parse(existing[0].tags)
  };
  
  const tagsJson = JSON.stringify(next.tags);
  await run(
    "UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [next.title, next.content, tagsJson, id]
  );
  
  const [note] = await all("SELECT id, title, content, tags, created_at, updated_at FROM notes WHERE id = ?", [id]);
  res.json({
    ...note,
    tags: JSON.parse(note.tags)
  });
});

app.delete("/api/notes/:id", async (req, res) => {
  const { id } = req.params;
  await run("DELETE FROM notes WHERE id = ?", [id]);
  res.status(204).send();
});

// Vision Goals endpoints
app.get("/api/vision-goals", async (req, res) => {
  const rows = await all("SELECT * FROM vision_goals ORDER BY id ASC");
  res.json(rows);
});

app.post("/api/vision-goals", async (req, res) => {
  const { title, description, icon } = req.body;
  if (!title || !description) {
    return res.status(400).send("Title and description required");
  }
  const result = await run(
    "INSERT INTO vision_goals (title, description, icon) VALUES (?, ?, ?)",
    [title, description, icon || '✨']
  );
  const [goal] = await all("SELECT * FROM vision_goals WHERE id = ?", [result.lastID]);
  res.status(201).json(goal);
});

app.delete("/api/vision-goals/:id", async (req, res) => {
  const { id } = req.params;
  await run("DELETE FROM vision_goals WHERE id = ?", [id]);
  res.status(204).send();
});

// Wishlist endpoints
app.get("/api/wishlist", async (req, res) => {
  const rows = await all("SELECT * FROM wishlist_items ORDER BY created_at DESC");
  res.json(rows);
});

app.post("/api/wishlist", async (req, res) => {
  const { item, price, status } = req.body;
  if (!item) {
    return res.status(400).send("Item required");
  }
  const result = await run(
    "INSERT INTO wishlist_items (item, price, status) VALUES (?, ?, ?)",
    [item, price || '0 MAD', status || 'wishlist']
  );
  const [wishlistItem] = await all("SELECT * FROM wishlist_items WHERE id = ?", [result.lastID]);
  res.status(201).json(wishlistItem);
});

app.put("/api/wishlist/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await all("SELECT * FROM wishlist_items WHERE id = ?", [id]);
  if (!existing.length) return res.status(404).send("Not found");
  
  const { status, purchased_date } = req.body;
  const next = {
    status: status ?? existing[0].status,
    purchased_date: purchased_date ?? existing[0].purchased_date
  };
  
  await run(
    "UPDATE wishlist_items SET status = ?, purchased_date = ? WHERE id = ?",
    [next.status, next.purchased_date, id]
  );
  
  const [item] = await all("SELECT * FROM wishlist_items WHERE id = ?", [id]);
  res.json(item);
});

app.delete("/api/wishlist/:id", async (req, res) => {
  const { id } = req.params;
  await run("DELETE FROM wishlist_items WHERE id = ?", [id]);
  res.status(204).send();
});

// Monthly Budgets
app.get("/api/monthly-budgets/:year/:month", async (req, res) => {
  const { year, month } = req.params;
  const rows = await all(
    "SELECT * FROM monthly_budgets WHERE year = ? AND month = ?",
    [year, month]
  );
  res.json(rows.length > 0 ? rows[0] : null);
});

app.post("/api/monthly-budgets", async (req, res) => {
  const { year, month, budget } = req.body;
  if (!year || !month || budget === undefined) {
    return res.status(400).send("Year, month, and budget required");
  }
  
  const existing = await all(
    "SELECT * FROM monthly_budgets WHERE year = ? AND month = ?",
    [year, month]
  );
  
  if (existing.length > 0) {
    await run(
      "UPDATE monthly_budgets SET budget = ? WHERE year = ? AND month = ?",
      [budget, year, month]
    );
  } else {
    await run(
      "INSERT INTO monthly_budgets (year, month, budget) VALUES (?, ?, ?)",
      [year, month, budget]
    );
  }
  
  const [record] = await all(
    "SELECT * FROM monthly_budgets WHERE year = ? AND month = ?",
    [year, month]
  );
  res.status(201).json(record);
});

// Week Planner
app.get("/api/week-plan", async (req, res) => {
  const weekKey = new Date().toISOString().split('T')[0].substring(0, 7); // YYYY-MM
  const rows = await all(
    "SELECT plan_data FROM week_plans WHERE week_key = ?",
    [weekKey]
  );
  
  if (rows.length > 0) {
    try {
      res.json(JSON.parse(rows[0].plan_data));
    } catch {
      res.json([]);
    }
  } else {
    res.json([]);
  }
});

app.post("/api/week-plan", async (req, res) => {
  const { body } = req;
  if (!Array.isArray(body)) {
    return res.status(400).send("Week plan data required");
  }
  
  const weekKey = new Date().toISOString().split('T')[0].substring(0, 7); // YYYY-MM
  const planData = JSON.stringify(body);
  
  const existing = await all(
    "SELECT id FROM week_plans WHERE week_key = ?",
    [weekKey]
  );
  
  if (existing.length > 0) {
    await run(
      "UPDATE week_plans SET plan_data = ?, updated_at = CURRENT_TIMESTAMP WHERE week_key = ?",
      [planData, weekKey]
    );
  } else {
    await run(
      "INSERT INTO week_plans (week_key, plan_data) VALUES (?, ?)",
      [weekKey, planData]
    );
  }
  
  res.status(201).json(body);
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Rosy Workroom API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init database", err);
    process.exit(1);
  });

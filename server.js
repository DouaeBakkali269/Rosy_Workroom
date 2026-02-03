const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;
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

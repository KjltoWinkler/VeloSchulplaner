const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "velo-schulplaner-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const ADMIN_DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "adminpassword";

// --- MIDDLEWARES ---
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Material Web CDN & Google Fonts in admin portal
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, filePath) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
}));

// Rate limiting for auth endpoints (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // max 50 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zu viele Anmeldeversuche von dieser IP. Bitte warte einige Minuten." }
});

// --- PERSISTENCE & DATA ---
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SUBS_FILE = path.join(DATA_DIR, "substitutions.json");
const CLASSES_FILE = path.join(DATA_DIR, "classes.json");
const TIMETABLES_FILE = path.join(DATA_DIR, "timetables.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(plainText) {
  return bcrypt.hashSync(plainText, 10);
}

function verifyPassword(plainText, storedHash) {
  if (!storedHash) return false;
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
    return bcrypt.compareSync(plainText, storedHash);
  }
  // Fallback for initial legacy plaintext passwords
  return plainText === storedHash;
}

// Initial seed data
const initialAdminPasswordHash = hashPassword(ADMIN_DEFAULT_PASSWORD);
const defaultUsers = [
  {
    username: "admin",
    passwordHash: initialAdminPasswordHash,
    initialPassword: ADMIN_DEFAULT_PASSWORD,
    role: "admin",
    name: "System Administrator",
    assignedClass: ""
  },
  {
    username: "schueler9a",
    passwordHash: hashPassword("password123"),
    initialPassword: "password123",
    role: "schueler",
    name: "Max Mustermann",
    assignedClass: "9aR"
  },
  {
    username: "schueler8a",
    passwordHash: hashPassword("password123"),
    initialPassword: "password123",
    role: "schueler",
    name: "Laura Schmidt",
    assignedClass: "8aR"
  },
  {
    username: "lehrer_mueller",
    passwordHash: hashPassword("password123"),
    initialPassword: "password123",
    role: "lehrer",
    name: "Hr. Müller (MÜL)",
    assignedClass: ""
  }
];

const defaultSubstitutions = [
  {
    id: "sub-1",
    day: "Montag, 18.08.2026",
    className: "9aR",
    lesson: "1 - 2",
    subject: "Mathematik",
    art: "Vertretung",
    room: "R102",
    vertrVon: "MÜL",
    nach: "SCH",
    text: "Aufgaben im Buch S. 42 bearbeiten"
  },
  {
    id: "sub-2",
    day: "Montag, 18.08.2026",
    className: "9aR",
    lesson: "5",
    subject: "Physik",
    art: "Entfall",
    room: "---",
    vertrVon: "BEC",
    nach: "",
    text: "Hitzefrei / Entfall"
  },
  {
    id: "sub-3",
    day: "Dienstag, 19.08.2026",
    className: "9aR",
    lesson: "3 - 4",
    subject: "Englisch",
    art: "Raumänderung",
    room: "Turnhalle",
    vertrVon: "",
    nach: "",
    text: "Wasserschaden in R105"
  },
  {
    id: "sub-4",
    day: "Montag, 18.08.2026",
    className: "8aR",
    lesson: "3",
    subject: "Deutsch",
    art: "Vertretung",
    room: "R204",
    vertrVon: "WEI",
    nach: "MÜL",
    text: "Lektüre lesen"
  },
  {
    id: "sub-5",
    day: "Dienstag, 19.08.2026",
    className: "7bH",
    lesson: "2",
    subject: "Biologie",
    art: "Entfall",
    room: "---",
    vertrVon: "KLE",
    nach: "",
    text: "Entfall"
  }
];

const defaultClasses = [
  { code: "9aR", grade: 9, branch: "Realschule", teacher: "Hr. Müller (MÜL)", room: "R102" },
  { code: "8aR", grade: 8, branch: "Realschule", teacher: "Fr. Schmidt (SCH)", room: "R204" },
  { code: "7bH", grade: 7, branch: "Hauptschule", teacher: "Hr. Klein (KLE)", room: "R005" },
  { code: "10cR", grade: 10, branch: "Realschule", teacher: "Fr. Weber (WEB)", room: "R108" }
];

const defaultTimetables = {
  "9aR": {
    "Montag": {
      "2": { subject: "AL", teacher: "", room: "" },
      "3": { subject: "Englisch", teacher: "", room: "" },
      "4": { subject: "Biologie", teacher: "", room: "" },
      "5": { subject: "Mathe", teacher: "", room: "" },
      "6": { subject: "Mathe", teacher: "", room: "" }
    },
    "Dienstag": {
      "2": { subject: "Ethik", teacher: "", room: "" },
      "3": { subject: "Deutsch", teacher: "", room: "" },
      "4": { subject: "Deutsch", teacher: "", room: "" },
      "5": { subject: "Englisch", teacher: "", room: "" },
      "6": { subject: "AL", teacher: "", room: "" },
      "7": { subject: "Sport", teacher: "", room: "" },
      "8": { subject: "Sport", teacher: "", room: "" }
    },
    "Mittwoch": {
      "2": { subject: "Geschichte", teacher: "", room: "" },
      "3": { subject: "Deutsch", teacher: "", room: "" },
      "4": { subject: "Chemie", teacher: "", room: "" },
      "5": { subject: "Englisch", teacher: "", room: "" },
      "6": { subject: "Mathe", teacher: "", room: "" },
      "7": { subject: "WPU", teacher: "", room: "" },
      "8": { subject: "WPU", teacher: "", room: "" }
    },
    "Donnerstag": {
      "2": { subject: "Biologie", teacher: "", room: "" },
      "3": { subject: "Erdkunde", teacher: "", room: "" },
      "4": { subject: "Deutsch", teacher: "", room: "" },
      "5": { subject: "KL", teacher: "", room: "" },
      "6": { subject: "Geschichte", teacher: "", room: "" }
    },
    "Freitag": {
      "1": { subject: "PoWi", teacher: "", room: "" },
      "2": { subject: "Chemie", teacher: "", room: "" },
      "3": { subject: "Mathe", teacher: "", room: "" },
      "4": { subject: "Ethik", teacher: "", room: "" },
      "5": { subject: "Kunst", teacher: "", room: "" },
      "6": { subject: "Kunst", teacher: "", room: "" }
    }
  }
};

function readData(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading " + file, err);
  }
  writeData(file, fallback);
  return fallback;
}

function writeData(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing " + file, err);
  }
}

// Migrate any legacy users file if needed (ensure bcrypt hashes & initialPassword)
function ensureUserMigration() {
  const users = readData(USERS_FILE, defaultUsers);
  let changed = false;
  users.forEach((u) => {
    if (!u.passwordHash && u.password) {
      u.passwordHash = hashPassword(u.password);
      if (!u.initialPassword) u.initialPassword = u.password;
      delete u.password;
      changed = true;
    }
    if (u.assignedClass) {
      const norm = normalizeClassCode(u.assignedClass);
      if (norm !== u.assignedClass) {
        u.assignedClass = norm;
        changed = true;
      }
    }
  });
  if (changed) {
    writeData(USERS_FILE, users);
  }
}
ensureUserMigration();

// --- CLASS CODE NORMALIZATION & VALIDATION ---
// Format: <Grade><stream_letter><SchoolType> -> e.g. 9aR, 8bH, 10cR
function normalizeClassCode(input) {
  if (!input) return "";
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d+)([a-zA-Z])([a-zA-Z])$/);
  if (match) {
    const grade = match[1];
    const section = match[2].toLowerCase(); // a, b, c... always lowercase
    const type = match[3].toUpperCase();    // H, R always uppercase
    if (type === "H" || type === "R") {
      return `${grade}${section}${type}`;
    }
  }
  return trimmed;
}

function isValidClassCode(code) {
  return /^\d+[a-z][HR]$/.test(code);
}

// --- JWT AUTHENTICATION MIDDLEWARES ---
function generateToken(user) {
  return jwt.sign(
    {
      username: user.username,
      name: user.name || user.username,
      role: user.role,
      assignedClass: user.assignedClass || ""
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function extractToken(req) {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}

// Middleware: optionally attach user from token if present
function parseUser(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  });
}

// Middleware: require valid token
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentifizierung erforderlich. Bitte melde dich an." });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Sitzung ist abgelaufen oder ungültig. Bitte erneut anmelden." });
    }
    req.user = decoded;
    next();
  });
}

// Middleware: require admin role
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Zugriff verweigert. Administrator-Rechte erforderlich." });
    }
    next();
  });
}

// --- HEALTH CHECK ---
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// --- AUTH ENDPOINTS ---
const handleLogin = (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Benutzername und Passwort sind erforderlich." });
  }

  const users = readData(USERS_FILE, defaultUsers);
  const user = users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );

  if (!user || !verifyPassword(password, user.passwordHash || user.password)) {
    return res.status(401).json({ error: "Ungültige Anmeldedaten. Bitte überprüfe Benutzername und Passwort." });
  }

  // If user still had legacy unhashed password, upgrade now
  if (!user.passwordHash) {
    user.passwordHash = hashPassword(password);
    writeData(USERS_FILE, users);
  }

  const token = generateToken(user);

  return res.json({
    success: true,
    user: {
      username: user.username,
      name: user.name || user.username,
      role: user.role, // 'schueler' | 'lehrer' | 'admin'
      assignedClass: user.assignedClass || ""
    },
    token
  });
};

app.post("/api/auth/login", loginLimiter, handleLogin);
app.post("/api/login", loginLimiter, handleLogin);

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// --- SUBSTITUTIONS (FOR CLIENT APP & WEB) ---
app.get("/api/substitutions", parseUser, (req, res) => {
  const allEntries = readData(SUBS_FILE, defaultSubstitutions);
  let classFilter = (req.query.class || "").trim();
  const teacherFilter = (req.query.teacher || "").trim();

  // STRICT ACCESS CONTROL:
  // If the logged-in user is a student ('schueler'), they can ONLY see substitutions for their assigned class!
  if (req.user && req.user.role === "schueler") {
    if (req.user.assignedClass) {
      classFilter = req.user.assignedClass;
    }
  }

  let filtered = allEntries;
  if (classFilter) {
    const normalized = normalizeClassCode(classFilter);
    filtered = filtered.filter(
      (entry) =>
        entry.className.toLowerCase() === normalized.toLowerCase() ||
        entry.className.toLowerCase() === classFilter.toLowerCase()
    );
  }
  if (teacherFilter) {
    filtered = filtered.filter(
      (entry) =>
        entry.vertrVon?.toLowerCase() === teacherFilter.toLowerCase() ||
        entry.nach?.toLowerCase() === teacherFilter.toLowerCase()
    );
  }

  res.json({
    updatedAt: Date.now(),
    entries: filtered
  });
});

app.get("/api/classes", (req, res) => {
  const allEntries = readData(SUBS_FILE, defaultSubstitutions);
  const users = readData(USERS_FILE, defaultUsers);
  const classList = readData(CLASSES_FILE, defaultClasses);

  const classes = new Set();
  classList.forEach(c => { if (c.code) classes.add(normalizeClassCode(c.code)); });
  allEntries.forEach((e) => { if (e.className) classes.add(normalizeClassCode(e.className)); });
  users.forEach((u) => { if (u.assignedClass) classes.add(normalizeClassCode(u.assignedClass)); });

  res.json(Array.from(classes).filter(Boolean).sort());
});

// --- ADMIN USER MANAGEMENT (PROTECTED) ---
app.get("/api/admin/users", requireAdmin, (req, res) => {
  const users = readData(USERS_FILE, defaultUsers);
  res.json(
    users.map((u) => ({
      username: u.username,
      name: u.name || u.username,
      role: u.role,
      assignedClass: u.assignedClass || "",
      initialPassword: u.initialPassword || "••••••••"
    }))
  );
});

app.post("/api/admin/users", requireAdmin, (req, res) => {
  const { username, password, role, name, assignedClass } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Benutzername, Passwort und Rolle sind erforderlich." });
  }

  const cleanRole = role.toLowerCase().trim();
  if (!["schueler", "lehrer", "admin"].includes(cleanRole)) {
    return res.status(400).json({ error: "Ungültige Rolle. Erlaubt: schueler, lehrer, admin" });
  }

  let cleanClass = "";
  if (cleanRole === "schueler") {
    if (assignedClass) {
      cleanClass = normalizeClassCode(assignedClass);
      if (!isValidClassCode(cleanClass)) {
        return res.status(400).json({
          error: `Ungültiges Klassenkürzel "${assignedClass}". Format: [Klassenstufe][a/b/c...][H/R], z. B. 9aR, 8bH.`
        });
      }
    }
  } else if (assignedClass) {
    cleanClass = normalizeClassCode(assignedClass);
  }

  const users = readData(USERS_FILE, defaultUsers);
  if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    return res.status(400).json({ error: `Der Benutzername "${username}" existiert bereits.` });
  }

  const newUser = {
    username: username.trim(),
    passwordHash: hashPassword(password.trim()),
    initialPassword: password.trim(), // Stored for admin credential handout/export
    role: cleanRole,
    name: name ? name.trim() : username.trim(),
    assignedClass: cleanClass
  };

  users.push(newUser);
  writeData(USERS_FILE, users);

  res.status(201).json({
    success: true,
    user: {
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      assignedClass: newUser.assignedClass,
      initialPassword: newUser.initialPassword
    }
  });
});

app.put("/api/admin/users/:username", requireAdmin, (req, res) => {
  const usernameParam = req.params.username.toLowerCase();
  const { password, role, name, assignedClass } = req.body;

  const users = readData(USERS_FILE, defaultUsers);
  const userIdx = users.findIndex((u) => u.username.toLowerCase() === usernameParam);

  if (userIdx === -1) {
    return res.status(404).json({ error: "Benutzer nicht gefunden." });
  }

  if (password) {
    users[userIdx].passwordHash = hashPassword(password.trim());
    users[userIdx].initialPassword = password.trim();
  }
  if (name) users[userIdx].name = name.trim();
  if (role) {
    const cleanRole = role.toLowerCase().trim();
    if (["schueler", "lehrer", "admin"].includes(cleanRole)) {
      users[userIdx].role = cleanRole;
    }
  }
  if (assignedClass !== undefined) {
    const cleanClass = normalizeClassCode(assignedClass);
    if (users[userIdx].role === "schueler" && cleanClass && !isValidClassCode(cleanClass)) {
      return res.status(400).json({
        error: `Ungültiges Klassenkürzel "${assignedClass}". Format: z. B. 9aR, 8bH.`
      });
    }
    users[userIdx].assignedClass = cleanClass;
  }

  writeData(USERS_FILE, users);
  res.json({
    success: true,
    user: {
      username: users[userIdx].username,
      name: users[userIdx].name,
      role: users[userIdx].role,
      assignedClass: users[userIdx].assignedClass,
      initialPassword: users[userIdx].initialPassword
    }
  });
});

app.delete("/api/admin/users/:username", requireAdmin, (req, res) => {
  const usernameParam = req.params.username.toLowerCase();
  let users = readData(USERS_FILE, defaultUsers);

  if (usernameParam === "admin") {
    return res.status(400).json({ error: "Der Standard-Administrator kann nicht gelöscht werden." });
  }

  const initialLength = users.length;
  users = users.filter((u) => u.username.toLowerCase() !== usernameParam);

  if (users.length === initialLength) {
    return res.status(404).json({ error: "Benutzer nicht gefunden." });
  }

  writeData(USERS_FILE, users);
  res.json({ success: true, message: "Benutzer erfolgreich gelöscht." });
});

// --- ADMIN SUBSTITUTION MANAGEMENT (PROTECTED) ---
app.post("/api/admin/substitutions", requireAdmin, (req, res) => {
  const { day, className, lesson, subject, art, room, vertrVon, nach, text } = req.body;

  if (!day || !className || !lesson || !subject) {
    return res.status(400).json({ error: "Tag, Klasse, Stunde und Fach sind Pflichtfelder." });
  }

  const cleanClass = normalizeClassCode(className);
  const subs = readData(SUBS_FILE, defaultSubstitutions);

  const newEntry = {
    id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    day: day.trim(),
    className: cleanClass,
    lesson: lesson.trim(),
    subject: subject.trim(),
    art: (art || "Vertretung").trim(),
    room: (room || "---").trim(),
    vertrVon: (vertrVon || "").trim(),
    nach: (nach || "").trim(),
    text: (text || "").trim()
  };

  subs.unshift(newEntry);
  writeData(SUBS_FILE, subs);

  res.status(201).json({ success: true, entry: newEntry });
});

app.delete("/api/admin/substitutions/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  let subs = readData(SUBS_FILE, defaultSubstitutions);

  const initialLength = subs.length;
  subs = subs.filter((s) => s.id !== id);

  if (subs.length === initialLength) {
    return res.status(404).json({ error: "Eintrag nicht gefunden." });
  }

  writeData(SUBS_FILE, subs);
  res.json({ success: true, message: "Eintrag gelöscht." });
});

app.post("/api/admin/substitutions/clear", requireAdmin, (req, res) => {
  writeData(SUBS_FILE, []);
  res.json({ success: true, message: "Alle Vertretungen gelöscht." });
});

// --- ADMIN CLASS MANAGEMENT ---
app.get("/api/admin/classes", requireAdmin, (req, res) => {
  const classes = readData(CLASSES_FILE, defaultClasses);
  const users = readData(USERS_FILE, defaultUsers);

  const result = classes.map(c => {
    const studentCount = users.filter(u => 
      u.role === "schueler" && 
      u.assignedClass && 
      u.assignedClass.toLowerCase() === c.code.toLowerCase()
    ).length;
    return { ...c, studentCount };
  });

  res.json(result);
});

app.post("/api/admin/classes", requireAdmin, (req, res) => {
  const { code, grade, branch, teacher, room } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Klassenkürzel ist erforderlich." });
  }
  const cleanCode = normalizeClassCode(code);
  if (!isValidClassCode(cleanCode)) {
    return res.status(400).json({ error: `Ungültiges Klassenkürzel "${code}". Erlaubt: z. B. 9aR, 8bH.` });
  }

  const classes = readData(CLASSES_FILE, defaultClasses);
  if (classes.some(c => c.code.toLowerCase() === cleanCode.toLowerCase())) {
    return res.status(400).json({ error: `Klasse "${cleanCode}" existiert bereits.` });
  }

  const newClass = {
    code: cleanCode,
    grade: Number(grade) || parseInt(cleanCode, 10) || 0,
    branch: branch || (cleanCode.endsWith("R") ? "Realschule" : (cleanCode.endsWith("H") ? "Hauptschule" : "Gymnasium")),
    teacher: teacher ? teacher.trim() : "",
    room: room ? room.trim() : ""
  };

  classes.push(newClass);
  writeData(CLASSES_FILE, classes);
  res.status(201).json({ success: true, classItem: newClass });
});

app.put("/api/admin/classes/:code", requireAdmin, (req, res) => {
  const codeParam = req.params.code.toLowerCase();
  const { teacher, room, branch, grade } = req.body;

  const classes = readData(CLASSES_FILE, defaultClasses);
  const idx = classes.findIndex(c => c.code.toLowerCase() === codeParam);
  if (idx === -1) {
    return res.status(404).json({ error: "Klasse nicht gefunden." });
  }

  if (teacher !== undefined) classes[idx].teacher = teacher.trim();
  if (room !== undefined) classes[idx].room = room.trim();
  if (branch !== undefined) classes[idx].branch = branch.trim();
  if (grade !== undefined) classes[idx].grade = Number(grade);

  writeData(CLASSES_FILE, classes);
  res.json({ success: true, classItem: classes[idx] });
});

app.delete("/api/admin/classes/:code", requireAdmin, (req, res) => {
  const codeParam = req.params.code.toLowerCase();
  let classes = readData(CLASSES_FILE, defaultClasses);
  const initialLength = classes.length;
  classes = classes.filter(c => c.code.toLowerCase() !== codeParam);

  if (classes.length === initialLength) {
    return res.status(404).json({ error: "Klasse nicht gefunden." });
  }

  writeData(CLASSES_FILE, classes);
  res.json({ success: true, message: "Klasse gelöscht." });
});

// --- CLASS STUDENTS MANAGEMENT ---
app.get("/api/admin/classes/:code/students", requireAdmin, (req, res) => {
  const codeParam = normalizeClassCode(req.params.code).toLowerCase();
  const users = readData(USERS_FILE, defaultUsers);
  const students = users
    .filter(u => u.role === "schueler" && normalizeClassCode(u.assignedClass || "").toLowerCase() === codeParam)
    .map(u => ({
      username: u.username,
      name: u.name || u.username,
      role: u.role,
      assignedClass: u.assignedClass || "",
      initialPassword: u.initialPassword || ""
    }));
  res.json(students);
});

app.post("/api/admin/classes/:code/students", requireAdmin, (req, res) => {
  const codeParam = normalizeClassCode(req.params.code);
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: "Benutzername erforderlich." });
  }

  const users = readData(USERS_FILE, defaultUsers);
  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "Benutzer nicht gefunden." });
  }

  user.assignedClass = codeParam;
  if (user.role !== "schueler" && user.role !== "admin") {
    user.role = "schueler";
  }

  writeData(USERS_FILE, users);
  res.json({ success: true, message: `Schüler "${user.name || user.username}" zu Klasse ${codeParam} hinzugefügt.` });
});

app.delete("/api/admin/classes/:code/students/:username", requireAdmin, (req, res) => {
  const usernameParam = req.params.username.toLowerCase();
  const users = readData(USERS_FILE, defaultUsers);
  const user = users.find(u => u.username.toLowerCase() === usernameParam);
  if (!user) {
    return res.status(404).json({ error: "Benutzer nicht gefunden." });
  }

  user.assignedClass = "";
  writeData(USERS_FILE, users);
  res.json({ success: true, message: `Schüler "${user.name || user.username}" aus der Klasse entfernt.` });
});

// --- TIMETABLES (STUNDENPLÄNE) ---
app.get("/api/timetables/:classCode", (req, res) => {
  const code = req.params.classCode;
  const timetables = readData(TIMETABLES_FILE, defaultTimetables);
  const schedule = timetables[code] || timetables[normalizeClassCode(code)] || {};
  res.json(schedule);
});

app.put("/api/admin/timetables/:classCode", requireAdmin, (req, res) => {
  const code = normalizeClassCode(req.params.classCode);
  const schedule = req.body; // { "Montag": { "1": { subject, teacher, room }, ... } }

  const timetables = readData(TIMETABLES_FILE, defaultTimetables);
  timetables[code] = schedule;
  writeData(TIMETABLES_FILE, timetables);
  res.json({ success: true, message: "Stundenplan gespeichert.", schedule });
});

app.get("/api/admin/timetables", requireAdmin, (req, res) => {
  const timetables = readData(TIMETABLES_FILE, defaultTimetables);
  res.json(timetables);
});

app.post("/api/admin/timetables/import", requireAdmin, (req, res) => {
  let { timetables: incomingMulti, classCode, schedule, rawData } = req.body || {};

  let dataToImport = {};

  if (incomingMulti && typeof incomingMulti === "object") {
    dataToImport = incomingMulti;
  } else if (rawData && typeof rawData === "object") {
    dataToImport = rawData;
  } else if (classCode && schedule && typeof schedule === "object") {
    dataToImport[normalizeClassCode(classCode)] = schedule;
  } else if (req.body && typeof req.body === "object") {
    const keys = Object.keys(req.body);
    const dayNames = ["montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"];
    const isSingleClassSchedule = keys.some(k => dayNames.includes(k.toLowerCase()));

    if (isSingleClassSchedule) {
      const targetClass = classCode ? normalizeClassCode(classCode) : (req.query.classCode ? normalizeClassCode(req.query.classCode) : "");
      if (!targetClass) {
        return res.status(400).json({ error: "Bitte gib eine Zielklasse an (z. B. 9aR) für diesen Stundenplan." });
      }
      dataToImport[targetClass] = req.body;
    } else {
      dataToImport = req.body;
    }
  }

  const existingTimetables = readData(TIMETABLES_FILE, defaultTimetables);
  const existingClasses = readData(CLASSES_FILE, defaultClasses);
  let importedClasses = [];
  let totalLessons = 0;
  let classesCreated = 0;

  for (const [rawKey, sched] of Object.entries(dataToImport)) {
    if (!sched || typeof sched !== "object") continue;
    const normCode = normalizeClassCode(rawKey);
    if (!normCode) continue;

    existingTimetables[normCode] = sched;
    importedClasses.push(normCode);

    for (const day of Object.values(sched)) {
      if (day && typeof day === "object") {
        totalLessons += Object.keys(day).length;
      }
    }

    const classExists = existingClasses.some(c => c.code.toLowerCase() === normCode.toLowerCase());
    if (!classExists) {
      const grade = parseInt(normCode, 10) || 5;
      const branchChar = normCode.slice(-1).toUpperCase();
      let branch = "Realschule";
      if (branchChar === "H") branch = "Hauptschule";
      else if (branchChar === "G") branch = "Gymnasium";

      existingClasses.push({
        code: normCode,
        grade,
        branch,
        teacher: "",
        room: ""
      });
      classesCreated++;
    }
  }

  if (importedClasses.length === 0) {
    return res.status(400).json({ error: "Keine gültigen Stundenplandaten im JSON gefunden." });
  }

  writeData(TIMETABLES_FILE, existingTimetables);
  if (classesCreated > 0) {
    writeData(CLASSES_FILE, existingClasses);
  }

  return res.json({
    success: true,
    message: `${importedClasses.length} Stundenplan/Stundenpläne erfolgreich importiert (${totalLessons} Unterrichtsstunden).`,
    importedClasses,
    totalLessons,
    classesCreated
  });
});

// --- STUDENT DASHBOARD (SCHÜLERPORTAL) ---
app.get("/api/student/dashboard", requireAuth, (req, res) => {
  if (req.user.role !== "schueler") {
    return res.status(403).json({ error: "Nur für Schülerkonten zugänglich." });
  }

  const assignedClass = req.user.assignedClass || "";
  const allSubs = readData(SUBS_FILE, defaultSubstitutions);
  const timetables = readData(TIMETABLES_FILE, defaultTimetables);
  const classes = readData(CLASSES_FILE, defaultClasses);

  const classInfo = classes.find(c => c.code.toLowerCase() === assignedClass.toLowerCase()) || {
    code: assignedClass,
    grade: parseInt(assignedClass, 10) || 0,
    branch: "",
    teacher: "",
    room: ""
  };
  const classTimetable = timetables[assignedClass] || timetables[normalizeClassCode(assignedClass)] || {};
  
  const classSubs = allSubs.filter(s => 
    s.className && (s.className.toLowerCase() === assignedClass.toLowerCase() || s.className.toLowerCase() === normalizeClassCode(assignedClass).toLowerCase())
  );

  res.json({
    user: {
      username: req.user.username,
      name: req.user.name || req.user.username,
      role: req.user.role,
      assignedClass
    },
    classInfo,
    timetable: classTimetable,
    substitutions: classSubs
  });
});

// SPA Fallback for client-side routing (e.g. /benutzer, /vertretungsplaene, /klassen, /login)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Velo.Schulplaner Modern & Secure Server running!`);
  console.log(`  Web Admin: http://localhost:${PORT}`);
  console.log(`  API:       http://localhost:${PORT}/api`);
  console.log(`  Health:    http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

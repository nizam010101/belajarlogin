const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const db = require("../config/database"); // Import database connection

// cek user login
const cekLogin = (req, res, next) => {
  // jika sudah login
  if (req.session.user) {
    return next();
  } else {
    res.redirect("/login");
  }
};

// tampilan halaman login
router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.render("login");
});

// proses login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Cek user di database
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );

    if (rows.length > 0) {
      req.session.user = rows[0];
      return res.redirect("/");
    } else {
      res.render("login", { error: "Username atau password salah" });
    }
  } catch (error) {
    console.error(error);
    res.render("login", { error: "Terjadi kesalahan pada server" });
  }
});

// proses logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// konfigurasi multer untuk upload file
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// --- DATABASE HELPERS ---

const sanitizeKey = (key) => {
  if (!key) return "unknown_column";
  return (
    key
      .toString()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase() || "col"
  );
};

const createTableIfNotExists = async (tableName, dataSample) => {
  if (!dataSample) return;
  const keys = Object.keys(dataSample);

  // Handle duplicate column names
  const usedKeys = new Set();
  const columns = keys
    .map((key) => {
      let cleanKey = sanitizeKey(key);
      let finalKey = cleanKey;
      let counter = 1;
      while (usedKeys.has(finalKey)) {
        finalKey = `${cleanKey}_${counter}`;
        counter++;
      }
      usedKeys.add(finalKey);
      return `${finalKey} TEXT`;
    })
    .join(", ");

  const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (id INT AUTO_INCREMENT PRIMARY KEY, ${columns})`;
  console.log("Creating table query:", createTableQuery);
  await db.query(createTableQuery);
};

const saveToDatabase = async (tableName, data) => {
  if (data.length === 0) return { inserted: 0, skipped: 0 };
  await createTableIfNotExists(tableName, data[0]);

  // Re-map keys to match the sanitized column names logic
  const keys = Object.keys(data[0]);
  const usedKeys = new Set();
  const columnList = [];

  keys.forEach((key) => {
    let cleanKey = sanitizeKey(key);
    let finalKey = cleanKey;
    let counter = 1;
    while (usedKeys.has(finalKey)) {
      finalKey = `${cleanKey}_${counter}`;
      counter++;
    }
    usedKeys.add(finalKey);
    columnList.push(finalKey);
  });

  const columns = columnList.join(", ");
  const placeholders = keys.map(() => "?").join(", ");
  const insertQuery = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

  // Query untuk cek duplikat (cek semua kolom)
  const checkQuery =
    `SELECT id FROM ${tableName} WHERE ` +
    columnList.map((col) => `${col} = ?`).join(" AND ") +
    ` LIMIT 1`;

  let insertedCount = 0;
  let skippedCount = 0;

  for (const item of data) {
    const values = keys.map((key) => {
      let val = item[key];
      if (val === undefined || val === null) return "";
      return val;
    });

    try {
      // Cek apakah data sudah ada
      const [existing] = await db.query(checkQuery, values);

      if (existing.length > 0) {
        skippedCount++;
      } else {
        await db.query(insertQuery, values);
        insertedCount++;
      }
    } catch (err) {
      console.error("Failed to process row:", err.message);
    }
  }

  return { inserted: insertedCount, skipped: skippedCount };
};

// --- HANDLERS ---

const renderPage = async (req, res, viewName, pageTitle, tableName) => {
  let data = [];
  try {
    const [rows] = await db.query(`SELECT * FROM ${tableName}`);
    data = rows;
  } catch (error) {
    // Table doesn't exist yet, ignore
  }
  res.render(viewName, {
    pageTitle,
    data,
    message: null,
    status: null,
    tableName,
  });
};

const handelExcelUpload = async (req, res, viewName, pageTitle, tableName) => {
  if (!req.file) {
    return renderPage(req, res, viewName, pageTitle, tableName);
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("File Excel tidak memiliki sheet/halaman.");
    }

    const sheet_name = workbook.SheetNames[0];
    // Use raw: false to get formatted strings, but defval: "" ensures empty cells are empty strings
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name], {
      defval: "",
    });

    fs.unlinkSync(req.file.path);

    let message = "";
    if (tableName) {
      const stats = await saveToDatabase(tableName, data);
      message = `Berhasil! ${stats.inserted} data baru disimpan. ${stats.skipped} data duplikat diabaikan.`;
    } else {
      message = "Berhasil upload " + data.length + " data (Preview Only)!";
    }

    // Fetch updated data
    const [rows] = await db.query(`SELECT * FROM ${tableName}`);

    res.render(viewName, {
      pageTitle: pageTitle,
      message: message,
      status: "success",
      data: rows,
      tableName: tableName,
    });
  } catch (error) {
    console.error(error);
    // Fetch existing data to show even if upload failed
    let existingData = [];
    try {
      const [rows] = await db.query(`SELECT * FROM ${tableName}`);
      existingData = rows;
    } catch (e) {}

    res.render(viewName, {
      pageTitle: pageTitle,
      message: "Terjadi kesalahan: " + error.message,
      status: "error",
      data: existingData,
      tableName: tableName,
    });
  }
};

// --- ROUTES ---

router.get("/", cekLogin, (req, res) => {
  res.render("index", { pageTitle: "Dashboard" });
});

// Helper to create route pair
const createMenuRoutes = (path, view, title, table) => {
  router.get(path, cekLogin, (req, res) =>
    renderPage(req, res, view, title, table)
  );
  router.post(path, cekLogin, upload.single("excelFile"), (req, res) =>
    handelExcelUpload(req, res, view, title, table)
  );
};

createMenuRoutes(
  "/masterproduk",
  "masterproduk",
  "Master Produk",
  "master_produk"
);
createMenuRoutes(
  "/uploadpesanan",
  "uploadpesanan",
  "Upload Pesanan",
  "upload_pesanan"
);
createMenuRoutes("/instok", "instok", "In Stok", "in_stok");
createMenuRoutes(
  "/pengembalian",
  "pengembalian",
  "Pengembalian",
  "pengembalian"
);
createMenuRoutes(
  "/pesananditerima",
  "pesananditerima",
  "Pesanan Diterima",
  "pesanan_diterima"
);
createMenuRoutes(
  "/returditerima",
  "returditerma",
  "Retur Diterima",
  "retur_diterima"
);
createMenuRoutes("/soulang", "soUlang", "SO Ulang", "so_ulang");
createMenuRoutes("/gagalkirim", "gagalkirim", "Gagal Kirim", "gagal_kirim");

// Route Clear Data
router.get("/clear/:tableName", cekLogin, async (req, res) => {
  const { tableName } = req.params;
  const allowedTables = [
    "master_produk",
    "upload_pesanan",
    "in_stok",
    "pengembalian",
    "pesanan_diterima",
    "retur_diterima",
    "so_ulang",
    "gagal_kirim",
  ];

  // Map table names to redirect paths
  const redirectMap = {
    master_produk: "/masterproduk",
    upload_pesanan: "/uploadpesanan",
    in_stok: "/instok",
    pengembalian: "/pengembalian",
    pesanan_diterima: "/pesananditerima",
    retur_diterima: "/returditerima",
    so_ulang: "/soulang",
    gagal_kirim: "/gagalkirim",
  };

  if (allowedTables.includes(tableName)) {
    try {
      await db.query(`TRUNCATE TABLE ${tableName}`);
    } catch (e) {
      console.log(e);
    }
  }

  const redirectPath = redirectMap[tableName] || "/";
  res.redirect(redirectPath);
});

// --- ROUTE DEBUG (Hapus nanti setelah fix) ---
router.get("/cek-db", async (req, res) => {
  try {
    // 1. Cek Koneksi
    const [users] = await db.query("SELECT * FROM users");

    // 2. Tampilkan Hasil
    res.json({
      status: "Koneksi Berhasil!",
      jumlah_user: users.length,
      data_user: users, // Ini akan menampilkan username & password di browser
    });
  } catch (error) {
    res.status(500).json({
      status: "Koneksi Gagal",
      pesan_error: error.message,
      detail: error,
    });
  }
});

module.exports = router;

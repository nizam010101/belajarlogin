const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
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
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (rows.length > 0) {
      // Compare password dengan hash
      const isPasswordValid = await bcrypt.compare(password, rows[0].password);

      if (isPasswordValid) {
        req.session.user = rows[0];
        return res.redirect("/");
      } else {
        res.render("login", { error: "Username atau password salah" });
      }
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

// Filter file type dan size limit
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File harus berformat Excel (.xls atau .xlsx)"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

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
      // Escape column names with backticks for SQL safety
      return `\`${finalKey}\` TEXT`;
    })
    .join(", ");

  // Use backticks to safely escape table name and prevent SQL injection warnings
  const createTableQuery = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (id INT AUTO_INCREMENT PRIMARY KEY, ${columns})`;
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

  // Use backticks to escape table and column names safely
  const insertQuery = `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`;

  // Query cek duplikat berdasarkan 4 kolom pertama saja (lebih efisien)
  const uniqueColumns = columnList.slice(0, Math.min(4, columnList.length));

  // Build safe check query with proper escaping
  const whereConditions = uniqueColumns.map((col) => `\`${col}\` = ?`).join(" AND ");
  const checkQuery = `SELECT id FROM \`${tableName}\` WHERE ${whereConditions} LIMIT 1`;

  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const item of data) {
    // Sanitize and validate all values before processing
    const values = keys.map((key) => {
      let val = item[key];
      // Convert to empty string if null/undefined
      if (val === undefined || val === null) return "";
      // Explicitly convert to string and trim - safe for parameterized query
      return String(val).trim();
    });

    // Additional validation: skip row if all values are empty
    const hasNonEmptyValue = values.some(val => val !== "");
    if (!hasNonEmptyValue) {
      skippedCount++;
      continue;
    }

    try {
      // Cek duplikat hanya pada kolom unik (berdasarkan jumlah uniqueColumns)
      const uniqueValues = values.slice(0, uniqueColumns.length);

      // Validate that we have values to check
      if (uniqueValues.length === 0) {
        skippedCount++;
        continue;
      }

      // Execute parameterized query to check for duplicates (SQL injection safe)
      const [existing] = await db.query(checkQuery, uniqueValues);

      if (existing && existing.length > 0) {
        // Duplicate found, skip insertion
        skippedCount++;
      } else {
        // No duplicate found, safe to insert with parameterized query
        // Note: insertQuery uses placeholders (?), values are sanitized strings
        await db.query(insertQuery, values);
        insertedCount++;
      }
    } catch (err) {
      errorCount++;
      // Log specific error types for debugging
      if (err.code === 'ER_DUP_ENTRY') {
        console.error("Duplicate entry detected:", err.message);
        skippedCount++;
      } else if (err.code === 'ER_BAD_FIELD_ERROR') {
        console.error("Bad field error:", err.message);
      } else {
        console.error("Failed to process row:", err.message);
      }
      // Continue processing other rows
    }
  }

  return { inserted: insertedCount, skipped: skippedCount, errors: errorCount };
};

// --- HANDLERS ---

const renderPage = async (req, res, viewName, pageTitle, tableName) => {
  let data = [];

  if (!tableName) {
    return res.render(viewName, {
      pageTitle: pageTitle,
      data: data,
      message: null,
      status: null,
      tableName: tableName,
    });
  }

  try {
    const result = await db.query(`SELECT * FROM \`${tableName}\``);
    // Handle both array destructuring and direct result
    if (Array.isArray(result) && result.length > 0) {
      data = Array.isArray(result[0]) ? result[0] : result;
    } else if (Array.isArray(result)) {
      data = result;
    }
  } catch (error) {
    // Table doesn't exist yet or other database error
    console.log(`Table ${tableName} error:`, error.message);
    data = [];
  }

  res.render(viewName, {
    pageTitle: pageTitle,
    data: data,
    message: null,
    status: null,
    tableName: tableName,
  });
};

const handleExcelUpload = async (req, res, viewName, pageTitle, tableName) => {
  if (!req.file) {
    return renderPage(req, res, viewName, pageTitle, tableName);
  }

  let uploadedFilePath = req.file.path;

  try {
    const workbook = xlsx.readFile(uploadedFilePath);
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("File Excel tidak memiliki sheet/halaman.");
    }

    const sheet_name = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name], {
      defval: "",
    });

    // Validasi: file kosong atau tidak ada data
    if (!data || data.length === 0) {
      throw new Error(
        "File Excel tidak memiliki data. Pastikan ada baris data setelah header."
      );
    }

    // Validasi: cek apakah semua row kosong
    const hasValidData = data.some((row) => {
      return Object.values(row).some(
        (val) => val !== "" && val !== null && val !== undefined
      );
    });

    if (!hasValidData) {
      throw new Error(
        "Semua baris data kosong. Pastikan file Excel berisi data yang valid."
      );
    }

    // Hapus file setelah berhasil dibaca
    fs.unlinkSync(uploadedFilePath);

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
    console.error("Upload error:", error);

    // Cleanup file jika masih ada
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (cleanupErr) {
        console.error("Failed to cleanup file:", cleanupErr);
      }
    }

    // Fetch existing data to show even if upload failed
    let existingData = [];
    try {
      const [rows] = await db.query(`SELECT * FROM ${tableName}`);
      existingData = rows;
    } catch (e) {
      console.error("Error fetching existing data:", e);
    }

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
    handleExcelUpload(req, res, view, title, table)
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

module.exports = router;

const db = require("./config/database");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

async function setupUsers() {
  try {
    // 1. Buat Tabel Users
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `;
    await db.query(createTableQuery);
    console.log("✅ Tabel users berhasil dibuat/diperiksa.");

    // 2. Cek apakah admin sudah ada
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [
      "admin",
    ]);

    if (rows.length === 0) {
      // 3. Hash password sebelum disimpan
      const hashedPassword = await bcrypt.hash("password", SALT_ROUNDS);

      await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [
        "admin",
        hashedPassword,
      ]);
      console.log('✅ User "admin" berhasil dibuat (Password: password).');
      console.log('ℹ️  Password sudah di-hash dengan bcrypt untuk keamanan.');
    } else {
      console.log('ℹ️ User "admin" sudah ada, tidak perlu dibuat ulang.');
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Gagal setup users:", error);
    process.exit(1);
  }
}

setupUsers();

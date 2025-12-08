const db = require("./config/database");

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
      // 3. Jika belum ada, buat user admin default
      // Note: Untuk keamanan di production, password sebaiknya di-hash (misal pakai bcrypt)
      // Tapi untuk belajar, kita pakai plain text dulu sesuai request.
      await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [
        "admin",
        "password",
      ]);
      console.log('✅ User "admin" berhasil dibuat (Password: password).');
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

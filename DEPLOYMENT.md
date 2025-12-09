# 🚀 Panduan Deployment ke Hostinger

Panduan lengkap untuk deploy aplikasi **BelajarLogin** ke Hostinger production environment.

---

## 📋 Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- [ ] Akun Hostinger aktif dengan Node.js hosting
- [ ] Akses ke Hostinger Control Panel (hPanel)
- [ ] Git terinstall di local (opsional, untuk deployment via git)
- [ ] Database MySQL sudah dibuat di Hostinger

---

## 🔧 Persiapan di Hostinger

### 1. Setup Database MySQL

1. Login ke **Hostinger Control Panel** (hPanel)
2. Cari dan klik **Databases** > **MySQL Databases**
3. Klik **Create new database**
4. Isi informasi database:
   - **Database Name**: `belajarlogin` (atau nama pilihan Anda)
   - **Database User**: Buat user baru atau gunakan yang sudah ada
   - **Password**: Buat password yang kuat
5. Klik **Create**
6. **CATAT** informasi berikut (Anda akan membutuhkannya nanti):
   ```
   DB_HOST: localhost (biasanya)
   DB_USER: u123456789_namauser (contoh format)
   DB_PASSWORD: password_yang_Anda_buat
   DB_NAME: u123456789_belajarlogin (contoh format)
   ```

### 2. Setup Node.js Application

1. Di hPanel, cari dan klik **Advanced** > **Node.js**
2. Klik **Create Application**
3. Pilih **Node.js version**: `18.x` atau `20.x` (jangan pilih versi terlalu tinggi)
4. **Application root**: Pilih atau buat folder untuk aplikasi (misal: `/public_html/belajarlogin`)
5. **Application URL**: Pilih domain atau subdomain Anda
6. **Application startup file**: `app.js`
7. Klik **Create**

---

## 📤 Upload Aplikasi

### Method 1: Via File Manager (Recommended for first-time)

1. Di hPanel, buka **Files** > **File Manager**
2. Navigate ke folder aplikasi Node.js yang sudah dibuat
3. Upload semua file kecuali:
   - `node_modules/` (folder ini akan di-generate)
   - `.env` (akan dibuat manual di server)
   - `uploads/*` (file upload user)
4. Pastikan struktur folder seperti ini:
   ```
   /public_html/belajarlogin/
   ├── config/
   ├── public/
   ├── routes/
   ├── views/
   ├── app.js
   ├── package.json
   ├── setup_users.js
   └── .env.hostinger (template)
   ```

### Method 2: Via Git (Advanced)

1. Push kode ke repository Git (GitHub, GitLab, dll)
2. Di Hostinger, buka **Node.js Application Manager**
3. Klik aplikasi Anda
4. Scroll ke **Application Setup**
5. Pilih **Deploy from Git repository**
6. Masukkan Git URL dan credentials
7. Klik **Deploy**

---

## ⚙️ Konfigurasi Environment Variables

### 1. Generate SESSION_SECRET

Di komputer local Anda, buka terminal dan jalankan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output string yang dihasilkan.

### 2. Create .env File

Di Hostinger File Manager:

1. Navigate ke folder aplikasi
2. Buat file baru bernama `.env`
3. Copy isi dari `.env.hostinger` dan edit dengan data yang benar:

```env
DB_HOST=localhost
DB_USER=u123456789_dbuser        # Ganti dengan user database Anda
DB_PASSWORD=your_db_password      # Ganti dengan password database Anda
DB_NAME=u123456789_belajarlogin  # Ganti dengan nama database Anda

SESSION_SECRET=hasil_generate_dari_step_1  # Paste hasil generate

NODE_ENV=production
```

4. Save file

> **⚠️ PENTING:** Jangan gunakan karakter spesial seperti `$`, `` ` ``, `\`, `"`, `'` di password!

---

## 📦 Install Dependencies

### Via Hostinger Terminal

1. Di hPanel, buka **Advanced** > **Terminal** atau **SSH Access**
2. Navigate ke folder aplikasi:
   ```bash
   cd domains/yourdomain.com/public_html/belajarlogin
   ```
3. Install dependencies:
   ```bash
   npm install --production
   ```
4. Tunggu hingga selesai (mungkin memakan waktu 2-5 menit)

---

## 🗄️ Setup Database

Setelah dependencies terinstall, jalankan setup script:

```bash
node setup_users.js
```

Anda akan melihat output:
```
✅ Tabel users berhasil dibuat/diperiksa.
✅ User "admin" berhasil dibuat (Password: password).
ℹ️  Password sudah di-hash dengan bcrypt untuk keamanan.
```

---

## 🚀 Start Aplikasi

### Via Node.js Application Manager

1. Kembali ke **Node.js** menu di hPanel
2. Klik aplikasi Anda
3. Klik tombol **Start** atau **Restart**
4. Tunggu beberapa detik
5. Status akan berubah menjadi **Running**

### Via Terminal (Alternative)

```bash
npm start
```

> **Note:** Jika menggunakan terminal, aplikasi akan stop saat terminal ditutup. Gunakan Node.js Application Manager untuk auto-restart.

---

## ✅ Verifikasi Deployment

### 1. Check Application Status

1. Buka **Node.js Application Manager**
2. Status harus **Running** dengan warna hijau
3. Jika error (merah), klik **View Logs** untuk lihat error message

### 2. Test Health Check

Buka browser dan akses:
```
https://yourdomain.com/health
```

Anda harus melihat response JSON:
```json
{
  "status": "OK",
  "timestamp": "2025-12-10T03:00:00.000Z"
}
```

### 3. Test Login

1. Buka: `https://yourdomain.com/login`
2. Login dengan:
   - **Username**: `admin`
   - **Password**: `password`
3. Seharusnya redirect ke Dashboard

### 4. Test File Upload

1. Navigate ke **Master Produk** atau menu lainnya
2. Upload file Excel sample
3. Verify data muncul di tabel
4. Test **Clear Data** button

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

**Problem:** Database credentials salah atau database tidak ada.

**Solution:**
1. Cek file `.env` di server
2. Pastikan DB_HOST, DB_USER, DB_PASSWORD, DB_NAME benar
3. Cek database exists di **MySQL Databases** di hPanel
4. Pastikan user punya privileges ke database tersebut

**Fix:**
```bash
# Test koneksi database via terminal
mysql -h localhost -u u123456789_user -p u123456789_dbname
# Masukkan password saat diminta
```

---

### Error: "Module not found"

**Problem:** Dependencies tidak terinstall atau ada yang missing.

**Solution:**
```bash
cd /path/to/app
npm install
```

Jika masih error, hapus node_modules dan install ulang:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Error: "Port already in use"

**Problem:** Port conflict (jarang terjadi di Hostinger).

**Solution:**
1. Pastikan `app.js` menggunakan `process.env.PORT`
2. Jangan hardcode port di `.env`
3. Restart aplikasi via Node.js Application Manager

---

### Error: "Session tidak tersimpan / logout otomatis"

**Problem:** Session store tidak terkonfigurasi dengan benar.

**Solution:**
1. Cek `SESSION_SECRET` sudah di-set di `.env`
2. Cek database connection untuk session store
3. Verify tabel `sessions` ada di database (dibuat otomatis oleh express-mysql-session)

**Check tabel sessions:**
```bash
mysql -u user -p database_name -e "SHOW TABLES LIKE 'sessions';"
```

---

### Error: "Cannot write to uploads directory"

**Problem:** Permission issue pada folder uploads.

**Solution:**
```bash
chmod 755 uploads/
# atau
chmod 777 uploads/  # less secure but works
```

Via File Manager:
1. Right-click folder `uploads`
2. Permissions / Change Permissions
3. Set to `755` atau `777`

---

### Application tidak mau start / crash

**Problem:** Error di code atau environment.

**Solution:**
1. **View Logs** di Node.js Application Manager
2. Atau via terminal:
   ```bash
   cd /path/to/app
   node app.js
   ```
3. Lihat error message yang muncul
4. Common issues:
   - Syntax error (run `node --check app.js`)
   - Missing .env file
   - Database connection failed
   - Port conflict

---

### SSL/HTTPS tidak aktif

**Problem:** Website masih menggunakan HTTP.

**Solution:**
1. Di hPanel, buka **Security** > **SSL/TLS**
2. Enable SSL untuk domain Anda
3. Force HTTPS redirect:
   - Buat file `.htaccess` di root folder
   - Tambahkan:
     ```apache
     RewriteEngine On
     RewriteCond %{HTTPS} off
     RewriteRule ^(.*)$ https://%{HTTP_HOST%}/$1 [L,R=301]
     ```

---

## 🔐 Security Checklist Post-Deployment

Setelah deployment, verify security:

- [ ] Password di database sudah di-hash (tidak plain text)
- [ ] Route `/cek-db` tidak accessible (sudah dihapus)
- [ ] File `.env` tidak ter-commit ke git
- [ ] `NODE_ENV=production` di `.env`
- [ ] Session cookie secure (HTTPS)
- [ ] SSL certificate aktif
- [ ] Regular backup database di-schedule
- [ ] Upload file size limit sudah di-set
- [ ] Only allowed file types (.xlsx, .xls) dapat diupload

---

## 📊 Monitoring & Maintenance

### Monitor Application

1. **Via Hostinger Control Panel:**
   - Node.js Application Manager > View Logs
   - Monitor CPU & Memory usage

2. **Check Health Endpoint:**
   - Setup external monitoring (misal: UptimeRobot)
   - Monitor `/health` endpoint

### Regular Maintenance

**Weekly:**
- [ ] Check application logs untuk errors
- [ ] Monitor database size

**Monthly:**
- [ ] Backup database
- [ ] Update dependencies (`npm update`)
- [ ] Check security advisories (`npm audit`)

**Backup Database:**
```bash
mysqldump -u user -p database_name > backup_$(date +%Y%m%d).sql
```

---

## 🔄 Update Aplikasi

Untuk update kode aplikasi di Hostinger:

1. **Via Git:**
   ```bash
   cd /path/to/app
   git pull origin main
   npm install  # jika ada dependency baru
   ```

2. **Via File Manager:**
   - Upload file yang diupdate
   - Overwrite file lama

3. **Restart Application:**
   - Node.js Application Manager > Restart
   - Atau: `npm start` di terminal

---

## 📞 Support

Jika masih ada masalah:

1. **Check Hostinger Documentation:**
   - https://support.hostinger.com/en/collections/2441505-node-js

2. **Contact Hostinger Support:**
   - Live Chat di hPanel
   - Email support

3. **Common Issues:**
   - Search di Hostinger knowledge base
   - Check application logs

---

## ✅ Deployment Checklist

Gunakan checklist ini sebelum dan setelah deployment:

### Pre-Deployment
- [ ] Semua kode sudah di-commit ke git (kecuali .env)
- [ ] Dependencies sudah di-test di local
- [ ] Database MySQL sudah dibuat di Hostinger
- [ ] File `.env.hostinger` sudah siap dengan template

### During Deployment
- [ ] Files uploaded ke Hostinger
- [ ] `.env` file dibuat dengan credentials yang benar
- [ ] `npm install` berhasil dijalankan
- [ ] `node setup_users.js` berhasil create user admin
- [ ] Application started via Node.js Manager

### Post-Deployment
- [ ] `/health` endpoint returns OK
- [ ] Login dengan admin/password berhasil
- [ ] Dashboard accessible
- [ ] Upload file Excel berhasil
- [ ] Data tersimpan ke database
- [ ] Clear data berfungsi
- [ ] Session persisten (tidak logout otomatis)
- [ ] SSL/HTTPS aktif
- [ ] No errors di logs

---

## 🎉 Selesai!

Aplikasi Anda sekarang sudah running di Hostinger production environment dengan:
- ✅ Password hashing dengan bcrypt
- ✅ Secure session management
- ✅ Production-ready error handling
- ✅ Health check monitoring
- ✅ Proper environment configuration

**Login Info:**
- URL: `https://yourdomain.com/login`
- Username: `admin`
- Password: `password`

> **⚠️ IMPORTANT:** Segera ganti password admin setelah first login!

---

*Dokumentasi dibuat untuk deployment aplikasi BelajarLogin ke Hostinger*

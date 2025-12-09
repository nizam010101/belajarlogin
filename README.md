# 📦 BelajarLogin - Order Management App

Aplikasi web Node.js untuk manajemen order dengan fitur upload Excel, autentikasi user, dan manajemen data pesanan.

---

## ✨ Features

- 🔐 **User Authentication** - Login/logout dengan session management
- 📊 **Excel Upload** - Upload dan parse file .xlsx/.xls
- 🗄️ **MySQL Database** - Penyimpanan data terstruktur
- 🔄 **Duplicate Detection** - Validasi data duplikat otomatis
- 📋 **Multiple Pages** - Dashboard, Master Produk, Upload Pesanan, In Stok, dll
- 🧹 **Data Management** - Clear data per table
- 🔒 **Secure** - Password hashing dengan bcrypt
- 💚 **Health Check** - Monitoring endpoint

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MySQL Database
- npm atau yarn

### Installation

1. **Clone repository**
   ```bash
   git clone <your-repo-url>
   cd belajarlogin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   # Copy template dan edit
   cp .env.example .env
   # Edit .env dengan database credentials Anda
   ```

4. **Setup database**
   ```bash
   # Create user admin
   npm run setup
   ```

5. **Start application**
   ```bash
   npm start
   ```

6. **Open browser**
   ```
   http://localhost:3000/login
   ```

**Default Login:**
- Username: `admin`
- Password: `password`

---

## 📁 Project Structure

```
belajarlogin/
├── config/
│   └── database.js          # Database connection
├── public/
│   └── style.css            # CSS styles
├── routes/
│   └── index.js             # All application routes
├── uploads/                 # Uploaded files directory
├── views/                   # EJS templates
│   ├── login.ejs
│   ├── index.ejs            # Dashboard
│   ├── layout.ejs           # Sidebar navigation
│   ├── masterproduk.ejs
│   ├── uploadpesanan.ejs
│   └── ... (other pages)
├── app.js                   # Main application file
├── setup_users.js           # Database setup script
├── package.json
├── .env.example             # Environment template
└── DEPLOYMENT.md            # Deployment guide
```

---

## 🔧 Environment Variables

Create a `.env` file in root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# Session Configuration
SESSION_SECRET=your_secret_key_here

# Environment
NODE_ENV=development

# Server Port
PORT=3000
```

---

## 🗄️ Database Tables

### users
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY)
- `username` (VARCHAR 50, UNIQUE)
- `password` (VARCHAR 255) - bcrypt hash

### Dynamic Tables
Aplikasi akan membuat table otomatis saat upload Excel:
- `master_produk`
- `upload_pesanan`
- `in_stok`
- `pengembalian`
- `pesanan_diterima`
- `retur_diterima`
- `so_ulang`
- `gagal_kirim`

---

## 📡 API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - Login submit
- `GET /logout` - Logout

### Pages
- `GET /` - Dashboard
- `GET /masterproduk` - Master Produk page
- `POST /masterproduk` - Upload Excel to Master Produk
- `GET /uploadpesanan` - Upload Pesanan page
- `POST /uploadpesanan` - Upload Excel to Upload Pesanan
- ... (similar for other pages)

### Utility
- `GET /health` - Health check endpoint
- `GET /clear/:tableName` - Clear data from table

---

## 🛠️ Development

### Run in development mode
```bash
npm start
```

### Setup new admin user
```bash
npm run setup
```

### Check syntax
```bash
node --check app.js
node --check routes/index.js
```

### Security audit
```bash
npm audit
npm audit fix
```

---

## 🚀 Deployment

Untuk deployment ke production (Hostinger atau platform lain), baca dokumentasi lengkap:

📖 **[DEPLOYMENT.md](DEPLOYMENT.md)** - Panduan deployment step-by-step

### Quick Deployment Checklist:

- [ ] Setup MySQL database
- [ ] Configure `.env` with production credentials
- [ ] Set `NODE_ENV=production`
- [ ] Run `npm install --production`
- [ ] Run `node setup_users.js`
- [ ] Start application
- [ ] Test login dan upload

---

## 🔒 Security

### Implemented Security Measures:

- ✅ **Password Hashing** - bcrypt dengan 10 salt rounds
- ✅ **Session Management** - MySQL session store
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **File Upload Validation** - Tipe file dan size limit
- ✅ **Environment Variables** - Sensitive data protection
- ✅ **Production Error Handling** - No info leakage

### Security Best Practices:

1. Ganti password admin default setelah deployment
2. Gunakan SESSION_SECRET yang strong (32+ karakter random)
3. Jangan commit file `.env` ke repository
4. Enable HTTPS di production
5. Regular update dependencies (`npm update`)
6. Regular security audit (`npm audit`)

---

## 📊 Features per Page

### Dashboard
- Welcome page
- Navigation ke semua fitur

### Master Produk
- Upload Excel master produk
- View data produk
- Clear all data

### Upload Pesanan
- Upload Excel pesanan harian
- Duplicate detection
- View pesanan
- Clear data

### In Stok, Pengembalian, Pesanan Diterima, Retur Diterima, SO Ulang, Gagal Kirim
- Upload data Excel
- View data  
- Clear data
- Duplicate prevention

---

## 🐛 Troubleshooting

### Cannot connect to database
- Check `.env` database credentials
- Ensure MySQL server is running
- Verify database exists

### Session not persisting
- Check `SESSION_SECRET` is set
- Verify database connection for session store
- Check `sessions` table exists in database

### Upload failed
- Verify `uploads/` folder exists and writable
- Check file is `.xlsx` or `.xls` format
- Ensure file size < 10MB

### Application crashed
- Check logs in terminal
- Verify all environment variables are set
- Run `node --check app.js` for syntax errors

---

## 📝 License

ISC

---

## 👨‍💻 Author

Your Name

---

## 🙏 Acknowledgments

- Express.js - Web framework
- EJS - Template engine
- bcrypt - Password hashing
- xlsx - Excel parser
- mysql2 - MySQL driver

---

## 📞 Support

Untuk bantuan dan troubleshooting:
- Baca [DEPLOYMENT.md](DEPLOYMENT.md)
- Check application logs
- Contact support team

---

**Version:** 1.0.0  
**Last Updated:** December 2025

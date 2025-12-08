const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database options for session store
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "160721",
  database: process.env.DB_NAME || "belajarlogin",
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
});

//setup view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));

//tambah dua konfigurasi session
app.use(
  session({
    key: "session_cookie_name",
    secret: process.env.SESSION_SECRET || "secret_key_localhost",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    // cookie: { maxAge: 3600000 }, // Baris ini dihapus/dikomentar agar otomatis logout saat browser ditutup
  })
);

// Middleware to make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Import routes
const mainRoutes = require("./routes/index");
app.use("/", mainRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

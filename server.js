const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
const port = 3000;

// Konfigurasi koneksi ke PostgreSQL
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "FitSteps",
  password: "jovandi",
  port: 5432,
});

// Konfigurasi multer untuk menyimpan file yang diunggah
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads"); // Tentukan folder untuk menyimpan file
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nama file akan diberi timestamp
  },
});
const upload = multer({ storage: storage });

// Configure ejs and static files
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "views/public")));
app.use(express.static(path.join(__dirname, "public")));

// Middleware untuk menangani form data
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "secret_key", // Ganti dengan key yang lebih aman
    resave: false,
    saveUninitialized: true,
  })
);

// Route untuk halaman index (halaman utama)
app.get("/", (req, res) => {
  const loggedIn = req.session.userId ? true : false; // Mengecek session user
  const namaLengkap = req.session.namaLengkap || ""; // Menyediakan nama lengkap jika ada
  res.render("index", {
    title: "FitSteps: Small Steps Big Changes",
    loggedIn: loggedIn,
    namaLengkap: namaLengkap,
  });
});

// Halaman Signup
app.get("/signup", (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("signup", {
    title: "FitSteps: Signup",
    loggedIn: loggedIn,
  });
});

// Halaman Login
app.get("/login", (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("login", {
    title: "FitSteps: Login",
    loggedIn: loggedIn,
  });
});

app.get("/profile", checkAuth, async (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  const userId = req.session.userId;
  try {
    // Ambil data pengguna dari database
    const result = await pool.query(
      "SELECT nama_lengkap, email FROM users WHERE id = $1",
      [userId]
    );
    const user = result.rows[0];

    if (user) {
      res.render("profile", {
        title: "Halaman Profil",
        namaLengkap: user.nama_lengkap,
        email: user.email,
        loggedIn: loggedIn,
      });
    } else {
      res.status(404).send("User not found.");
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Error fetching user profile.");
  }
});

// Route untuk melayani konten footer
app.get("/footer", (req, res) => {
  res.render("footer"); // Merender footer.ejs
});

app.get("/newsletter-form", (req, res) => {
  res.render("newsletter-form");
});

app.get("/contact-us", (req, res) => {
  const loggedIn = req.session.userId ? true : false; // Check if the user is logged in
  res.render("Contact Us", {
    title: "FitSteps: Contact Us",
    loggedIn: loggedIn,
  });
});

app.get("/events", (req, res) => {
  const loggedIn = req.session.userId ? true : false; // Check if the user is logged in
  res.render("events", {
    title: "FitSteps: Upcoming Events",
    loggedIn: loggedIn,
  });
});

app.get("/health-benefits", (req, res) => {
  const loggedIn = req.session.userId ? true : false; // Check if the user is logged in
  res.render("Health Benefits", {
    title: "FitSteps: Health Benefits",
    loggedIn: loggedIn,
  });
});

app.get("/tips-workout", (req, res) => {
  const loggedIn = req.session.userId ? true : false; // Check if the user is logged in
  res.render("nav-tips-workout", {
    title: "FitSteps: Workout Tips",
    loggedIn: loggedIn,
  });
});

app.get("/trendy-shoes", (req, res) => {
  const loggedIn = req.session.userId ? true : false; // Check if the user is logged in
  res.render("nav-trendy-shoes", {
    title: "FitSteps: Trendy Shoes",
    loggedIn: loggedIn,
  });
});

app.get("/forms", (req, res) => {
  console.log("Navigating to /forms");
  const loggedIn = req.session.userId ? true : false;
  res.render("Form Events", {
    title: "Join Event Form",
    loggedIn: loggedIn,
  });
});

app.post("/change-password", checkAuth, async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.userId;

  try {
    // Validasi input
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).send("Semua bidang harus diisi.");
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .send("Password baru harus memiliki minimal 8 karakter.");
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .send("Password baru dan konfirmasi password tidak cocok.");
    }

    // Ambil password lama dari database
    const result = await pool.query(
      "SELECT password FROM users WHERE id = $1",
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).send("Pengguna tidak ditemukan.");
    }

    // Verifikasi password lama
    const isOldPasswordCorrect = await bcrypt.compare(
      oldPassword,
      user.password
    );
    if (!isOldPasswordCorrect) {
      return res.status(400).send("Password lama salah.");
    }

    if (oldPassword === newPassword) {
      return res
        .status(400)
        .send("Password baru tidak boleh sama dengan password lama.");
    }

    // Hash password baru
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password di database
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedNewPassword,
      userId,
    ]);

    // Kirim respons sukses
    res.status(200).send("Password berhasil diganti.");
  } catch (error) {
    console.error("Error ganti password:", error);
    res.status(500).send("Terjadi kesalahan saat mengganti password.");
  }
});

// Proses Signup
app.post("/signup", async (req, res) => {
  const { nama_lengkap, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const query =
    "INSERT INTO users(nama_lengkap, email, password) VALUES($1, $2, $3)";
  const values = [nama_lengkap, email, hashedPassword];

  try {
    await pool.query(query, values);
    res.redirect("/login"); // Setelah signup, arahkan ke halaman login
  } catch (error) {
    console.error("Error signing up:", error);
    res.send("Terjadi kesalahan saat signup.");
  }
});

// Middleware untuk mengecek apakah user sudah login
function checkAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login"); // Redirect ke halaman login jika belum login
  }
  next();
}

// Tambahkan route untuk logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
    }
    res.redirect("/"); // Arahkan ke halaman home setelah logout
  });
});

// Halaman Upload (hanya dapat diakses jika login)
app.get("/upload", checkAuth, async (req, res) => {
  try {
    // Check for user session ID
    const userId = req.session.userId;
    if (!userId) {
      console.error("User ID not found in session.");
      return res.redirect("/login");
    }

    // Fetch the user's full name
    const userResult = await pool.query(
      "SELECT nama_lengkap FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      console.error(`No user found with ID: ${userId}`);
      return res.status(404).send("User not found.");
    }

    const user = userResult.rows[0];

    // Fetch the uploads associated with the user
    const uploadsResult = await pool.query(
      "SELECT * FROM uploads WHERE id_user = $1",
      [userId]
    );

    // Render the upload page with user details and uploads
    res.render("upload", {
      title: "Upload Foto dan Caption",
      uploads: uploadsResult.rows,
      namaLengkap: user.nama_lengkap, // Pass the user's full name
    });
  } catch (error) {
    console.error("Error details:", error.message);
    res.status(500).send("Error loading the upload page.");
  }
});

// Proses Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const query = "SELECT * FROM users WHERE email = $1";
  const values = [email];

  try {
    const result = await pool.query(query, values);
    const user = result.rows[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.userId = user.id; // Menyimpan ID user di session
      req.session.namaLengkap = user.nama_lengkap; // Menyimpan Nama Lengkap di session
      res.redirect("/profile"); // Setelah login berhasil, arahkan ke halaman profle
    } else {
      res.send("Email atau password salah.");
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.send("Terjadi kesalahan saat login.");
  }
});

// Menangani unggahan foto dan caption
app.post("/upload", upload.single("photo"), async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login"); // Jika tidak login, redirect ke halaman login
  }

  const { caption } = req.body;
  const photo = req.file ? req.file.filename : null;

  if (photo) {
    const query =
      "INSERT INTO uploads(id_user, caption, photo_url) VALUES($1, $2, $3)";
    const values = [req.session.userId, caption, `uploads/${photo}`];

    try {
      await pool.query(query, values);
    } catch (error) {
      console.error("Error inserting data into database:", error);
    }
  }

  res.redirect("/upload");
});

app.post("/forms", upload.single("foto_diri"), async (req, res) => {
  const {
    nama_lengkap,
    jenis_kelamin,
    usia,
    nomor_telepon,
    email,
    alamat,
    kategori_acara,
    riwayat_kesehatan,
  } = req.body;

  // Cek jika data tidak kosong
  if (
    !nama_lengkap ||
    !jenis_kelamin ||
    !usia ||
    !nomor_telepon ||
    !email ||
    !alamat ||
    !kategori_acara ||
    !riwayat_kesehatan
  ) {
    return res.send("Data tidak lengkap!");
  }

  const foto_diri = req.file ? req.file.filename : null; // Nama file foto yang diunggah

  // Log data yang akan disimpan
  console.log("Data yang akan disimpan:", {
    nama_lengkap,
    jenis_kelamin,
    usia,
    nomor_telepon,
    email,
    alamat,
    kategori_acara,
    riwayat_kesehatan,
    foto_url: foto_diri ? `uploads/${foto_diri}` : null,
  });

  // Simpan data ke dalam database PostgreSQL
  const query =
    "INSERT INTO forms (nama_lengkap, jenis_kelamin, usia, nomor_telepon, email, alamat, kategori_acara, riwayat_kesehatan, foto_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
  const values = [
    nama_lengkap,
    jenis_kelamin,
    usia,
    nomor_telepon,
    email,
    alamat,
    kategori_acara,
    riwayat_kesehatan,
    foto_diri ? `uploads/${foto_diri}` : null,
  ];

  try {
    await pool.query(query, values); // Menyimpan data ke PostgreSQL
    res.redirect("/"); // Redirect ke halaman utama setelah registrasi
  } catch (error) {
    console.error("Error inserting data into database:", error.message); // Menampilkan pesan error
    res.send("Gagal menyimpan data registrasi.");
  }
});

app.use((req, res) => {
  res.status(404).send("<h1>404 - Page Not Found</h1>");
});

// Start server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

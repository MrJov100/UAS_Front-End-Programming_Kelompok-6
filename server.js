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
  password: "jovandi", //pass elys: ce171431
  port: 5432,
});

// Konfigurasi multer untuk menyimpan file yang diunggah
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
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
    secret: "secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware untuk memeriksa autentikasi
function checkAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.redirectTo = req.originalUrl;
    return res.redirect("/login?error=login");
  }
  next();
}

// Route untuk halaman index (halaman utama)
app.get("/", (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  const namaLengkap = req.session.namaLengkap || "";
  res.render("index", {
    title: "FitSteps: Small Steps Big Changes",
    loggedIn: loggedIn,
    namaLengkap: namaLengkap,
  });
});

// Route untuk menghapus akun
app.post("/delete-account", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).send("Anda harus login untuk menghapus akun.");
  }

  try {
    // Hapus akun pengguna berdasarkan userId
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    // Hapus session setelah penghapusan akun berhasil
    req.session.destroy((err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Gagal menghapus session.");
      }
      res.redirect("/");
    });
  } catch (error) {
    console.error("Error saat menghapus akun:", error);
    res.status(500).send("Terjadi kesalahan saat menghapus akun.");
  }
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
  const error = req.query.error || false;
  res.render("login", {
    title: "FitSteps: Login",
    loggedIn: loggedIn,
    error: error,
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
  res.render("footer");
});

app.get("/newsletter-form", (req, res) => {
  res.render("newsletter-form");
});

app.get("/contact-us", (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("Contact Us", {
    title: "FitSteps: Contact Us",
    loggedIn: loggedIn,
  });
});

app.get("/events", (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("events", {
    title: "FitSteps: Upcoming Events",
    loggedIn: loggedIn,
  });
});

app.get("/health-benefits", (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("Health Benefits", {
    title: "FitSteps: Health Benefits",
    loggedIn: loggedIn,
  });
});

app.get("/tips-workout", (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("nav-tips-workout", {
    title: "FitSteps: Workout Tips",
    loggedIn: loggedIn,
  });
});

app.get("/trendy-shoes", (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("nav-trendy-shoes", {
    title: "FitSteps: Trendy Shoes",
    loggedIn: loggedIn,
  });
});

app.get("/forms", checkAuth, (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("Form Events", {
    title: "FitSteps: Join Event Form",
    loggedIn: loggedIn,
  });
});

app.get("/readForms", checkAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(403).send("Anda tidak memiliki akses.");
    }

    const query = "SELECT * FROM forms WHERE user_id = $1";
    const result = await pool.query(query, [userId]);

    res.render("readForms", { forms: result.rows });
  } catch (error) {
    console.error("Error membaca data forms:", error);
    res.status(500).send("Terjadi kesalahan saat membaca data forms.");
  }
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
    return res.redirect("/login?error=login"); //
  }
  next();
}

// Tambahkan route untuk logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
    }
    res.redirect("/");
  });
});

// Halaman Upload (hanya dapat diakses jika login)
app.get("/upload", checkAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User ID not found in session.");
      return res.redirect("/login");
    }

    const userResult = await pool.query(
      "SELECT nama_lengkap FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      console.error(`No user found with ID: ${userId}`);
      return res.status(404).send("User not found.");
    }

    const user = userResult.rows[0];

    const uploadsResult = await pool.query(
      "SELECT * FROM uploads WHERE id_user = $1",
      [userId]
    );

    res.render("upload", {
      title: "Upload Foto dan Caption",
      uploads: uploadsResult.rows,
      namaLengkap: user.nama_lengkap,
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
      req.session.userId = user.id;
      req.session.namaLengkap = user.nama_lengkap;
      res.redirect("/profile");
    } else {
      res.redirect("/login?error=true");
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.send("Terjadi kesalahan saat login.");
  }
});

// Halaman tambah postingan fit-share
app.get("/add-post", checkAuth, (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("fitshare-addpost", {
    title: "FitSteps: SHARE",
    loggedIn: loggedIn,
  });
});

// Proses Tambah Post
app.post("/add-post", checkAuth, upload.single("photo"), async (req, res) => {
  const { caption } = req.body;
  const userId = req.session.userId;
  const photoFilename = req.file ? req.file.filename : null;

  try {
    await pool.query(
      "INSERT INTO posts (user_id, caption, photo_filename) VALUES ($1, $2, $3)",
      [userId, caption, photoFilename]
    );
    res.redirect("/fit-share");
  } catch (error) {
    console.error("Error adding post:", error);
    res.status(500).send("Error adding post.");
  }
});

// Halaman Menampilkan Semua Post
app.get("/fit-share", checkAuth, async (req, res) => {
  try {
    console.log("User ID:", req.session.userId);
    console.log("Nama Lengkap:", req.session.namaLengkap);

    const userId = req.session.userId;

    const result = await pool.query(
      `
      SELECT p.id, p.user_id, p.caption, p.photo_filename, p.created_at, u.nama_lengkap 
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      `
    );

    // Log hasil query untuk memastikan data posts berhasil diambil
    console.log("Fetched posts:", result.rows);
    console.log("loggedin user:", userId);

    // Render halaman dengan data posts, kosongkan jika tidak ada postingan
    res.render("fitshare-posts", {
      title: "Semua Post",
      posts: result.rows,
      loggedIn: true,
      namaLengkap: req.session.namaLengkap, // User's full name (opsional)
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).send("Error fetching posts.");
  }
});

// Halaman Edit Post
app.get("/edit-post/:id", checkAuth, async (req, res) => {
  const postId = req.params.id;

  try {
    const result = await pool.query(
      "SELECT id, caption FROM posts WHERE id = $1",
      [postId]
    );
    const post = result.rows[0];

    if (post) {
      res.render("fitshare-editpost", {
        title: "Edit Post",
        post: post,
        loggedIn: true,
      });
    } else {
      res.status(404).send("Post not found.");
    }
  } catch (error) {
    console.error("Error fetching post for editing:", error);
    res.status(500).send("Error fetching post for editing.");
  }
});

// Proses Edit Post
app.post("/edit-post/:id", checkAuth, async (req, res) => {
  const postId = req.params.id;
  const { caption } = req.body;

  try {
    await pool.query(
      "UPDATE posts SET caption = $1, updated_at = NOW() WHERE id = $2",
      [caption, postId]
    );
    res.redirect("/fit-share");
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).send("Error updating post.");
  }
});

// Proses Hapus Post
app.post("/delete-post/:id", checkAuth, async (req, res) => {
  const postId = req.params.id;

  try {
    await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
    res.redirect("/fit-share");
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).send("Error deleting post.");
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

// Endpoint untuk menghapus form
app.delete("/forms/:form_id", checkAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const formId = req.params.form_id;

    if (!userId) {
      return res
        .status(403)
        .json({ success: false, message: "Akses ditolak." });
    }

    // Hapus form berdasarkan user_id dan form_id
    const query = "DELETE FROM forms WHERE user_id = $1 AND form_id = $2";
    const result = await pool.query(query, [userId, formId]);

    if (result.rowCount > 0) {
      res.json({ success: true, message: "Form berhasil dihapus." });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Form tidak ditemukan." });
    }
  } catch (error) {
    console.error("Error menghapus data form:", error.message);
    res.status(500).json({ success: false, message: "Terjadi kesalahan." });
  }
});

app.get("/forms/:form_id/edit", checkAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const formId = req.params.form_id;

    if (!userId) {
      return res.status(403).send("Akses ditolak.");
    }

    const query = "SELECT * FROM forms WHERE user_id = $1 AND form_id = $2";
    const result = await pool.query(query, [userId, formId]);

    if (result.rows.length === 0) {
      return res.status(404).send("Form tidak ditemukan.");
    }

    res.render("editForms", { form: result.rows[0] });
  } catch (error) {
    console.error("Error memuat halaman edit form:", error.message);
    res.status(500).send("Terjadi kesalahan saat memuat halaman.");
  }
});

app.post("/forms", upload.single("foto_diri"), async (req, res) => {
  const {
    nama_lengkap,
    jenis_kelamin,
    usia,
    kode_negara,
    nomor_telepon,
    email,
    alamat,
    kategori_acara,
    riwayat_kesehatan,
  } = req.body;

  if (
    !nama_lengkap ||
    !jenis_kelamin ||
    !usia ||
    !kode_negara ||
    !nomor_telepon ||
    !email ||
    !alamat ||
    !kategori_acara ||
    !riwayat_kesehatan
  ) {
    return res.send("Data tidak lengkap!");
  }

  const foto_diri = req.file ? req.file.filename : null;

  const userId = req.session.userId;

  // Log data yang akan disimpan
  console.log("Data yang akan disimpan:", {
    nama_lengkap,
    jenis_kelamin,
    usia,
    kode_negara,
    nomor_telepon,
    email,
    alamat,
    kategori_acara,
    riwayat_kesehatan,
    foto_url: foto_diri ? `uploads/${foto_diri}` : null,
    userId,
  });

  // Simpan data ke dalam database PostgreSQL
  const query =
    "INSERT INTO forms (user_id, nama_lengkap, jenis_kelamin, usia, kode_negara, nomor_telepon, email, alamat, kategori_acara, riwayat_kesehatan, foto_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)";

  const values = [
    userId,
    nama_lengkap,
    jenis_kelamin,
    usia,
    kode_negara,
    nomor_telepon,
    email,
    alamat,
    kategori_acara,
    riwayat_kesehatan,
    foto_diri ? `uploads/${foto_diri}` : null,
  ];

  try {
    await pool.query(query, values);
    res.json({ success: true });
  } catch (error) {
    console.error("Error inserting data into database:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Gagal menyimpan data registrasi." });
  }
});

app.post("/forms/:form_id", checkAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const formId = req.params.form_id;
    const { riwayat_kesehatan } = req.body;

    if (!userId) {
      return res.status(403).send("Akses ditolak.");
    }

    if (!riwayat_kesehatan) {
      return res.status(400).send("Riwayat penyakit tidak boleh kosong.");
    }

    const query =
      "UPDATE forms SET riwayat_kesehatan = $1 WHERE user_id = $2 AND form_id = $3";
    const values = [riwayat_kesehatan, userId, formId];

    const result = await pool.query(query, values);

    if (result.rowCount > 0) {
      res.redirect("/readForms");
    } else {
      res.status(404).send("Form tidak ditemukan.");
    }
  } catch (error) {
    console.error("Error saat mengedit riwayat penyakit:", error.message);
    res.status(500).send("Terjadi kesalahan saat mengedit data.");
  }
});

app.use((req, res) => {
  const loggedIn = req.isAuthenticated ? req.isAuthenticated() : false;

  res.status(404).render("pagenotfound", { loggedIn });
});

// Start server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

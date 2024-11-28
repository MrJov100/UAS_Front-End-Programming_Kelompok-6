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
  password: "ce171431",
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

// Middleware untuk memeriksa autentikasi
function checkAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.redirectTo = req.originalUrl; // Simpan URL tujuan
    return res.redirect('/login');
  }
  next();
}

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
      res.redirect("/"); // Kembali ke halaman utama
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
  const error = req.query.error || false; // Capture the error query parameter
  res.render("login", {
    title: "FitSteps: Login",
    loggedIn: loggedIn,
    error: error, // Pass the error flag to the view
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

// UJICOBA POST FOTO N CAPTION
// Halaman Tambah Post
app.get("/add-post", checkAuth, (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("add-post", {
    title: "FitSteps: Upcoming Events",
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
    res.redirect("/posts");
  } catch (error) {
    console.error("Error adding post:", error);
    res.status(500).send("Error adding post.");
  }
});

// Halaman Menampilkan Semua Post
app.get("/posts", checkAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, caption, photo_filename, created_at FROM posts WHERE user_id = $1",
      [req.session.userId]
    );
    res.render("posts", {
      title: "Semua Post",
      posts: result.rows,
      loggedIn: true,
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
      res.render("edit-post", {
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
    res.redirect("/posts");
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
    res.redirect("/posts");
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).send("Error deleting post.");
  }
});

app.get("/fit-share", async (req, res) => {
  try {
    const loggedIn = req.session.userId ? true : false; // Check if the user is logged in
    if (!loggedIn) {
      return res.render("notloggedin", {title: "Not Logged In"});
    }

    const uploadsQuery = `
      SELECT *
      FROM uploads
      INNER JOIN users
      ON uploads.id_user = users.id
      ORDER BY uploads.id DESC;
    `;

    const uploadResult = await pool.query(uploadsQuery);

    res.render("nav-fit-share", {
      title: "FitSteps: Fit Share",
      uploads: uploadResult.rows,
    });
  } catch (error) {
    console.error("Error fetching fit-share data:", error.message);
    res.status(500).send("Error loading Fit Share page.");
  }
});

app.get("/api/uploads", async (req, res) => {
  try {
    const uploadsQuery = `
      SELECT uploads.*, users.nama_lengkap
      FROM uploads
      INNER JOIN users
      ON uploads.id_user = users.id
      ORDER BY uploads.id DESC;
    `;

    const uploadResult = await pool.query(uploadsQuery);
    if (uploadResult.rows.length === 0) {
      return res.json([]);
    }

    res.json(uploadResult.rows);
  } catch (error) {
    console.error("Error fetching uploads data:", error.message);
    res.status(500).send("Error loading uploads page.");
  }
});

app.post("/api/edit/:id", async (req,res) => {
  const {id} = req.params;
  const {caption} = req.body;

  console.log("Caption diterima dari form:", caption);
  const userId = req.session.userId;

  try {
    const checkQuery = "SELECT id_user FROM uploads WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [id]);
    if (checkResult.rows[0].id_user !== userId) {
      return res.status(403).send("You can only edit your own posts.");
    }

    const updateQuery = "UPDATE uploads SET caption = $1 WHERE id = $2 RETURNING *";
    const result = await pool.query(updateQuery, [caption, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).send("Error updating post.");
  }
});

app.delete("/api/delete/:id", async (req, res) => {
  const {id} = req.params;
  const userId = req.session.userId;

  try {
    const checkQuery = "SELECT id_user FROM uploads WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [id]);
    if (checkResult.rows[0].id_user !== userId) {
      return res.status(403).send("You can only delete your own posts.");
    }

    const deleteQuery = "DELETE FROM uploads WHERE id = $1";
    await pool.query(deleteQuery, [id]);

    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).send("Error deleting post.");
  }
});

app.get("/trendy-shoes", (req, res) => {
  const loggedIn = req.session.userId ? true : false; // Check if the user is logged in
  res.render("nav-trendy-shoes", {
    title: "FitSteps: Trendy Shoes",
    loggedIn: loggedIn,
  });
});

app.get("/forms", checkAuth, (req, res) => {
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
      res.redirect("/profile"); // Setelah login berhasil, arahkan ke halaman profile
    } else {
      res.redirect("/login?error=true"); // Redirect with an error flag
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.send("Terjadi kesalahan saat login.");
  }
});

// Menangani unggahan foto dan caption
app.post("/upload", upload.single("photo"), async (req, res) => {
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

  res.redirect("/fit-share");
});


app.post('/forms', upload.single('foto_diri'), async (req, res) => {
  const { nama_lengkap, jenis_kelamin, usia, nomor_telepon, email, alamat, kategori_acara, riwayat_kesehatan } = req.body;

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

  const userId = req.session.userId;
 
  // Log data yang akan disimpan (untuk debugging)
  console.log('Data yang akan disimpan:', {
    nama_lengkap,
    jenis_kelamin,
    usia,
    nomor_telepon,
    email,
    alamat,
    kategori_acara,
    riwayat_kesehatan,
    foto_url: foto_diri ? `uploads/${foto_diri}` : null,
    userId
  });

  // Simpan data ke dalam database PostgreSQL
  const query = 'INSERT INTO forms (user_id, nama_lengkap, jenis_kelamin, usia, nomor_telepon, email, alamat, kategori_acara, riwayat_kesehatan, foto_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
  const values = [userId, nama_lengkap, jenis_kelamin, usia, nomor_telepon, email, alamat, kategori_acara, riwayat_kesehatan, foto_diri ? `uploads/${foto_diri}` : null];

  try {
    await pool.query(query, values); // Menyimpan data ke PostgreSQL
    res.json({ success: true });
  } catch (error) {
    console.error('Error inserting data into database:', error.message);
    res.status(500).json({ success: false, message: 'Gagal menyimpan data registrasi.' });

  }
});

app.use((req, res) => {
  res.status(404).send("<h1>404 - Page Not Found</h1>");
});

// Start server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

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
  res.render("signup", { title: "Halaman Signup" });
});

// Halaman Login
app.get("/login", (req, res) => {
  res.render("login", { title: "Halaman Login" });
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

// app.get("/profile", (req, res) => {
//   const loggedIn = req.session.userId ? true : false;
//   res.render("profile", {
//     title: "FitSteps: Profile",
//     loggedIn: loggedIn,
//   });
// });

// Route untuk melayani konten footer
app.get("/footer", (req, res) => {
  res.render("footer"); // Merender footer.ejs
});

app.get("/newsletter-form", (req, res) => {
  res.render("newsletter-form");
});

// Halaman untuk ganti password
app.get("/change-password", checkAuth, (req, res) => {
  res.render("change-password", { title: "Ganti Password" });
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

app.get("/trendy-shoes", (req, res) => {
  const loggedIn = req.session.userId ? true : false; // Check if the user is logged in
  res.render("nav-trendy-shoes", {
    title: "FitSteps: Trendy Shoes",
    loggedIn: loggedIn,
  });
});

app.get("/forms", (req, res) => {
  const loggedIn = req.session.userId ? true : false;
  res.render("Form Events", { 
    title: "Join Event Form" ,
    loggedIn: loggedIn,
  });
});

// Route untuk menangani POST request ganti password
app.post("/change-password", checkAuth, async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.userId;

  try {
    // Validasi apakah password baru dan konfirmasinya cocok
    if (newPassword !== confirmPassword) {
      return res.send("Password baru dan konfirmasi password tidak cocok.");
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

    // Bandingkan password lama dengan yang ada di database
    const isOldPasswordCorrect = await bcrypt.compare(
      oldPassword,
      user.password
    );
    if (!isOldPasswordCorrect) {
      return res.send("Password lama salah.");
    }

    // Hash password baru
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password baru di database
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedNewPassword,
      userId,
    ]);

    res.send("Password berhasil diganti.");
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
    res.redirect("/login"); // Arahkan ke halaman login setelah logout
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
      res.redirect("/"); // Setelah login berhasil, arahkan ke halaman upload
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
  if (!nama_lengkap || !jenis_kelamin || !usia || !nomor_telepon || !email || !alamat || !kategori_acara || !riwayat_kesehatan) {
    return res.send('Data tidak lengkap!');
  }

  const foto_diri = req.file ? req.file.filename : null; // Nama file foto yang diunggah

  // Log data yang akan disimpan
  console.log('Data yang akan disimpan:', {
    nama_lengkap,
    jenis_kelamin,
    usia,
    nomor_telepon,
    email,
    alamat,
    kategori_acara,
    riwayat_kesehatan,
    foto_url: foto_diri ? `uploads/${foto_diri}` : null
  });

  // Simpan data ke dalam database PostgreSQL
  const query = 'INSERT INTO forms (nama_lengkap, jenis_kelamin, usia, nomor_telepon, email, alamat, kategori_acara, riwayat_kesehatan, foto_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
  const values = [nama_lengkap, jenis_kelamin, usia, nomor_telepon, email, alamat, kategori_acara, riwayat_kesehatan, foto_diri ? `uploads/${foto_diri}` : null];

  try {
    await pool.query(query, values); // Menyimpan data ke PostgreSQL
    res.redirect('/'); // Redirect ke halaman utama setelah registrasi
  } catch (error) {
    console.error('Error inserting data into database:', error.message); // Menampilkan pesan error
    res.send('Gagal menyimpan data registrasi.');
  }
});

app.use((req, res) => {
  res.status(404).send("<h1>404 - Page Not Found</h1>");
});

// Start server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

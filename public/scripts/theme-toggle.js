// FUNGSI Tema mode terang / gelap
const themeToggleBtn = document.getElementById("themeToggleBtn");

function toggleTheme() {
  if (document.body.classList.contains("dark-mode")) {
    document.body.classList.remove("dark-mode");
    themeToggleBtn.textContent = "🌙"; // Ganti ikon ke bulan untuk mode terang
  } else {
    document.body.classList.add("dark-mode");
    themeToggleBtn.textContent = "☀️"; // Ganti ikon ke matahari untuk mode gelap
  }
}

// simpan tema mode terang/gelap ke localStorage
function setInitialTheme() {
  const darkMode = localStorage.getItem("dark-mode") === "true";
  if (darkMode) {
    document.body.classList.add("dark-mode");
    themeToggleBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("dark-mode");
    themeToggleBtn.textContent = "🌙";
  }
}

themeToggleBtn.addEventListener("click", () => {
  toggleTheme();
  localStorage.setItem(
    "dark-mode",
    document.body.classList.contains("dark-mode")
  );
});

// Inisialisasi tema mode terang/gelap
setInitialTheme();

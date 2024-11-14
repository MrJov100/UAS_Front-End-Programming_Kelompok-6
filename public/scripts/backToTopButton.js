// TOMBOL BACK TO TOP
let backToTopBtn = document.getElementById("backToTopBtn");
function showBackToTopBtn() {
  backToTopBtn.style.display = "block"; // mengatur properti display menjadi block.
  backToTopBtn.style.bottom = "20px"; // tombol di posisi 20px dari bagian bawah halaman.
}
showBackToTopBtn();

// KETIKA USER KLIK TOMBOL BACK-TO-TOP MAKA AKAN SMOOTH NAIKNYA
backToTopBtn.addEventListener("click", function () {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

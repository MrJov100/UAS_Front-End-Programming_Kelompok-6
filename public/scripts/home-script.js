// fungsi pop up brosur
const popup = document.getElementById("popup");
const closeBtn = document.getElementById("closeBtn");

// Memunculkan pop up brosur saat web direfresh
window.onload = function () {
  popup.classList.remove("hidden");
};

// Fungsi untuk close pop up
closeBtn.addEventListener("click", function () {
  popup.classList.add("hidden");
});

// Fungsi Fade-In saat user scroll
const faders = document.querySelectorAll(".fade-in");

// Menentukan opsi untuk IntersectionObserver
const appearOptions = {
  threshold: 0,
  rootMargin: "0px 0px -100px 0px",
};

// Membuat IntersectionObserver untuk memantau apakah elemen masuk ke dalam viewport
const appearOnScroll = new IntersectionObserver(function (
  entries,
  appearOnScroll
) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      return;
    } else {
      entry.target.classList.add("appear");
      appearOnScroll.unobserve(entry.target);
    }
  });
},
appearOptions); // sebagai opsi observer

// memeriksa elemen yang memiliki kelas 'fade-in'
faders.forEach((fader) => {
  appearOnScroll.observe(fader);
});

// Fungsi untuk muncul gambar 3 Ways secara fade-in
const images = document.querySelectorAll(".scroll-image");

images.forEach((image, index) => {
  appearOnScroll.observe(image);
});

// ALERT KETIKA USER SUBMIT FORM
function handleFormSubmit() {
  alert("Thank you for signing up! We will keep you updated.");
  return false;
}
fetch("/newsletter-form")
  .then((response) => response.text())
  .then((data) => {
    document.getElementById("newsletter-placeholder").innerHTML = data;
  })
  .catch((error) => console.error("Error loading newsletter form:", error));

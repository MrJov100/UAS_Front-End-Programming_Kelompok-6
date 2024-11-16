document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".navbar-profile a");
  const sections = document.querySelectorAll(".section");

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      if (this.getAttribute("href") === "/forms") {
        e.preventDefault();
        // Show pop-up alert
        alert(
          "Anda akan diarahkan ke halaman forms. Anda akan diarahkan dalam 5 detik."
        );

        // Add a 5-second delay before redirecting to /forms
        setTimeout(function () {
          window.location.href = "/forms";
        }, 5000); // 5000 milliseconds = 5 seconds
        return;
      }

      if (this.getAttribute("href") === "/logout") {
        return;
      }

      e.preventDefault();
      navLinks.forEach((nav) => nav.classList.remove("active"));
      this.classList.add("active");
      sections.forEach((section) => section.classList.remove("active"));
      const targetSection = document.getElementById(this.dataset.section);
      targetSection.classList.add("active");
    });
  });

  // Set default active section
  navLinks[0].classList.add("active");
  sections[0].classList.add("active");
});

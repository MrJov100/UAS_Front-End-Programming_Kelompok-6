document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".left-navbar a").forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("onclick").match(/'([^']+)'/)[1];
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
});

let menuIcons = document.querySelector("#menu-icons");
let navbar = document.querySelector(".left-navbar");

menuIcons.onclick = () => {
  menuIcons.classList.toggle("fa-times");
  navbar.classList.toggle("active");
};

window.addEventListener("scroll", function () {
  let sections = document.querySelectorAll("section");
  let navLinks = document.querySelectorAll(".left-navbar a");

  sections.forEach((section) => {
    let top = window.scrollY;
    let offset = section.offsetTop - 150;
    let height = section.offsetHeight;
    let id = section.getAttribute("id");

    if (top >= offset && top < offset + height) {
      navLinks.forEach((link) => {
        link.classList.remove("active");
      });

      document
        .querySelector(
          ".left-navbar a[onclick=\"scrollToSection('" + id + "')\"]"
        )
        .classList.add("active");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const showPopupButton = document.getElementById("showPopup");
  const popupForm = document.getElementById("popupForm");
  const closePopupButton = document.getElementById("closePopup");

  if (showPopupButton) {
    //menampilkan popup form
    showPopupButton.addEventListener("click", () => {
      popupForm.style.display = "block";
    });
  }

    //menutup popup form
  if (closePopupButton) {
    closePopupButton.addEventListener("click", () => {
      popupForm.style.display = "none";
    });
  }

  const postForm = document.getElementById("postForm");
  const postContainer = document.getElementById("postContainer");

  postForm.addEventListener("submit", function (event) {
    event.preventDefault();

    //Ambil data dari form
    const imageInput = document.getElementById("imageInput");
    const captionInput = document.getElementById("cptionInput");
    const imageFile = imageInput.files[0];
    const caption = captionInput.value;

    const imageUrl = URL.createObjectURL(imageFile);

    const cardHTML =
      <div class="card mb-3" style="max-width: 540px;">
        <img src="${imageURL}" class="card-img-top" alt="Uploaded Image"></img>
        <div class="card-body">
          <p class="card-text">${caption}</p>
        </div>
      </div>
    ;
    postContainer.insertAdjacentHTML("afterbegin", cardHTML);
    postForm.reset();
    document.getElementById("popupForm").style.display = "none";
  });
});
let favoriteShoes = JSON.parse(localStorage.getItem('favoriteShoes')) || [];

function saveFavorites() {
    localStorage.setItem('favoriteShoes', JSON.stringify(favoriteShoes));
}

function loadFavorites() {
    const storedFavorites = JSON.parse(localStorage.getItem('favoriteShoes')) || [];
    favoriteShoes = storedFavorites; 
    updateFavoritePopup();
}

document.querySelectorAll('.heart-icon i').forEach((heartIcon, index) => {
    const shoeLayout = document.querySelectorAll('.shoe-layout')[index];
    const shoeName = shoeLayout.querySelector('h3').innerText;

    if (favoriteShoes.find(shoe => shoe.name === shoeName)) {
        heartIcon.classList.remove('far');
        heartIcon.classList.add('fa');
    }

    heartIcon.addEventListener('click', function () {
        if (this.classList.contains('far')) {
            this.classList.remove('far');
            this.classList.add('fa');
            addToFavorites(index);
        } else {
            this.classList.remove('fa');
            this.classList.add('far');
            removeFromFavorites(index);
        }
        const popup = document.getElementById('favoritePopup');
        popup.style.display = 'none';
    });
});

function addToFavorites(index) {
    const shoeLayout = document.querySelectorAll('.shoe-layout')[index];
    const shoeImg = shoeLayout.querySelector('.shoe-images img');
    const shoeName = shoeLayout.querySelector('h3').innerText;

    if (favoriteShoes.length < 5) {
        favoriteShoes.push({ img: shoeImg.src, name: shoeName });
        updateFavoritePopup();
        saveFavorites();
    }
}

function removeFromFavorites(index) {
    const shoeLayout = document.querySelectorAll('.shoe-layout')[index];
    const shoeName = shoeLayout.querySelector('h3').innerText;

    const favoriteIndex = favoriteShoes.findIndex(shoe => shoe.name === shoeName);
    if (favoriteIndex !== -1) {
        favoriteShoes.splice(favoriteIndex, 1);
        updateFavoritePopup();
        saveFavorites();
    }
}

function updateFavoritePopup() {
    const favoriteList = document.querySelector('.favorite-list');
    const title = document.getElementById('popup-title');
    favoriteList.innerHTML = '';

    favoriteShoes.forEach(shoe => {
        const shoeItem = document.createElement('div');
        const img = document.createElement('img');
        const name = document.createElement('div');

        img.src = shoe.img;
        name.innerText = shoe.name;
        name.classList.add('shoe-name');

        shoeItem.appendChild(img);
        favoriteList.appendChild(shoeItem);
    });

    const favoritePopup = document.getElementById('favoritePopup');
    if (favoriteShoes.length > 0) {
        favoritePopup.style.display = "block";
        title.style.display = 'block';
    } else {
        favoritePopup.style.display = 'none';
        title.style.display = 'none';
    }
}

document.querySelector('.fixed-heart-button').addEventListener('click', function () {
    const popup = document.getElementById('favoritePopup');
    popup.style.display = 'block';
});

document.addEventListener('click', function (e) {
    const popup = document.getElementById('favoritePopup');
    if (e.target === popup) {
        popup.style.display = 'none';
    }
});

document.getElementById("close-popup").addEventListener("click", function () {
    const popup = document.getElementById('favoritePopup');
    popup.style.display = 'none';
});

window.onload = function () {
    loadFavorites();
    const popup = document.getElementById('favoritePopup');
    popup.style.display = 'none';
};

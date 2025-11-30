// ====== Configuration ======
const ACCESS_CODE = "SKOTT";    // viewer code – change this
const ADMIN_CODE = "Adminott12"; // admin code – change this

let movies = [];
let filteredMovies = [];
let isAdmin = false;

// DOM elements
const lockScreen = document.getElementById("lock-screen");
const app = document.getElementById("app");
const accessCodeInput = document.getElementById("access-code");
const unlockBtn = document.getElementById("unlock-btn");
const lockError = document.getElementById("lock-error");

const searchInput = document.getElementById("search-input");
const genreFilter = document.getElementById("genre-filter");
const movieList = document.getElementById("movie-list");

const playerModal = document.getElementById("player-modal");
const closeModalBtn = document.getElementById("close-modal");
const playerTitle = document.getElementById("player-title");
const playerMeta = document.getElementById("player-meta");
const playerDesc = document.getElementById("player-desc");
const playerVideo = document.getElementById("player-video");

// Admin elements
const adminToggleBtn = document.getElementById("admin-toggle");
const adminPanel = document.getElementById("admin-panel");
const adminForm = document.getElementById("admin-form");
const adminTitleInput = document.getElementById("admin-title");
const adminYearInput = document.getElementById("admin-year");
const adminGenreInput = document.getElementById("admin-genre");
const adminDescInput = document.getElementById("admin-desc");
const adminThumbInput = document.getElementById("admin-thumb");
const adminSourceInput = document.getElementById("admin-source");
const adminOutput = document.getElementById("admin-output");

// ====== Password gate (simple, not secure) ======
function tryUnlock() {
  const entered = accessCodeInput.value.trim();
  if (!entered) {
    lockError.textContent = "Enter access code.";
    return;
  }

  if (entered === ACCESS_CODE) {
    lockScreen.classList.add("hidden");
    app.classList.remove("hidden");
    lockError.textContent = "";
  } else {
    lockError.textContent = "Wrong code.";
  }
}

unlockBtn.addEventListener("click", tryUnlock);
accessCodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    tryUnlock();
  }
});

// ====== Load movies ======
async function loadMovies() {
  try {
    const res = await fetch("movies.json");
    if (!res.ok) {
      throw new Error("Failed to load movies.json");
    }
    movies = await res.json();
    filteredMovies = movies;
    renderMovies(filteredMovies);
  } catch (err) {
    console.error(err);
    movieList.innerHTML =
      "<p>Could not load movies. Check movies.json.</p>";
  }
}

// ====== Render ======
function renderMovies(list) {
  if (!list || list.length === 0) {
    movieList.innerHTML = "<p>No movies found.</p>";
    return;
  }

  movieList.innerHTML = "";
  list.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";
    card.dataset.id = movie.id;

    const img = document.createElement("img");
    img.className = "movie-thumb";
    img.src = movie.thumbnail || "";
    img.alt = movie.title || "Movie";

    const body = document.createElement("div");
    body.className = "movie-body";

    const titleEl = document.createElement("h3");
    titleEl.className = "movie-title";
    titleEl.textContent = movie.title;

    const metaEl = document.createElement("p");
    metaEl.className = "movie-meta";
    const parts = [];
    if (movie.year) parts.push(movie.year);
    if (movie.genre) parts.push(movie.genre);
    metaEl.textContent = parts.join(" • ");

    body.appendChild(titleEl);
    body.appendChild(metaEl);

    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener("click", () => openPlayer(movie));

    movieList.appendChild(card);
  });
}

// ====== Search & filter ======
function applyFilters() {
  const searchText = (searchInput.value || "").toLowerCase();
  const genreValue = genreFilter.value;

  filteredMovies = movies.filter((m) => {
    const matchesSearch =
      !searchText ||
      m.title.toLowerCase().includes(searchText) ||
      (m.description || "").toLowerCase().includes(searchText);

    const matchesGenre = !genreValue || m.genre === genreValue;

    return matchesSearch && matchesGenre;
  });

  renderMovies(filteredMovies);
}

searchInput.addEventListener("input", applyFilters);
genreFilter.addEventListener("change", applyFilters);

// ====== Player modal ======
function openPlayer(movie) {
  playerTitle.textContent = movie.title || "";
  const metaParts = [];
  if (movie.year) metaParts.push(movie.year);
  if (movie.genre) metaParts.push(movie.genre);
  playerMeta.textContent = metaParts.join(" • ");
  playerDesc.textContent = movie.description || "";

  // JioAICloud video URL (public share link)
  playerVideo.src = movie.source;
  playerVideo.currentTime = 0;
  playerVideo
    .play()
    .catch(() => {
      // autoplay might fail; ignore
    });

  playerModal.classList.remove("hidden");
}

function closePlayer() {
  playerVideo.pause();
  playerVideo.src = "";
  playerModal.classList.add("hidden");
}

closeModalBtn.addEventListener("click", closePlayer);
playerModal.addEventListener("click", (e) => {
  if (e.target === playerModal) {
    closePlayer();
  }
});

// ====== Admin toggle ======
adminToggleBtn.addEventListener("click", () => {
  if (!isAdmin) {
    const enteredAdmin = window.prompt("Enter admin code:");
    if (enteredAdmin === ADMIN_CODE) {
      isAdmin = true;
      adminPanel.classList.remove("hidden");
      adminToggleBtn.textContent = "Admin (ON)";
    } else if (enteredAdmin) {
      window.alert("Wrong admin code.");
    }
  } else {
    // toggle visibility
    if (adminPanel.classList.contains("hidden")) {
      adminPanel.classList.remove("hidden");
      adminToggleBtn.textContent = "Admin (ON)";
    } else {
      adminPanel.classList.add("hidden");
      adminToggleBtn.textContent = "Admin";
    }
  }
});

// ====== Admin form: generate JSON + update in-memory list ======
adminForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = adminTitleInput.value.trim();
  const year = adminYearInput.value
    ? Number(adminYearInput.value)
    : undefined;
  const genre = adminGenreInput.value.trim();
  const description = adminDescInput.value.trim();
  const thumbnail = adminThumbInput.value.trim();
  const source = adminSourceInput.value.trim();

  if (!title || !source) {
    window.alert("Title and JioAICloud Video URL are required.");
    return;
  }

  // simple id generator
  const idBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const id = `${idBase}-${Date.now()}`;

  const movieEntry = {
    id,
    title,
    year: year || null,
    genre: genre || "",
    description,
    thumbnail,
    source,
  };

  // pretty JSON block for movies.json
  const jsonBlock = JSON.stringify(movieEntry, null, 2);
  adminOutput.value = jsonBlock;

  // add to in-memory list so you see it instantly
  movies.push(movieEntry);
  applyFilters();

  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ====== Init ======
document.addEventListener("DOMContentLoaded", () => {
  loadMovies();
});

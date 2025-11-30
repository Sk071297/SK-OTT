// ====== Configuration ======
const ACCESS_CODE = "sk1234";    // viewer code – change this
const ADMIN_CODE = "skadmin567"; // admin code – change this

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
const reloadBtn = document.getElementById("reload-btn");

const playerModal = document.getElementById("player-modal");
const closeModalBtn = document.getElementById("close-modal");
const playerTitle = document.getElementById("player-title");
const playerMeta = document.getElementById("player-meta");
const playerDesc = document.getElementById("player-desc");
const playerVideo = document.getElementById("player-video");
const playerLoading = document.getElementById("player-loading");
const playerError = document.getElementById("player-error");

// Admin elements
const adminToggleBtn = document.getElementById("admin-toggle");
const adminPanel = document.getElementById("admin-panel");
const adminForm = document.getElementById("admin-form");
const adminTitleInput = document.getElementById("admin-title");
const adminYearInput = document.getElementById("admin-year");
const adminGenreSelect = document.getElementById("admin-genre");
const customGenreRow = document.getElementById("custom-genre-row");
const adminGenreCustomInput = document.getElementById("admin-genre-custom");
const adminDescInput = document.getElementById("admin-desc");
const adminThumbInput = document.getElementById("admin-thumb");
const thumbPreview = document.getElementById("thumb-preview");
const adminSourceInput = document.getElementById("admin-source");
const adminOutput = document.getElementById("admin-output");
const adminOutputFull = document.getElementById("admin-output-full");

// ========= Helper: convert Drive URL / ID → direct video URL =========
function toDriveVideoUrl(raw) {
  if (!raw) return "";

  const trimmed = raw.trim();

  // Already direct
  if (trimmed.startsWith("https://drive.google.com/uc?")) {
    return trimmed;
  }

  let fileId = trimmed;

  // /file/d/FILE_ID/view
  const fileMatch = trimmed.match(/\/file\/d\/([^/]+)\//);
  if (fileMatch && fileMatch[1]) {
    fileId = fileMatch[1];
  }

  // ?id=FILE_ID
  const openMatch = trimmed.match(/[?&]id=([^&]+)/);
  if (openMatch && openMatch[1]) {
    fileId = openMatch[1];
  }

  // If just ID, we use as is
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// ====== Password gate ======
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
  if (e.key === "Enter") tryUnlock();
});

// ====== Load movies from movies.json ======
async function loadMovies() {
  try {
    const res = await fetch("movies.json?t=" + Date.now()); // bust cache
    if (!res.ok) {
      throw new Error("Failed to load movies.json");
    }
    const data = await res.json();

    movies = (data || []).map((m) => ({
      ...m,
      source: toDriveVideoUrl(m.source || "")
    }));

    filteredMovies = movies;
    renderMovies(filteredMovies);
    updateAdminFullJson();
  } catch (err) {
    console.error(err);
    movieList.innerHTML =
      "<p>Could not load movies. Check movies.json.</p>";
  }
}

// ====== Render grid ======
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
    img.src =
      movie.thumbnail ||
      "https://via.placeholder.com/300x450?text=SK+Movie";
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

    const matchesGenre =
      !genreValue || (m.genre || "").toLowerCase() === genreValue.toLowerCase();

    return matchesSearch && matchesGenre;
  });

  renderMovies(filteredMovies);
}

searchInput.addEventListener("input", applyFilters);
genreFilter.addEventListener("change", applyFilters);
reloadBtn.addEventListener("click", () => {
  loadMovies();
});

// ====== Player modal (improved) ======
function showLoading() {
  playerLoading.classList.remove("hidden");
}

function hideLoading() {
  playerLoading.classList.add("hidden");
}

function showError(msg) {
  playerError.textContent = msg || "Error playing this video.";
  playerError.classList.remove("hidden");
}

function clearError() {
  playerError.textContent = "";
  playerError.classList.add("hidden");
}

function openPlayer(movie) {
  playerTitle.textContent = movie.title || "";
  const metaParts = [];
  if (movie.year) metaParts.push(movie.year);
  if (movie.genre) metaParts.push(movie.genre);
  playerMeta.textContent = metaParts.join(" • ");
  playerDesc.textContent = movie.description || "";

  clearError();
  showLoading();

  playerVideo.poster = movie.thumbnail || "";
  playerVideo.src = movie.source;
  playerVideo.currentTime = 0;

  playerVideo
    .play()
    .catch(() => {
      // Autoplay blocked is not a real error; we just stop loading
      hideLoading();
    });

  playerModal.classList.remove("hidden");
}

function closePlayer() {
  playerVideo.pause();
  playerVideo.src = "";
  hideLoading();
  clearError();
  playerModal.classList.add("hidden");
}

closeModalBtn.addEventListener("click", closePlayer);
playerModal.addEventListener("click", (e) => {
  if (e.target === playerModal) {
    closePlayer();
  }
});

// Video events for loading / error UX
playerVideo.addEventListener("waiting", showLoading);
playerVideo.addEventListener("loadstart", showLoading);
playerVideo.addEventListener("canplay", hideLoading);
playerVideo.addEventListener("playing", hideLoading);
playerVideo.addEventListener("pause", hideLoading);
playerVideo.addEventListener("ended", hideLoading);

playerVideo.addEventListener("error", () => {
  hideLoading();
  showError(
    "Unable to load video. Check that the Google Drive link is correct and shared as 'Anyone with the link – Viewer'."
  );
});

// ====== Admin toggle ======
adminToggleBtn.addEventListener("click", () => {
  if (!isAdmin) {
    const enteredAdmin = window.prompt("Enter admin code:");
    if (enteredAdmin === ADMIN_CODE) {
      isAdmin = true;
      adminPanel.classList.remove("hidden");
      adminToggleBtn.textContent = "Admin (ON)";
      updateAdminFullJson();
    } else if (enteredAdmin) {
      window.alert("Wrong admin code.");
    }
  } else {
    if (adminPanel.classList.contains("hidden")) {
      adminPanel.classList.remove("hidden");
      adminToggleBtn.textContent = "Admin (ON)";
    } else {
      adminPanel.classList.add("hidden");
      adminToggleBtn.textContent = "Admin";
    }
  }
});

// Genre: show custom input when "Other" selected
adminGenreSelect.addEventListener("change", () => {
  if (adminGenreSelect.value === "Other") {
    customGenreRow.classList.remove("hidden");
  } else {
    customGenreRow.classList.add("hidden");
  }
});

// Thumbnail preview
adminThumbInput.addEventListener("input", () => {
  const url = adminThumbInput.value.trim();
  if (!url) {
    thumbPreview.src = "";
    return;
  }
  thumbPreview.src = url;
});

// ====== Admin form: generate JSON + update in-memory list ======
adminForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = adminTitleInput.value.trim();
  const year = adminYearInput.value
    ? Number(adminYearInput.value)
    : undefined;
  let genre = adminGenreSelect.value;
  if (genre === "Other") {
    genre = adminGenreCustomInput.value.trim();
  }
  const description = adminDescInput.value.trim();
  const thumbnail = adminThumbInput.value.trim();
  const rawSource = adminSourceInput.value.trim();

  if (!title || !rawSource) {
    window.alert(
      "Title and Google Drive link/File ID are required."
    );
    return;
  }

  const source = toDriveVideoUrl(rawSource);

  const idBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const id = `${idBase}-${Date.now()}`;

  const movieEntry = {
    id,
    title,
    year: year || null,
    genre: genre || "",
    description,
    thumbnail,
    source
  };

  const jsonBlock = JSON.stringify(movieEntry, null, 2);
  adminOutput.value = jsonBlock;

  // Add to current list so you see it immediately
  movies.push(movieEntry);
  applyFilters();
  updateAdminFullJson();

  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ====== Admin helper: full movies.json preview ======
function updateAdminFullJson() {
  if (!Array.isArray(movies) || movies.length === 0) {
    adminOutputFull.value = "[]";
    return;
  }
  adminOutputFull.value = JSON.stringify(movies, null, 2);
}

// ====== Init ======
document.addEventListener("DOMContentLoaded", () => {
  loadMovies();
});

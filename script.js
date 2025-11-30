// ====== Configuration ======
const ACCESS_CODE = "sk1234";    // viewer code – change this
const ADMIN_CODE = "skadmin567"; // admin code – change this

let movies = [];
let filteredMovies = [];
let isAdmin = false;

// Supabase client will be set after DOMContentLoaded
let supabaseClient = null;

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
const adminSourcePreview = document.getElementById("admin-source-preview");
const adminMovieList = document.getElementById("admin-movie-list");

// ========= Helper: convert Drive URL / ID → direct video URL =========
function toDriveVideoUrl(raw) {
  if (!raw) return "";

  const trimmed = raw.trim();

  // Already direct uc link
  if (trimmed.startsWith("https://drive.google.com/uc?")) {
    return trimmed;
  }

  let fileId = trimmed;

  // /file/d/FILE_ID/view
  const fileMatch = trimmed.match(/\/file\/d\/([^/]+)\//);
  if (fileMatch && fileMatch[1]) {
    fileId = fileMatch[1];
  }

  // open?id=FILE_ID
  const openMatch = trimmed.match(/[?&]id=([^&]+)/);
  if (openMatch && openMatch[1]) {
    fileId = openMatch[1];
  }

  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// ====== Source preview in admin (auto from Drive link) ======
function updateSourcePreview() {
  const raw = adminSourceInput.value.trim();
  const url = toDriveVideoUrl(raw);
  if (adminSourcePreview) {
    adminSourcePreview.value = url || "";
  }
}

if (adminSourceInput) {
  adminSourceInput.addEventListener("input", updateSourcePreview);
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

// ====== Load movies from Supabase ======
async function loadMovies() {
  if (!supabaseClient) {
    movieList.innerHTML =
      "<p>Supabase not initialized. Check URL and anon key in index.html.</p>";
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase select error:", error);
      movieList.innerHTML =
        "<p>Could not load movies from Supabase. Check console.</p>";
      return;
    }

    movies = (data || []).map((m) => ({
      id: m.id,
      title: m.title || "",
      year: m.year || null,
      genre: m.genre || "",
      description: m.description || "",
      thumbnail: m.thumbnail || "",
      source: toDriveVideoUrl(m.source || "")
    }));

    filteredMovies = movies;
    renderMovies(filteredMovies);
    renderAdminMovieList();
  } catch (err) {
    console.error("Unexpected error loading movies:", err);
    movieList.innerHTML =
      "<p>Unexpected error loading movies. Check console.</p>";
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

// ====== Admin movie list (for delete) ======
function renderAdminMovieList() {
  if (!adminMovieList) return;

  if (!movies || movies.length === 0) {
    adminMovieList.innerHTML =
      "<p class='admin-hint'>No movies in database yet. Add a movie above.</p>";
    return;
  }

  adminMovieList.innerHTML = "";

  movies.forEach((m) => {
    const item = document.createElement("div");
    item.className = "admin-movie-item";

    const main = document.createElement("div");
    main.className = "admin-movie-main";

    const title = document.createElement("div");
    title.className = "admin-movie-title";
    title.textContent = m.title || "(No title)";

    const meta = document.createElement("div");
    meta.className = "admin-movie-meta";
    const parts = [];
    if (m.year) parts.push(m.year);
    if (m.genre) parts.push(m.genre);
    meta.textContent = parts.join(" • ");

    const idLine = document.createElement("div");
    idLine.className = "admin-movie-id";
    idLine.textContent = `ID: ${m.id || ""}`;

    main.appendChild(title);
    main.appendChild(meta);
    main.appendChild(idLine);

    const delBtn = document.createElement("button");
    delBtn.className = "admin-delete-btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteMovie(m.id));

    item.appendChild(main);
    item.appendChild(delBtn);

    adminMovieList.appendChild(item);
  });
}

async function deleteMovie(id) {
  if (!id || !supabaseClient) return;
  const ok = window.confirm(
    "Delete this movie from Supabase? This cannot be undone."
  );
  if (!ok) return;

  try {
    const { error } = await supabaseClient
      .from("movies")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      alert("Failed to delete movie. Check console.");
      return;
    }

    await loadMovies();
  } catch (err) {
    console.error("Unexpected delete error:", err);
    alert("Unexpected error while deleting. Check console.");
  }
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
      !genreValue ||
      (m.genre || "").toLowerCase() === genreValue.toLowerCase();

    return matchesSearch && matchesGenre;
  });

  renderMovies(filteredMovies);
}

searchInput.addEventListener("input", applyFilters);
genreFilter.addEventListener("change", applyFilters);
reloadBtn.addEventListener("click", () => {
  loadMovies();
});

// ====== Player modal ======
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
      hideLoading(); // autoplay blocked is not fatal
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
      renderAdminMovieList();
    } else if (enteredAdmin) {
      window.alert("Wrong admin code.");
    }
  } else {
    if (adminPanel.classList.contains("hidden")) {
      adminPanel.classList.remove("hidden");
      adminToggleBtn.textContent = "Admin (ON)";
      renderAdminMovieList();
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
    adminGenreCustomInput.focus();
  } else {
    customGenreRow.classList.add("hidden");
  }
});

// Thumbnail preview
adminThumbInput.addEventListener("input", () => {
  const url = adminThumbInput.value.trim();
  thumbPreview.src = url || "";
});

// ====== Save movie to Supabase (with detailed error) ======
async function saveMovieToSupabase(entry) {
  if (!supabaseClient) {
    alert("Supabase not initialized – check config.");
    throw new Error("Supabase client missing");
  }

  const { data, error } = await supabaseClient
    .from("movies")
    .insert([
      {
        title: entry.title,
        year: entry.year,
        genre: entry.genre,
        description: entry.description,
        thumbnail: entry.thumbnail,
        source: entry.source
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    alert(
      "Supabase insert error: " +
        (error.message || JSON.stringify(error))
    );
    throw error;
  }

  return data;
}

// ====== Admin form: add movie ======
adminForm.addEventListener("submit", async (e) => {
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
    window.alert("Title and Google Drive link/File ID are required.");
    return;
  }

  const source = toDriveVideoUrl(rawSource);
  updateSourcePreview();

  const movieEntry = {
    title,
    year: year || null,
    genre: genre || "",
    description,
    thumbnail,
    source
  };

  try {
    await saveMovieToSupabase(movieEntry);
    await loadMovies();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error("Failed to save movie to Supabase:", err);
  }
});

// ====== Init ======
document.addEventListener("DOMContentLoaded", () => {
  supabaseClient = window.supabase || null;

  if (!supabaseClient) {
    console.error("Supabase not found on window. Check index.html config.");
  }

  loadMovies();
});

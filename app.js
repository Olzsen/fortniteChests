const $ = (s) => document.querySelector(s);
const DB_KEY = "fortniteChestTracker.players.v1";
let database = { version: 1, updated_at: null, players: {} };

function normalizeName(value) { return String(value || "").trim().toLocaleLowerCase(); }
function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}
function loadLocalDatabase() {
  try {
    const saved = JSON.parse(localStorage.getItem(DB_KEY) || "null");
    if (saved && saved.players) database = saved;
  } catch (_) {}
}
async function loadDatabase() {
  try {
    const response = await fetch("data/players.json", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const remote = await response.json();
    if (remote && remote.players) database = remote;
  } catch (_) {
    $("#status").textContent = "Не удалось загрузить опубликованную базу. Можно импортировать CSV ниже.";
  }
  loadLocalDatabase();
}
function saveLocalDatabase() {
  database.updated_at = new Date().toISOString();
  localStorage.setItem(DB_KEY, JSON.stringify(database));
}
function findPlayer(name) {
  const key = normalizeName(name);
  return Object.entries(database.players || {}).find(([id, player]) =>
    normalizeName(player.nickname || id) === key
  )?.[1];
}
function render(player) {
  $("#empty").classList.add("hidden");
  $("#profile").classList.remove("hidden");
  $("#playerName").textContent = player.nickname;
  $("#updated").textContent = player.updated_at
    ? "Обновлено: " + new Date(player.updated_at).toLocaleString("ru-RU") : "";
  $("#allTime").textContent = Number(player.all_time_chests || 0).toLocaleString("ru-RU");
  $("#current").textContent = Number(player.current_season_chests || 0).toLocaleString("ru-RU");
  $("#matches").textContent = Number(player.matches || 0).toLocaleString("ru-RU");
  $("#average").textContent = player.matches
    ? (Number(player.all_time_chests || 0) / Number(player.matches)).toFixed(2) : "0";
  const seasons = Array.isArray(player.seasons) ? player.seasons : [];
  const max = Math.max(...seasons.map(s => Number(s.chests || 0)), 1);
  $("#seasonCount").textContent = seasons.length ? seasons.length + " периодов" : "";
  $("#seasons").innerHTML = seasons.slice().sort((a, b) => Number(b.chests || 0) - Number(a.chests || 0)).map(s => {
    const count = Number(s.chests || 0);
    const matches = Number(s.matches || 0);
    return '<div class="season"><div><div class="season-name">' + esc(s.name) +
      '</div><div class="season-meta">' + matches.toLocaleString("ru-RU") +
      ' матчей</div><div class="bar"><i style="width:' +
      Math.max(2, Math.round(count / max * 100)) + '%"></i></div></div><div class="count">' +
      count.toLocaleString("ru-RU") + '</div></div>';
  }).join("") || '<p class="muted">Пока нет данных по сезонам.</p>';
}
$("#searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#status").textContent = "Ищем в загруженной базе…";
  const player = findPlayer($("#nickname").value);
  if (!player) {
    $("#profile").classList.add("hidden");
    $("#empty").classList.remove("hidden");
    $("#status").textContent = "Этого ника пока нет в базе. Импортируй CSV с replay-матчами ниже.";
    return;
  }
  $("#status").textContent = "";
  render(player);
});

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  if (rows.length < 2) throw new Error("CSV пустой или в нём нет строк матчей.");
  const headers = rows.shift().map(h => h.trim().toLowerCase());
  const chestIndex = headers.indexOf("chests");
  const recorderIndex = headers.indexOf("recorder_name");
  if (chestIndex < 0) throw new Error("В CSV нет столбца chests. Нужен файл, созданный ChestScan через --csv.");
  const data = rows.filter(r => r.length > 1).map(r => ({
    chests: Number(r[chestIndex]),
    recorder: recorderIndex >= 0 ? (r[recorderIndex] || "").trim() : ""
  })).filter(r => Number.isFinite(r.chests) && r.chests >= 0);
  if (!data.length) throw new Error("Не удалось найти матчи с числом сундуков.");
  return data;
}

$("#importForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = $("#csvFile").files[0];
  const nickname = $("#importNickname").value.trim();
  const seasonName = $("#importSeason").value.trim();
  if (!file || !nickname || !seasonName) return;
  $("#importStatus").textContent = "Читаем CSV…";
  try {
    const rows = parseCsv(await file.text());
    const key = normalizeName(nickname);
    const previous = database.players[key] || {
      nickname, all_time_chests: 0, current_season_chests: 0, matches: 0, seasons: []
    };
    const season = {
      name: seasonName,
      chests: rows.reduce((sum, item) => sum + item.chests, 0),
      matches: rows.length
    };
    const seasons = (previous.seasons || []).filter(s => normalizeName(s.name) !== normalizeName(seasonName));
    seasons.push(season);
    const totalChests = seasons.reduce((sum, item) => sum + Number(item.chests || 0), 0);
    const totalMatches = seasons.reduce((sum, item) => sum + Number(item.matches || 0), 0);
    database.players[key] = {
      nickname,
      all_time_chests: totalChests,
      current_season_chests: season.chests,
      matches: totalMatches,
      updated_at: new Date().toISOString(),
      seasons
    };
    saveLocalDatabase();
    $("#importStatus").textContent = "Добавлено " + rows.length + " матчей и " +
      season.chests.toLocaleString("ru-RU") + " сундуков. Статистика сохранена в этом браузере.";
    $("#nickname").value = nickname;
    $("#status").textContent = "";
    render(database.players[key]);
  } catch (error) {
    $("#importStatus").textContent = "Ошибка импорта: " + error.message;
  }
});

$("#exportButton").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(database, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "players.json";
  link.click();
  URL.revokeObjectURL(url);
  $("#importStatus").textContent = "Файл players.json скачан. Чтобы опубликовать статистику для друга, загрузи его в репозиторий вместо data/players.json.";
});

loadDatabase();
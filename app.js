const STORAGE_KEY = "school-football-tournament-v1";
const DEFAULT_SCHOOLS = [
  "Pegasus",
  "Kúlan",
  "Dimma",
  "Jemen",
  "Fönix",
  "Ekkó",
  "Igló",
  "Þeba",
  "Kjarninn",
];

const competitions = ["boys", "girls"];

const state = loadState();

const scheduleContainer = document.getElementById("scheduleContainer");
const standingsBody = document.querySelector("#standingsTable tbody");
const scheduleTitle = document.getElementById("scheduleTitle");
const standingsTitle = document.getElementById("standingsTitle");
const schoolsInput = document.getElementById("schoolsInput");
const saveStatus = document.getElementById("saveStatus");

initialize();

function initialize() {
  bindEvents();
  schoolsInput.value = state.schools.join("\n");
  render();
  updateSaveStatus();
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const selected = tab.dataset.competition;
      if (!selected) return;
      state.activeCompetition = selected;
      persistState();
      render();
    });
  });

  document.getElementById("applyChangesBtn").addEventListener("click", () => {
    const nextSchools = parseSchoolsText(schoolsInput.value);
    if (nextSchools.length < 1) {
      alert("Please enter at least one school name.");
      return;
    }

    const proceed = confirm(
      "This may reset scores. Do you want to apply school changes and regenerate schedules?"
    );
    if (!proceed) return;

    state.schools = nextSchools;
    regenerateSchedulesAndResetScores();
  });

  document.getElementById("regenerateBtn").addEventListener("click", () => {
    const proceed = confirm("This may reset scores. Do you want to regenerate schedule?");
    if (!proceed) return;
    regenerateSchedulesAndResetScores();
  });
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.schools) || !parsed.competitions) {
      return createInitialState();
    }

    return {
      schools: parsed.schools,
      activeCompetition: competitions.includes(parsed.activeCompetition)
        ? parsed.activeCompetition
        : "boys",
      competitions: {
        boys: sanitizeCompetitionState(parsed.competitions.boys),
        girls: sanitizeCompetitionState(parsed.competitions.girls),
      },
      lastSaved: parsed.lastSaved || null,
    };
  } catch {
    return createInitialState();
  }
}

function sanitizeCompetitionState(competitionState) {
  if (!competitionState || typeof competitionState !== "object") {
    return { schedule: [], scores: {} };
  }

  return {
    schedule: Array.isArray(competitionState.schedule) ? competitionState.schedule : [],
    scores: competitionState.scores && typeof competitionState.scores === "object" ? competitionState.scores : {},
  };
}

function createInitialState() {
  const base = {
    schools: [...DEFAULT_SCHOOLS],
    activeCompetition: "boys",
    competitions: {
      boys: { schedule: [], scores: {} },
      girls: { schedule: [], scores: {} },
    },
    lastSaved: null,
  };

  competitions.forEach((competition) => {
    base.competitions[competition].schedule = generateRoundRobin(base.schools, competition);
  });

  return base;
}

function parseSchoolsText(text) {
  const seen = new Set();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const key = line.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function regenerateSchedulesAndResetScores() {
  competitions.forEach((competition) => {
    state.competitions[competition].schedule = generateRoundRobin(state.schools, competition);
    state.competitions[competition].scores = {};
  });

  persistState();
  schoolsInput.value = state.schools.join("\n");
  render();
}

function generateRoundRobin(teams, competition) {
  if (teams.length < 2) return [];

  const workingTeams = [...teams];
  const isOdd = workingTeams.length % 2 !== 0;
  if (isOdd) workingTeams.push("BYE");

  const rounds = workingTeams.length - 1;
  const half = workingTeams.length / 2;
  const list = [...workingTeams];
  const schedule = [];

  for (let roundIdx = 0; roundIdx < rounds; roundIdx += 1) {
    const roundMatches = [];

    for (let i = 0; i < half; i += 1) {
      const homeCandidate = list[i];
      const awayCandidate = list[list.length - 1 - i];
      if (homeCandidate === "BYE" || awayCandidate === "BYE") continue;

      const home = roundIdx % 2 === 0 ? homeCandidate : awayCandidate;
      const away = roundIdx % 2 === 0 ? awayCandidate : homeCandidate;

      const id = makeMatchId(competition, roundIdx + 1, home, away);
      roundMatches.push({ id, round: roundIdx + 1, home, away });
    }

    schedule.push({ round: roundIdx + 1, matches: roundMatches });

    list.splice(1, 0, list.pop());
  }

  return schedule;
}

function makeMatchId(competition, round, home, away) {
  return [competition, round, slugify(home), slugify(away)].join("__");
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

function render() {
  renderTabs();
  renderSchedule();
  renderStandings();
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    const isActive = tab.dataset.competition === state.activeCompetition;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function renderSchedule() {
  const titlePrefix = state.activeCompetition === "boys" ? "Boys" : "Girls";
  scheduleTitle.textContent = `${titlePrefix} Schedule`;
  standingsTitle.textContent = `${titlePrefix} Standings`;

  const competitionState = state.competitions[state.activeCompetition];
  scheduleContainer.innerHTML = "";

  if (state.schools.length < 2) {
    scheduleContainer.innerHTML =
      '<div class="empty-state">Add at least two schools to generate a schedule.</div>';
    return;
  }

  competitionState.schedule.forEach((roundGroup) => {
    const roundElement = document.createElement("section");
    roundElement.className = "round";

    const heading = document.createElement("h3");
    heading.textContent = `Round ${roundGroup.round}`;
    roundElement.appendChild(heading);

    roundGroup.matches.forEach((match) => {
      const row = document.getElementById("matchTemplate").content.firstElementChild.cloneNode(true);
      row.querySelector(".teams").textContent = `${match.home} vs ${match.away}`;

      const homeInput = row.querySelector(".home-goals");
      const awayInput = row.querySelector(".away-goals");
      const clearButton = row.querySelector(".clear-score");

      const existingScore = competitionState.scores[match.id];
      homeInput.value = existingScore ? String(existingScore.homeGoals) : "";
      awayInput.value = existingScore ? String(existingScore.awayGoals) : "";

      const saveHandler = () => {
        const parsed = parseScoreInputs(homeInput.value, awayInput.value);
        if (!parsed.valid) {
          alert(parsed.message);
          const previous = competitionState.scores[match.id];
          homeInput.value = previous ? String(previous.homeGoals) : "";
          awayInput.value = previous ? String(previous.awayGoals) : "";
          return;
        }

        if (parsed.homeGoals === null || parsed.awayGoals === null) {
          delete competitionState.scores[match.id];
        } else {
          competitionState.scores[match.id] = {
            homeGoals: parsed.homeGoals,
            awayGoals: parsed.awayGoals,
          };
        }

        persistState();
        renderStandings();
      };

      homeInput.addEventListener("change", saveHandler);
      awayInput.addEventListener("change", saveHandler);

      clearButton.addEventListener("click", () => {
        delete competitionState.scores[match.id];
        homeInput.value = "";
        awayInput.value = "";
        persistState();
        renderStandings();
      });

      roundElement.appendChild(row);
    });

    scheduleContainer.appendChild(roundElement);
  });
}

function parseScoreInputs(homeRaw, awayRaw) {
  const homeTrimmed = homeRaw.trim();
  const awayTrimmed = awayRaw.trim();

  if (homeTrimmed === "" && awayTrimmed === "") {
    return { valid: true, homeGoals: null, awayGoals: null };
  }

  if (homeTrimmed === "" || awayTrimmed === "") {
    return { valid: false, message: "Enter both scores, or leave both blank." };
  }

  if (!/^\d+$/.test(homeTrimmed) || !/^\d+$/.test(awayTrimmed)) {
    return { valid: false, message: "Scores must be non-negative integers." };
  }

  return {
    valid: true,
    homeGoals: Number(homeTrimmed),
    awayGoals: Number(awayTrimmed),
  };
}

function renderStandings() {
  standingsBody.innerHTML = "";

  const competitionState = state.competitions[state.activeCompetition];
  const teams = [...state.schools];

  if (teams.length < 2) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 9;
    cell.textContent = "No standings yet. Add at least two schools.";
    row.appendChild(cell);
    standingsBody.appendChild(row);
    return;
  }

  const table = Object.fromEntries(
    teams.map((team) => [
      team,
      { team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 },
    ])
  );

  competitionState.schedule.forEach((round) => {
    round.matches.forEach((match) => {
      const score = competitionState.scores[match.id];
      if (!score) return;

      const homeRow = table[match.home];
      const awayRow = table[match.away];
      if (!homeRow || !awayRow) return;

      homeRow.played += 1;
      awayRow.played += 1;
      homeRow.gf += score.homeGoals;
      homeRow.ga += score.awayGoals;
      awayRow.gf += score.awayGoals;
      awayRow.ga += score.homeGoals;

      if (score.homeGoals > score.awayGoals) {
        homeRow.wins += 1;
        homeRow.points += 3;
        awayRow.losses += 1;
      } else if (score.homeGoals < score.awayGoals) {
        awayRow.wins += 1;
        awayRow.points += 3;
        homeRow.losses += 1;
      } else {
        homeRow.draws += 1;
        awayRow.draws += 1;
        homeRow.points += 1;
        awayRow.points += 1;
      }
    });
  });

  const sorted = Object.values(table)
    .map((row) => ({ ...row, gd: row.gf - row.ga }))
    .sort(
      (a, b) =>
        b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    );

  sorted.forEach((rowData) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rowData.team}</td>
      <td>${rowData.played}</td>
      <td>${rowData.wins}</td>
      <td>${rowData.draws}</td>
      <td>${rowData.losses}</td>
      <td>${rowData.gf}</td>
      <td>${rowData.ga}</td>
      <td>${rowData.gd}</td>
      <td>${rowData.points}</td>
    `;
    standingsBody.appendChild(tr);
  });
}

function persistState() {
  state.lastSaved = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateSaveStatus();
}

function updateSaveStatus() {
  if (!state.lastSaved) {
    saveStatus.textContent = "Not saved yet";
    return;
  }

  const stamp = new Date(state.lastSaved);
  if (Number.isNaN(stamp.getTime())) {
    saveStatus.textContent = "Saved";
    return;
  }

  saveStatus.textContent = `Saved • Last saved ${stamp.toLocaleString()}`;
}

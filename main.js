// --------------------
// Main Leaderboard Code
// --------------------
let entries = JSON.parse(localStorage.getItem("leaderboardEntries")) || [];
let scramble = localStorage.getItem("leaderboardScramble") ?? generateScramble();

const form = document.getElementById("entryForm");
const leaderboardBody = document.querySelector("#leaderboard ul");
const aggregatedBody = document.querySelector("#aggregatedLeaderboard tbody");
const scrambleBody = document.querySelector('#scramble');
const timeInput = document.getElementById("time");

updateLeaderboard();
updateAggregatedLeaderboard();

form.addEventListener("submit", function (event) {
  event.preventDefault();
  const initialsInput = document.getElementById("initials");
  const initials = initialsInput.value.toUpperCase().trim();
  const timeValue = timeInput.value.trim();
  let time = 0;

  // Parse time as "mm:ss" or seconds
  if (timeValue.includes(":")) {
    const parts = timeValue.split(":");
    if (parts.length === 2) {
      const minutes = parseFloat(parts[0]);
      const seconds = parseFloat(parts[1]);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        time = minutes * 60 + seconds;
      }
    }
  } else {
    time = parseFloat(timeValue);
  }

  if (initials && !isNaN(time) && time > 0) {
    entries.push({ initials, time });
    entries.sort((a, b) => a.time - b.time);
    updateLeaderboard();
    updateAggregatedLeaderboard();
    updateStorage();
    form.reset();
  } else {
    alert("Please enter valid initials and time.");
  }
});

function updateLeaderboard() {
  leaderboardBody.innerHTML = "";
  entries?.forEach((entry, index) => {
    const row = document.createElement("li");
    row.className = "leaderboard-entry";

    const rankEl = document.createElement("span");
    rankEl.className = "leaderboard-rank";
    rankEl.textContent = `${index + 1}.`;
    row.appendChild(rankEl);

    const initialsEl = document.createElement("span");
    initialsEl.className = "leaderboard-initials";
    initialsEl.textContent = entry.initials;
    row.appendChild(initialsEl);

    const timeEl = document.createElement("span");
    timeEl.className = "leaderboard-times";
    timeEl.textContent = `${entry.time.toFixed(2)}`;
    row.appendChild(timeEl);


    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", () => {
      entries.splice(index, 1);
      updateLeaderboard();
      updateAggregatedLeaderboard();
      updateStorage();
    });
    rankEl.appendChild(deleteBtn);

    leaderboardBody.appendChild(row);
  });
}

function updateAggregatedLeaderboard() {
  const aggregated = {};
  entries.forEach((entry) => {
    if (aggregated[entry.initials]) {
      aggregated[entry.initials].sum += entry.time;
      aggregated[entry.initials].count++;
    } else {
      aggregated[entry.initials] = { sum: entry.time, count: 1 };
    }
  });

  const aggregatedData = Object.keys(aggregated).map((initials) => ({
    initials,
    avgTime: aggregated[initials].sum / aggregated[initials].count,
  }));

  aggregatedData.sort((a, b) => a.avgTime - b.avgTime);

  aggregatedBody.innerHTML = "";
  aggregatedData.forEach((item) => {
    const row = document.createElement("tr");

    const initialsCell = document.createElement("td");
    initialsCell.textContent = item.initials;
    row.appendChild(initialsCell);

    const avgTimeCell = document.createElement("td");
    avgTimeCell.textContent = item.avgTime.toFixed(2);
    row.appendChild(avgTimeCell);

    aggregatedBody.appendChild(row);
  });
}

// Helper function to generate a UUID (used for a unique user id)
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Returns the stored userId or generates a new one if not present.
function getAndSetUserId(uuid) {
  let userId = localStorage.getItem("userId");

  if (uuid && uuid !== userId) {
    userId = uuid;
    localStorage.setItem("userId", userId);
  } else {
    if (!userId) {
      userId = generateUUID();
      localStorage.setItem("userId", userId);
    }
  }

  return userId;
}

function updateLocalStorage() {
  localStorage.setItem("leaderboardEntries", JSON.stringify(entries));
  localStorage.setItem("leaderboardScramble", scramble);
  getAndSetUserId();
}

function updateStorage() {
  updateLocalStorage();

  const data = JSON.stringify({ entries, scramble }); // 'entries' is your leaderboard data array
  const encodedData = btoa(data); // Encode it in base64 for URL compatibility

  const uuid = getAndSetUserId();

  return fetch("https://lambdas-black.vercel.app/api/cavecubers", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid, encodedData }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to save leaderboard data.");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Leaderboard saved:", data);
      return data;
    })
    .catch((err) => {
      console.error("Error saving leaderboard:", err);
    });
}

// MAIN TIMER CODE

const startMainTimerBtn = document.getElementById("main-timer-btn");

let mainTimerStarted = false;
let mainTimerStartTime = null;
let mainTimerInterval = null;

const startMainTimer = () => {
  if (!mainTimerStarted) {
    startMainTimerBtn.focus();
    mainTimerStarted = true;
    mainTimerStartTime = Date.now();
    mainTimerInterval = setInterval(updateMainTimer, 1);
  } else {
    if (mainTimerInterval) {
      clearInterval(mainTimerInterval);
    }
    mainTimerStarted = false;
    mainTimerStartTime = null;
  }
}

const updateMainTimer = () => {
  if (mainTimerStarted) {
    const elapsed = (Date.now() - mainTimerStartTime) / 1000;
    startMainTimerBtn.textContent = elapsed.toFixed(2);
    timeInput.value = elapsed.toFixed(2);
  }
}

// --------------------
// Tournament Mode Code
// --------------------
let tournamentParticipants = [];
let tournamentStarted = false;
let tournamentStartTime = null;
let tournamentTimerInterval = null;

const tournamentForm = document.getElementById("tournamentForm");
const tournamentTableBody = document.querySelector("#tournamentTable tbody");
const tournamentTimerDisplay = document.getElementById("tournamentTimer");
const startTournamentBtn = document.getElementById("startTournamentBtn");
const resetTournamentBtn = document.getElementById("resetTournamentBtn");

tournamentForm.addEventListener("submit", function (e) {
  e.preventDefault();
  if (tournamentStarted) return false;
  const initials = document.getElementById("tournamentInitials").value.toUpperCase().trim();
  if (initials) {
    tournamentParticipants.push({ initials, finishTime: null });
    updateTournamentTable();
    tournamentForm.reset();
  }
  return false;
});

startTournamentBtn.addEventListener("click", function () {
  if (tournamentParticipants.length === 0) {
    alert("Add at least one participant before starting the tournament.");
    return;
  }
  if (!tournamentStarted) {
    tournamentStarted = true;
    tournamentStartTime = Date.now();
    tournamentTimerInterval = setInterval(updateTournamentTimer, 1);
    // Disable further additions and starting again
    tournamentForm.querySelector("button").disabled = true;
    startTournamentBtn.disabled = true;
    updateTournamentTable(); // refresh to show stop buttons
  }
});

function updateTournamentTimer() {
  if (tournamentStarted) {
    const elapsed = (Date.now() - tournamentStartTime) / 1000;
    tournamentTimerDisplay.textContent = elapsed.toFixed(2);
  }
}

function updateTournamentTable() {
  tournamentTableBody.innerHTML = "";
  tournamentParticipants.forEach((participant, index) => {
    const row = document.createElement("tr");

    const initialsCell = document.createElement("td");
    initialsCell.textContent = participant.initials;
    row.appendChild(initialsCell);

    const timeCell = document.createElement("td");
    timeCell.textContent = participant.finishTime !== null ? participant.finishTime.toFixed(2) : "-";
    row.appendChild(timeCell);

    const actionCell = document.createElement("td");
    if (tournamentStarted && participant.finishTime === null) {
      const stopBtn = document.createElement("button");
      stopBtn.textContent = "Stop Timer";
      stopBtn.className = "stop-btn";
      stopBtn.addEventListener("click", function () {
        const finishTime = (Date.now() - tournamentStartTime) / 1000;
        participant.finishTime = finishTime;
        updateTournamentTable();
        // Add result to main leaderboard
        entries.push({ initials: participant.initials, time: finishTime });
        entries.sort((a, b) => a.time - b.time);
        updateLeaderboard();
        updateAggregatedLeaderboard();
        updateStorage();
        // If every participant has finished, stop the main tournament timer
        if (tournamentParticipants.every((p) => p.finishTime !== null)) {
          clearInterval(tournamentTimerInterval);
        }
      });
      actionCell.appendChild(stopBtn);
    } else {
      actionCell.textContent = "-";
    }
    row.appendChild(actionCell);
    tournamentTableBody.appendChild(row);
  });
}

// Reset Tournament Button Handler
resetTournamentBtn.addEventListener("click", function () {
  // Stop the timer if it's still running
  if (tournamentTimerInterval) {
    clearInterval(tournamentTimerInterval);
  }
  // Reset tournament variables
  tournamentParticipants = [];
  tournamentStarted = false;
  tournamentStartTime = null;
  tournamentTimerDisplay.textContent = "0.00";

  // Re-enable tournament form and start button
  tournamentForm.querySelector("button").disabled = false;
  startTournamentBtn.disabled = false;

  // Clear the tournament table
  updateTournamentTable();
});

// Call this function to generate a shareable URL with the current leaderboard data.
function generateShareableURL() {
  // const data = JSON.stringify(entries); // 'entries' is your leaderboard data array
  // const encoded = btoa(data); // Encode it in base64 for URL compatibility
  const uuid = getAndSetUserId();
  const url = `${window.location.origin}${window.location.pathname}?uuid=${uuid}`;
  return url;
}

// Call this function on page load to check for shared data in the URL and load it.
function loadSharedData(newScramble = null) {
  const params = new URLSearchParams(window.location.search);
  if (params.has("data")) {
    try {
      const decoded = atob(params.get("data"));
      const sharedData = JSON.parse(decoded);
      // Now update your leaderboard with the shared data
      entries = sharedData.entries;
      scramble = newScramble ?? sharedData.scramble;

      updateLeaderboard();
      updateAggregatedLeaderboard();
    } catch (err) {
      console.error("Failed to load shared data:", err);
    }
  } else {
    const uuid = params.has("uuid") ? getAndSetUserId(params.get("uuid")) : getAndSetUserId();

    return fetch(`https://lambdas-black.vercel.app/api/cavecubers?uuid=${uuid}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load leaderboard data.");
        }
        return response.json();
      })
      .then((res) => {
        const decoded = atob(res.data.encodedData);
        const sharedData = JSON.parse(decoded);

        entries = sharedData.entries;
        scramble = newScramble ?? sharedData.scramble;

        updateLeaderboard();
        updateAggregatedLeaderboard();
        updateScramble();

        console.log("Leaderboard loaded:", res.data);
        return res;
      })
      .catch((err) => {
        console.error("Error loading leaderboard:", err);
      });
  }
}

function copyShareableURL() {
  const url = generateShareableURL();
  navigator.clipboard
    .writeText(url)
    .then(() => {
      alert("URL copied to clipboard!");
    })
    .catch((err) => {
      console.error("Error copying text: ", err);
    });
}

function generateScramble() {
  // Define the six face moves.
  const moves = ["U", "D", "L", "R", "F", "B"];

  // Group moves into axes: U/D, L/R, and F/B.
  const groups = {
    U: "UD",
    D: "UD",
    L: "LR",
    R: "LR",
    F: "FB",
    B: "FB",
  };

  const scrambleLength = 25; // Standard WCA scramble length for 3x3.
  const scramble = [];
  let previousMove = null;

  for (let i = 0; i < scrambleLength; i++) {
    // Filter out moves that are on the same axis as the previous move.
    const possibleMoves = moves.filter((move) => {
      return !previousMove || groups[move] !== groups[previousMove];
    });

    // Randomly select one move from the allowed moves.
    const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    // Randomly choose a modifier: 90° (nothing), 180° ("2"), or counterclockwise (apostrophe).
    const modifiers = ["", "'", "2"];
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];

    scramble.push(move + modifier);
    previousMove = move;
  }

  return scramble.join(" ");
}

const updateScramble = () => {
  localStorage.setItem("leaderboardScramble", scramble);
  scrambleBody.textContent = scramble;
}

const regenerateScramble = () => {
  scramble = generateScramble();
  loadSharedData(scramble);
  updateStorage();
}


function onKeyPress(keys, callback) {
  document.addEventListener('keydown', (event) => {
    // Convert event.key to lowercase and check if it's in the keys array (case-insensitive)
    if (keys.some(key => key.toLowerCase() === event.key.toLowerCase())) {
      callback();
    }
  });
}

function initEverything() {
  loadSharedData();
  updateScramble();

  onKeyPress(['b'], startMainTimer);
}

window.onload = initEverything;

// start polling every 5 seconds
let pollingId = setInterval(loadSharedData, 3000);
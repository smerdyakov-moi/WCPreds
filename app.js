console.log("1. App.js is starting...");

const firebaseConfig = {
  apiKey: "AIzaSyARnW-6JxIrV6v6Wn1-aVewAIWh3_NSI48",
  authDomain: "wcpredictor-594ee.firebaseapp.com",
  projectId: "wcpredictor-594ee",
  storageBucket: "wcpredictor-594ee.firebasestorage.app",
  messagingSenderId: "34828140064",
  appId: "1:34828140064:web:224330790641e627f9c645"
};

let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("2. Firebase initialized.");
} catch (error) {
    console.error("FIREBASE CRASHED:", error);
}

// FAKE MATCH DATA
const fakeAPIData = [
    { id: "match_01", teamA: "Brazil", teamB: "France", time: "June 30, 15:00" },
    { id: "match_02", teamA: "Argentina", teamB: "Germany", time: "July 1, 18:00" },
    { id: "match_03", teamA: "Spain", teamB: "Italy", time: "July 2, 20:00" }
];

// FAKE FINAL RESULTS (We will fetch this from the real API later)
const fakeFinalResults = {
    "match_01": { teamA_score: 3, teamB_score: 1 }, // Brazil 3 - 1 France
    "match_02": { teamA_score: 0, teamB_score: 0 },  // Argentina 0 - 0 Germany (Draw)
    "match_03": { teamA_score: 3, teamB_score: 2 }
};

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const btnPragyan = document.getElementById("btn-pragyan");
const btnNischal = document.getElementById("btn-nischal");
const displayName = document.getElementById("display-name");
const logoutLink = document.getElementById("logout-link");
const matchTableBody = document.getElementById("match-table-body");

let currentUser = "";

// Draw Matches
function renderMatches() {
    matchTableBody.innerHTML = "";
    fakeAPIData.forEach((match) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${match.teamA} vs ${match.teamB}</b><br><small>${match.time}</small></td>
            <td>
                ${match.teamA}: <input type="number" id="pred-A-${match.id}" min="0" style="width: 40px;">
                - 
                ${match.teamB}: <input type="number" id="pred-B-${match.id}" min="0" style="width: 40px;">
            </td>
            <td><button id="btn-${match.id}">Lock In</button></td>
        `;
        matchTableBody.appendChild(tr);

        const lockBtn = document.getElementById(`btn-${match.id}`);
        const inputA = document.getElementById(`pred-A-${match.id}`);
        const inputB = document.getElementById(`pred-B-${match.id}`);

        lockBtn.addEventListener("click", () => {
            const scoreA = inputA.value;
            const scoreB = inputB.value;
            if (scoreA === "" || scoreB === "") return alert("Enter a score for both teams.");

            db.collection("predictions").add({
                user: currentUser,
                matchId: match.id,
                teamA_score: parseInt(scoreA),
                teamB_score: parseInt(scoreB),
                timestamp: new Date()
            }).then(() => {
                alert("Locked!");
                inputA.disabled = true; inputB.disabled = true;
                lockBtn.disabled = true; lockBtn.innerText = "Locked";
                calculateLeaderboard(); // Recalculate points immediately
            });
        });
    });
}

// Authentication
window.onload = () => {
    renderMatches();
    try {
        const savedUser = sessionStorage.getItem("predictorUser");
        if (savedUser) logUserIn(savedUser);
    } catch (e) {}
    
    // Always calculate the leaderboard on load
    calculateLeaderboard(); 
};

btnPragyan.addEventListener("click", () => logUserIn("Pragyan"));
btnNischal.addEventListener("click", () => logUserIn("Nischal"));

function logUserIn(name) {
    currentUser = name;
    try { sessionStorage.setItem("predictorUser", name); } catch (e) {}
    displayName.innerText = currentUser;
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
    loadUserPredictions(currentUser);
}

logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    try { sessionStorage.removeItem("predictorUser"); } catch (e) {}
    currentUser = "";
    dashboard.style.display = "none";
    loginScreen.style.display = "block";
});

// Load Past Predictions
function loadUserPredictions(username) {
    if (!db) return;
    fakeAPIData.forEach((match) => {
        const inputA = document.getElementById(`pred-A-${match.id}`);
        const inputB = document.getElementById(`pred-B-${match.id}`);
        const lockBtn = document.getElementById(`btn-${match.id}`);
        if (inputA && inputB && lockBtn) {
            inputA.value = ""; inputB.value = "";
            inputA.disabled = false; inputB.disabled = false;
            lockBtn.disabled = false; lockBtn.innerText = "Lock In";
        }
    });

    db.collection("predictions").where("user", "==", username).get().then((snapshot) => {
        snapshot.forEach((doc) => {
            const data = doc.data();
            const inputA = document.getElementById(`pred-A-${data.matchId}`);
            const inputB = document.getElementById(`pred-B-${data.matchId}`);
            const lockBtn = document.getElementById(`btn-${data.matchId}`);
            if (inputA && inputB && lockBtn) {
                inputA.value = data.teamA_score; inputB.value = data.teamB_score;
                inputA.disabled = true; inputB.disabled = true;
                lockBtn.disabled = true; lockBtn.innerText = "Locked";
            }
        });
    });
}

// ---------------------------------------------------------
// NEW: The Math Engine (Leaderboard Calculator)
// ---------------------------------------------------------
function calculateLeaderboard() {
    if (!db) return;

    db.collection("predictions").get().then((snapshot) => {
        let points = { "Pragyan": 0, "Nischal": 0 };
        let allPreds = {};

        // 1. Group predictions by match
        snapshot.forEach((doc) => {
            let data = doc.data();
            if (!allPreds[data.matchId]) allPreds[data.matchId] = {};
            allPreds[data.matchId][data.user] = data;
        });

        // 2. Loop through every match that has a final result
        for (const matchId in fakeFinalResults) {
            const realResult = fakeFinalResults[matchId];
            const matchData = allPreds[matchId];
            
            if (!matchData) continue; // Nobody predicted this match yet

            let pPred = matchData["Pragyan"];
            let nPred = matchData["Nischal"];

            let pDiff = null;
            let nDiff = null;

            // -- PRAGYAN'S POINTS --
            if (pPred) {
                if (pPred.teamA_score === realResult.teamA_score && pPred.teamB_score === realResult.teamB_score) {
                    points["Pragyan"] += 5; // Rule 1: Exact
                } else {
                    let pWinner = Math.sign(pPred.teamA_score - pPred.teamB_score);
                    let rWinner = Math.sign(realResult.teamA_score - realResult.teamB_score);
                    if (pWinner === rWinner) points["Pragyan"] += 2; // Rule 2: Winner
                    
                    // Calculate Absolute Difference for Rule 3
                    pDiff = Math.abs(pPred.teamA_score - realResult.teamA_score) + Math.abs(pPred.teamB_score - realResult.teamB_score);
                }
            }

            // -- NISCHAL'S POINTS --
            if (nPred) {
                if (nPred.teamA_score === realResult.teamA_score && nPred.teamB_score === realResult.teamB_score) {
                    points["Nischal"] += 5; // Rule 1: Exact
                } else {
                    let nWinner = Math.sign(nPred.teamA_score - nPred.teamB_score);
                    let rWinner = Math.sign(realResult.teamA_score - realResult.teamB_score);
                    if (nWinner === rWinner) points["Nischal"] += 2; // Rule 2: Winner
                    
                    // Calculate Absolute Difference for Rule 3
                    nDiff = Math.abs(nPred.teamA_score - realResult.teamA_score) + Math.abs(nPred.teamB_score - realResult.teamB_score);
                }
            }

            // -- HEAD TO HEAD TIEBREAKER (Rule 3) --
            // Only runs if both players predicted, and neither got exactly 5 points
            if (pDiff !== null && nDiff !== null) {
                if (pDiff < nDiff) {
                    points["Pragyan"] += 1;
                } else if (nDiff < pDiff) {
                    points["Nischal"] += 1;
                }
            }
        }

        // 3. Update the HTML Leaderboard
        document.getElementById("points-pragyan").innerText = points["Pragyan"];
        document.getElementById("points-nischal").innerText = points["Nischal"];
    });
}
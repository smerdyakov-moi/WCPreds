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

// ==========================================
// NEW: LIVE API FETCHING ENGINE
// ==========================================
const API_KEY = "090c1fc2e99d4c49b1c4823c5645cc95";

async function fetchLiveMatches() {
    console.log("Fetching live matches from API...");
    try {
        // 1. Define the real API URL
        const targetUrl = "https://api.football-data.org/v4/competitions/2021/matches?status=SCHEDULED";
        
        // 2. Wrap it in the Developer Proxy (No encoding needed for this one)
        const proxyUrl = "https://cors-anywhere.herokuapp.com/" + targetUrl;

        // 3. Fetch through the proxy
        const response = await fetch(proxyUrl, {
            headers: { 
                "X-Auth-Token": API_KEY,
                "Origin": "http://localhost:8000" // Required by this specific proxy
            }
        });

        if (!response.ok) throw new Error(`API rejected the request. Status: ${response.status}`);

        const data = await response.json();
        
        // Grab just the first 5 upcoming matches
        const liveMatches = data.matches.slice(0, 5).map(match => ({
            id: `match_${match.id}`,
            teamA: match.homeTeam.shortName || match.homeTeam.name,
            teamB: match.awayTeam.shortName || match.awayTeam.name,
            time: new Date(match.utcDate).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})
        }));

        renderMatches(liveMatches);

    } catch (error) {
        console.error("API Error:", error);
        matchTableBody.innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;"><b>Failed to load live matches. Did you click the unlock button on CORS Anywhere?</b></td></tr>`;
    }
}

// FAKE FINAL RESULTS (You will update this later to fetch FINISHED matches)
const fakeFinalResults = {
    "match_01": { teamA_score: 3, teamB_score: 1 } 
};

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const btnPragyan = document.getElementById("btn-pragyan");
const btnNischal = document.getElementById("btn-nischal");
const displayName = document.getElementById("display-name");
const logoutLink = document.getElementById("logout-link");
const matchTableBody = document.getElementById("match-table-body");

let currentUser = "";
let currentMatchData = []; // Store the matches globally so other functions can see them

// Draw Matches Dynamically based on API Data
function renderMatches(matchData) {
    currentMatchData = matchData;
    matchTableBody.innerHTML = "";
    
    matchData.forEach((match) => {
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
                teamA: match.teamA,
                teamB: match.teamB,
                teamA_score: parseInt(scoreA),
                teamB_score: parseInt(scoreB),
                timestamp: new Date()
            }).then(() => {
                alert("Locked!");
                inputA.disabled = true; inputB.disabled = true;
                lockBtn.disabled = true; lockBtn.innerText = "Locked";
                calculateLeaderboard(); 
            });
        });
    });

    // If someone is already logged in when the API finishes loading, load their locked numbers
    if (currentUser !== "") {
        loadUserPredictions(currentUser);
    }
}

// Authentication
window.onload = () => {
    fetchLiveMatches(); // Fire the API fetch immediately when page opens

    try {
        const savedUser = sessionStorage.getItem("predictorUser");
        if (savedUser) {
            currentUser = savedUser;
            displayName.innerText = currentUser;
            loginScreen.style.display = "none";
            dashboard.style.display = "block";
        }
    } catch (e) {}
    
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
    
    // Wipe board clean
    currentMatchData.forEach((match) => {
        const inputA = document.getElementById(`pred-A-${match.id}`);
        const inputB = document.getElementById(`pred-B-${match.id}`);
        const lockBtn = document.getElementById(`btn-${match.id}`);
        if (inputA && inputB && lockBtn) {
            inputA.value = ""; inputB.value = "";
            inputA.disabled = false; inputB.disabled = false;
            lockBtn.disabled = false; lockBtn.innerText = "Lock In";
        }
    });

    // Check database
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

// Math Engine
function calculateLeaderboard() {
    if (!db) return;

    db.collection("predictions").get().then((snapshot) => {
        let points = { "Pragyan": 0, "Nischal": 0 };
        let allPreds = {};

        snapshot.forEach((doc) => {
            let data = doc.data();
            if (!allPreds[data.matchId]) allPreds[data.matchId] = {};
            allPreds[data.matchId][data.user] = data;
        });

        for (const matchId in fakeFinalResults) {
            const realResult = fakeFinalResults[matchId];
            const matchData = allPreds[matchId];
            if (!matchData) continue; 

            let pPred = matchData["Pragyan"];
            let nPred = matchData["Nischal"];
            let pDiff = null; let nDiff = null;

            if (pPred) {
                if (pPred.teamA_score === realResult.teamA_score && pPred.teamB_score === realResult.teamB_score) {
                    points["Pragyan"] += 5;
                } else {
                    let pWinner = Math.sign(pPred.teamA_score - pPred.teamB_score);
                    let rWinner = Math.sign(realResult.teamA_score - realResult.teamB_score);
                    if (pWinner === rWinner) points["Pragyan"] += 2;
                    pDiff = Math.abs(pPred.teamA_score - realResult.teamA_score) + Math.abs(pPred.teamB_score - realResult.teamB_score);
                }
            }

            if (nPred) {
                if (nPred.teamA_score === realResult.teamA_score && nPred.teamB_score === realResult.teamB_score) {
                    points["Nischal"] += 5;
                } else {
                    let nWinner = Math.sign(nPred.teamA_score - nPred.teamB_score);
                    let rWinner = Math.sign(realResult.teamA_score - realResult.teamB_score);
                    if (nWinner === rWinner) points["Nischal"] += 2;
                    nDiff = Math.abs(nPred.teamA_score - realResult.teamA_score) + Math.abs(nPred.teamB_score - realResult.teamB_score);
                }
            }

            if (pDiff !== null && nDiff !== null) {
                if (pDiff < nDiff) points["Pragyan"] += 1;
                else if (nDiff < pDiff) points["Nischal"] += 1;
            }
        }

        document.getElementById("points-pragyan").innerText = points["Pragyan"];
        document.getElementById("points-nischal").innerText = points["Nischal"];
    });
}
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

// ---------------------------------------------------------
// NEW: Fake API Data (We will replace this with a real fetch later)
// ---------------------------------------------------------
const fakeAPIData = [
    { id: "match_01", teamA: "Brazil", teamB: "France", time: "June 30, 15:00" },
    { id: "match_02", teamA: "Argentina", teamB: "Germany", time: "July 1, 18:00" },
    { id: "match_03", teamA: "Spain", teamB: "Italy", time: "July 2, 20:00" }
];

// DOM Elements
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const btnPragyan = document.getElementById("btn-pragyan");
const btnNischal = document.getElementById("btn-nischal");
const displayName = document.getElementById("display-name");
const logoutLink = document.getElementById("logout-link");
const matchTableBody = document.getElementById("match-table-body");

let currentUser = "";

// ---------------------------------------------------------
// NEW: The Dynamic Render Engine
// ---------------------------------------------------------
function renderMatches() {
    matchTableBody.innerHTML = ""; // Clear out any old HTML

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

        // Attach Database Submit Logic directly to this specific row's button
        const lockBtn = document.getElementById(`btn-${match.id}`);
        const inputA = document.getElementById(`pred-A-${match.id}`);
        const inputB = document.getElementById(`pred-B-${match.id}`);

        lockBtn.addEventListener("click", () => {
            const scoreA = inputA.value;
            const scoreB = inputB.value;

            if (scoreA === "" || scoreB === "") {
                alert("Enter a score for both teams.");
                return;
            }

            db.collection("predictions").add({
                user: currentUser,
                matchId: match.id,
                teamA: match.teamA,
                teamB: match.teamB,
                teamA_score: parseInt(scoreA),
                teamB_score: parseInt(scoreB),
                timestamp: new Date()
            })
            .then(() => {
                alert(`${match.teamA} vs ${match.teamB} locked!`);
                inputA.disabled = true;
                inputB.disabled = true;
                lockBtn.disabled = true;
                lockBtn.innerText = "Locked";
            })
            .catch((error) => console.error("Error saving:", error));
        });
    });
}

// ---------------------------------------------------------
// Authentication & UI State
// ---------------------------------------------------------
window.onload = () => {
    renderMatches(); // Draw the table immediately when the page loads
    
    try {
        const savedUser = sessionStorage.getItem("predictorUser");
        if (savedUser) logUserIn(savedUser);
    } catch (e) {}
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

// ---------------------------------------------------------
// NEW: Smart Firebase Fetching for ALL matches
// ---------------------------------------------------------
function loadUserPredictions(username) {
    if (!db) return;

    // 1. Wipe the board clean for all matches
    fakeAPIData.forEach((match) => {
        const inputA = document.getElementById(`pred-A-${match.id}`);
        const inputB = document.getElementById(`pred-B-${match.id}`);
        const lockBtn = document.getElementById(`btn-${match.id}`);
        
        if (inputA && inputB && lockBtn) {
            inputA.value = "";
            inputB.value = "";
            inputA.disabled = false;
            inputB.disabled = false;
            lockBtn.disabled = false;
            lockBtn.innerText = "Lock In";
        }
    });

    // 2. Fetch everything this user has ever predicted
    db.collection("predictions")
        .where("user", "==", username)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Find the exact row for this prediction using the saved matchId
                const inputA = document.getElementById(`pred-A-${data.matchId}`);
                const inputB = document.getElementById(`pred-B-${data.matchId}`);
                const lockBtn = document.getElementById(`btn-${data.matchId}`);

                if (inputA && inputB && lockBtn) {
                    inputA.value = data.teamA_score;
                    inputB.value = data.teamB_score;
                    inputA.disabled = true;
                    inputB.disabled = true;
                    lockBtn.disabled = true;
                    lockBtn.innerText = "Locked";
                }
            });
        })
        .catch((error) => console.error("Error fetching predictions: ", error));
}
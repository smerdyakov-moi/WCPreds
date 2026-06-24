const firebaseConfig = {
  apiKey: "AIzaSyARnW-6JxIrV6v6Wn1-aVewAIWh3_NSI48",
  authDomain: "wcpredictor-594ee.firebaseapp.com",
  projectId: "wcpredictor-594ee",
  storageBucket: "wcpredictor-594ee.firebasestorage.app",
  messagingSenderId: "34828140064",
  appId: "1:34828140064:web:224330790641e627f9c645"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = "";
let allMatches = [];

// 1. APP INITIALIZATION
window.onload = async () => {
    db.collection("scores").doc("current_standings").onSnapshot((doc) => {
        if (doc.exists) {
            document.getElementById("points-pragyan").innerText = doc.data().Pragyan || 0;
            document.getElementById("points-nischal").innerText = doc.data().Nischal || 0;
        }
    });

    try {
        const response = await fetch("/.netlify/functions/getMatches");
        if (!response.ok) throw new Error("Backend response failed");
        
        const data = await response.json();
        if (data.matches) {
            allMatches = data.matches;
            renderMatches();
            await updateLeaderboard();
        }
    } catch (err) {
        console.error("Critical Load Error:", err);
    }
};

// 2. RENDER THE TABLE
function renderMatches() {
    const tableBody = document.getElementById("match-table-body");
    tableBody.innerHTML = "";
    
    // Status filter updated to catch all upcoming match states
    allMatches.filter(m => ["SCHEDULED", "TIMED", "POSTPONED"].includes(m.status)).slice(0, 5).forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><b>${m.homeTeam.shortName} vs ${m.awayTeam.shortName}</b></td>
            <td><input type="number" id="A-${m.id}" style="width:40px;"> - <input type="number" id="B-${m.id}" style="width:40px;"></td>
            <td><button id="btn-${m.id}">Lock In</button></td>`;
        tableBody.appendChild(tr);
        document.getElementById(`btn-${m.id}`).onclick = () => savePrediction(m);
    });
}

// 3. SAVE PREDICTION
async function savePrediction(m) {
    const sA = document.getElementById(`A-${m.id}`).value;
    const sB = document.getElementById(`B-${m.id}`).value;
    
    if (!sA || !sB) return alert("Enter scores!");

    // Storing matchId as a string to match the API ID format
    await db.collection("predictions").add({
        user: currentUser, 
        matchId: String(m.id), 
        homeScore: parseInt(sA), 
        awayScore: parseInt(sB),
        timestamp: new Date()
    });
    
    alert("Locked! Updating leaderboard...");
    await updateLeaderboard();
}

// 4. THE LEADERBOARD ENGINE (Total Distance Logic)
async function updateLeaderboard() {
    const predictionsSnap = await db.collection("predictions").get();
    
    let matchGroups = {};
    predictionsSnap.forEach(doc => {
        const p = doc.data();
        if (!matchGroups[p.matchId]) matchGroups[p.matchId] = [];
        matchGroups[p.matchId].push(p);
    });

    for (const matchId in matchGroups) {
        const realMatch = allMatches.find(m => String(m.id) === String(matchId) && m.status === "FINISHED");
        if (!realMatch) continue;

        const finalA = realMatch.score.fullTime.home;
        const finalB = realMatch.score.fullTime.away;

        matchGroups[matchId].forEach(p => {
            if (p.homeScore === finalA && p.awayScore === finalB) {
                points[p.user] += 5;
            } else if (Math.sign(p.homeScore - p.awayScore) === Math.sign(finalA - finalB)) {
                points[p.user] += 2;
            }
        });

        if (matchGroups[matchId].length > 1) {
            const p1 = matchGroups[matchId][0];
            const p2 = matchGroups[matchId][1];
            
            // |Ax - Px| + |Ay - Py| logic
            const dist1 = Math.abs(finalA - p1.homeScore) + Math.abs(finalB - p1.awayScore);
            const dist2 = Math.abs(finalA - p2.homeScore) + Math.abs(finalB - p2.awayScore);

            if (dist1 < dist2) points[p1.user] += 1;
            else if (dist2 < dist1) points[p2.user] += 1;
        }
    }

    await db.collection("scores").doc("current_standings").set(points);
}

// 5. LOGIN LOGIC
function logUserIn(name) {
    currentUser = name;
    document.getElementById("display-name").innerText = name;
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
}
document.getElementById("btn-pragyan").onclick = () => logUserIn("Pragyan");
document.getElementById("btn-nischal").onclick = () => logUserIn("Nischal");
document.getElementById("logout-link").onclick = (e) => { e.preventDefault(); location.reload(); };
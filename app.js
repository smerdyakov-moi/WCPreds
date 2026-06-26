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

window.onload = async () => {
    document.getElementById("points-pragyan").innerText = "...";
    document.getElementById("points-nischal").innerText = "...";

    db.collection("scores").doc("current_standings").onSnapshot((doc) => {
        if (doc.exists) {
            document.getElementById("points-pragyan").innerText = doc.data().Pragyan || 0;
            document.getElementById("points-nischal").innerText = doc.data().Nischal || 0;
        }
    });

    db.collection("match_history").orderBy("timestamp", "desc").onSnapshot(snap => {
        const historyBody = document.getElementById("history-table-body");
        historyBody.innerHTML = "";
        snap.forEach(doc => {
            const h = doc.data();
            historyBody.innerHTML += `<tr>
                <td>${h.match}</td><td><b>${h.result}</b></td>
                <td>${h.Nischal_pred || '-'} / ${h.Nischal_points || 0}</td>
                <td>${h.Pragyan_pred || '-'} / ${h.Pragyan_points || 0}</td>
            </tr>`;
        });
    });

    try {
        const response = await fetch("/.netlify/functions/getMatches");
        const data = await response.json();
        if (data.matches) allMatches = data.matches;
        
        const savedUser = localStorage.getItem("wcUser");
        if (savedUser) logUserIn(savedUser);
        
        await updateLeaderboard();
    } catch (err) { console.error(err); }
};

async function renderMatches() {
    const tableBody = document.getElementById("match-table-body");
    tableBody.innerHTML = "";
    if (!currentUser) return;
    
    const snap = await db.collection("predictions").where("user", "==", currentUser).get();
    const userPredictions = new Map();
    snap.forEach(doc => userPredictions.set(doc.data().matchId, doc.data()));

    allMatches.filter(m => ["SCHEDULED", "TIMED", "POSTPONED"].includes(m.status)).slice(0, 5).forEach(m => {
        const p = userPredictions.get(String(m.id));
        const isLocked = !!p;
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><b>${m.homeTeam.tla} vs ${m.awayTeam.tla}</b></td>
            <td>${isLocked ? `<b>${p.homeScore} - ${p.awayScore}</b>` : `<input type="number" id="A-${m.id}" style="width:40px;"> - <input type="number" id="B-${m.id}" style="width:40px;">`}</td>
            <td><button id="btn-${m.id}" ${isLocked ? 'disabled style="background-color: #808080; cursor: not-allowed;"' : ''}>${isLocked ? 'Locked' : 'Lock In'}</button></td>`;
        tableBody.appendChild(tr);
        if (!isLocked) document.getElementById(`btn-${m.id}`).onclick = () => savePrediction(m);
    });
}

async function savePrediction(m) {
    const sA = document.getElementById(`A-${m.id}`).value;
    const sB = document.getElementById(`B-${m.id}`).value;
    if (!sA || !sB) return alert("Enter scores!");
    
    await db.collection("predictions").doc(`${currentUser}_${m.id}`).set({
        user: currentUser, matchId: String(m.id), homeScore: parseInt(sA), awayScore: parseInt(sB), timestamp: new Date()
    });
    
    alert("Locked!");
    await renderMatches(); 
    await updateLeaderboard();
}

async function updateLeaderboard() {
    const scoreDoc = await db.collection("scores").doc("current_standings").get();
    let points = scoreDoc.exists ? scoreDoc.data() : { "Pragyan": 0, "Nischal": 0 };
    
    const predictionsSnap = await db.collection("predictions").get();
    let matchGroups = {};
    predictionsSnap.forEach(doc => {
        const p = doc.data();
        if (!matchGroups[p.matchId]) matchGroups[p.matchId] = [];
        matchGroups[p.matchId].push(p);
    });

    for (const matchId in matchGroups) {
        const realMatch = allMatches.find(m => String(m.id) === String(matchId) && m.status === "FINISHED");
        if (!realMatch || (await db.collection("match_history").doc(matchId).get()).exists) continue;

        const finalA = realMatch.score.fullTime.home;
        const finalB = realMatch.score.fullTime.away;
        let historyData = { 
            match: realMatch.homeTeam.tla + " vs " + realMatch.awayTeam.tla, 
            result: finalA + "-" + finalB, 
            timestamp: new Date() 
        };

        // Calculate base points (5 for exact, 2 for outcome)
        matchGroups[matchId].forEach(p => {
            historyData[p.user + "_pred"] = p.homeScore + "-" + p.awayScore;
            if (!points.hasOwnProperty(p.user)) points[p.user] = 0;
            
            let earned = 0;
            if (p.homeScore === finalA && p.awayScore === finalB) earned = 5;
            else if (Math.sign(p.homeScore - p.awayScore) === Math.sign(finalA - finalB)) earned = 2;
            
            points[p.user] += earned;
            historyData[p.user + "_points"] = earned;
        });

        // Determine if anyone got the exact score to block proximity bonus
        const anyoneGotExact = matchGroups[matchId].some(p => p.homeScore === finalA && p.awayScore === finalB);

        // Apply proximity bonus only if NO ONE got an exact score
        if (!anyoneGotExact && matchGroups[matchId].length > 1) {
            const p1 = matchGroups[matchId][0];
            const p2 = matchGroups[matchId][1];
            
            const d1 = Math.abs(finalA - p1.homeScore) + Math.abs(finalB - p1.awayScore);
            const d2 = Math.abs(finalA - p2.homeScore) + Math.abs(finalB - p2.awayScore);
            
            if (d1 < d2) { 
                points[p1.user] += 1; 
                historyData[p1.user + "_points"] += 1; 
            } else if (d2 < d1) { 
                points[p2.user] += 1; 
                historyData[p2.user + "_points"] += 1; 
            }
        }
        
        await db.collection("match_history").doc(matchId).set(historyData);
    }
    await db.collection("scores").doc("current_standings").set(points);
}

function logUserIn(name) {
    currentUser = name;
    localStorage.setItem("wcUser", name);
    document.getElementById("display-name").innerText = name;
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    renderMatches(); 
}

document.getElementById("btn-pragyan").onclick = () => logUserIn("Pragyan");
document.getElementById("btn-nischal").onclick = () => logUserIn("Nischal");
document.getElementById("logout-link").onclick = (e) => { e.preventDefault(); localStorage.removeItem("wcUser"); location.reload(); };
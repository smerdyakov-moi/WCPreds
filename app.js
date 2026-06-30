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
let userPredictions = {};

function isDraw(home, away) { return home === away; }

function formatPredDisplay(pred, matchObj) {
    let s = `${pred.homeScore}-${pred.awayScore}`;
    if (pred.penaltyWinner) {
        const teamTLA = pred.penaltyWinner === "home" ? matchObj.homeTeam.tla : matchObj.awayTeam.tla;
        s += ` (${teamTLA} Win)`;
    }
    return s;
}

function calcPoints(p, finalA, finalB, actualPenWinner) {
    const exactScore = p.homeScore === finalA && p.awayScore === finalB;
    const isPredictedDraw = p.homeScore === p.awayScore;
    const isActualDraw = finalA === finalB;
    const actualWinner = actualPenWinner ? actualPenWinner : (finalA > finalB ? "home" : "away");
    const userWinner = isPredictedDraw ? p.penaltyWinner : (p.homeScore > p.awayScore ? "home" : "away");
    
    let total = 0;
    if (exactScore) total += 5;
    else if (userWinner === actualWinner) total += 2;
    if (isPredictedDraw === isActualDraw) total += 1;
    
    return total;
}

async function renderMatches() {
    const tableBody = document.getElementById("match-table-body");
    tableBody.innerHTML = "";
    if (!currentUser) return;

    const snap = await db.collection("predictions").where("user", "==", currentUser).get();
    userPredictions = {};
    snap.forEach(doc => userPredictions[doc.data().matchId] = doc.data());

    allMatches.filter(m => ["SCHEDULED", "TIMED", "POSTPONED"].includes(m.status)).slice(0, 5).forEach(m => {
        const pred = userPredictions[String(m.id)];
        const tr = document.createElement("tr");

        if (pred && pred.locked) {
            tr.innerHTML = `
                <td><b>${m.homeTeam.tla} vs ${m.awayTeam.tla}</b></td>
                <td>${formatPredDisplay(pred, m)}</td>
                <td><button disabled style="background-color: #cccccc;">Locked</button></td>`;
        } else {
            tr.innerHTML = `
                <td><b>${m.homeTeam.tla} vs ${m.awayTeam.tla}</b></td>
                <td id="cell-${m.id}">
                    <input type="number" id="A-${m.id}" style="width:40px;" value="${pred ? pred.homeScore : ''}"> - 
                    <input type="number" id="B-${m.id}" style="width:40px;" value="${pred ? pred.awayScore : ''}">
                    <div id="pen-wrap-${m.id}" style="display:none; margin-top:5px;">
                        <button id="pen-home-${m.id}">${m.homeTeam.tla} Win</button>
                        <button id="pen-away-${m.id}">${m.awayTeam.tla} Win</button>
                    </div>
                </td>
                <td><button id="btn-${m.id}">Lock In</button></td>`;
        }
        tableBody.appendChild(tr);

        if (!pred || !pred.locked) {
            const aIn = document.getElementById(`A-${m.id}`), bIn = document.getElementById(`B-${m.id}`);
            const penWrap = document.getElementById(`pen-wrap-${m.id}`);
            const lockBtn = document.getElementById(`btn-${m.id}`);
            
            const check = () => {
                const isDraw = (aIn.value !== "" && bIn.value !== "" && parseInt(aIn.value) === parseInt(bIn.value));
                penWrap.style.display = isDraw ? "block" : "none";
                lockBtn.style.display = isDraw ? "none" : "inline-block";
            };
            aIn.oninput = bIn.oninput = check;
            lockBtn.onclick = () => saveSimple(m, null);
            document.getElementById(`pen-home-${m.id}`).onclick = () => saveSimple(m, "home");
            document.getElementById(`pen-away-${m.id}`).onclick = () => saveSimple(m, "away");
        }
    });
}

async function saveSimple(m, penWinner) {
    const sA = document.getElementById(`A-${m.id}`).value;
    const sB = document.getElementById(`B-${m.id}`).value;
    if (!sA || !sB) return;
    await db.collection("predictions").doc(`${currentUser}_${m.id}`).set({
        user: currentUser,
        matchId: String(m.id),
        homeScore: parseInt(sA),
        awayScore: parseInt(sB),
        penaltyWinner: penWinner || null,
        locked: true,
        timestamp: new Date()
    });
    renderMatches();
}

async function updateLeaderboard() {
    const scoreDoc = await db.collection("scores").doc("current_standings").get();
    let points = scoreDoc.exists ? scoreDoc.data() : { "Pragyan": 0, "Nischal": 0 };
    const predictionsSnap = await db.collection("predictions").get();
    let matchGroups = {};
    predictionsSnap.forEach(doc => { const p = doc.data(); if (!matchGroups[p.matchId]) matchGroups[p.matchId] = []; matchGroups[p.matchId].push(p); });

    for (const matchId in matchGroups) {
        const realMatch = allMatches.find(m => String(m.id) === String(matchId) && ["FINISHED", "AWARDED"].includes(m.status));
        if (!realMatch || (await db.collection("match_history").doc(matchId).get()).exists) continue;

        const s = realMatch.score;
        let finalA = (s.regularTime?.home ?? 0) + (s.extraTime?.home ?? 0);
        let finalB = (s.regularTime?.away ?? 0) + (s.extraTime?.away ?? 0);
        
        if (finalA === 0 && finalB === 0 && s.fullTime?.home !== null) {
            finalA = s.fullTime.home;
            finalB = s.fullTime.away;
        }

        let actualPenWinner = (isDraw(finalA, finalB) && s.penalties?.home !== null) ? (s.penalties.home > s.penalties.away ? "home" : "away") : null;
        
        let resultString = `${finalA}-${finalB}`;
        if (actualPenWinner) {
            const winnerTLA = actualPenWinner === "home" ? realMatch.homeTeam.tla : realMatch.awayTeam.tla;
            resultString += ` (${winnerTLA} wins)`;
        }

        let historyData = { 
            match: `${realMatch.homeTeam.tla} vs ${realMatch.awayTeam.tla}`, 
            result: resultString, 
            timestamp: new Date() 
        };
        if (actualPenWinner) historyData.penaltyWinner = actualPenWinner;
        
        matchGroups[matchId].forEach(p => {
            const total = calcPoints(p, finalA, finalB, actualPenWinner);
            points[p.user] = (points[p.user] || 0) + total;
            historyData[`${p.user}_pred`] = formatPredDisplay(p, realMatch);
            historyData[`${p.user}_points`] = total;
        });

        const noExact = !matchGroups[matchId].some(p => p.homeScore === finalA && p.awayScore === finalB);
        if (noExact && matchGroups[matchId].length > 1) {
            const p1 = matchGroups[matchId][0], p2 = matchGroups[matchId][1];
            const d1 = Math.abs(finalA - p1.homeScore) + Math.abs(finalB - p1.awayScore);
            const d2 = Math.abs(finalA - p2.homeScore) + Math.abs(finalB - p2.awayScore);
            if (d1 < d2) { points[p1.user] += 1; historyData[`${p1.user}_points`] += 1; }
            else if (d2 < d1) { points[p2.user] += 1; historyData[`${p2.user}_points`] += 1; }
        }
        await db.collection("match_history").doc(matchId).set(historyData);
    }
    await db.collection("scores").doc("current_standings").set(points);
}

function logUserIn(name) {
    currentUser = name; localStorage.setItem("wcUser", name);
    document.getElementById("display-name").innerText = name;
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    renderMatches();
}

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("btn-pragyan").onclick = () => logUserIn("Pragyan");
    document.getElementById("btn-nischal").onclick = () => logUserIn("Nischal");
    document.getElementById("logout-link").onclick = (e) => { e.preventDefault(); localStorage.removeItem("wcUser"); location.reload(); };

    db.collection("scores").doc("current_standings").onSnapshot(doc => {
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
            historyBody.innerHTML += `<tr><td>${h.match}</td><td><b>${h.result}</b></td><td>${h.Nischal_pred || '-'} / ${h.Nischal_points || 0}</td><td>${h.Pragyan_pred || '-'} / ${h.Pragyan_points || 0}</td></tr>`;
        });
    });

    try {
        const response = await fetch("/.netlify/functions/getMatches");
        const data = await response.json();
        if (data.matches) allMatches = data.matches;
        const savedUser = localStorage.getItem("wcUser");
        if (savedUser) logUserIn(savedUser);
        await updateLeaderboard();
    } catch (err) {}
});
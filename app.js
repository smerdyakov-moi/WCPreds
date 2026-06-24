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

// Shield Firebase with a Try/Catch
try {
    console.log("2. Attempting to initialize Firebase...");
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("3. Firebase initialized successfully!");
} catch (error) {
    console.error("FIREBASE CRASHED:", error);
}

// DOM Elements
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const btnPragyan = document.getElementById("btn-pragyan");
const btnNischal = document.getElementById("btn-nischal");
const displayName = document.getElementById("display-name");
const logoutLink = document.getElementById("logout-link");
const lockMatch1Btn = document.getElementById("lock-match-1");

let currentUser = "";

console.log("4. Attaching button listeners...");

// Login Logic
window.onload = () => {
    try {
        const savedUser = sessionStorage.getItem("predictorUser");
        if (savedUser) logUserIn(savedUser);
    } catch (e) {
        console.error("Session storage is blocked by your browser.", e);
    }
};

btnPragyan.addEventListener("click", () => {
    console.log("Pragyan button clicked!");
    logUserIn("Pragyan");
});

btnNischal.addEventListener("click", () => {
    console.log("Nischal button clicked!");
    logUserIn("Nischal");
});

function logUserIn(name) {
    console.log("Logging in as: " + name);
    currentUser = name;
    
    try {
        sessionStorage.setItem("predictorUser", name);
    } catch (e) {
        console.warn("Could not save session, but letting you in anyway.");
    }
    
    displayName.innerText = currentUser;
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
}

logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    try {
        sessionStorage.removeItem("predictorUser");
    } catch (e) {}
    currentUser = "";
    dashboard.style.display = "none";
    loginScreen.style.display = "block";
});

// Database Submit Logic
lockMatch1Btn.addEventListener("click", function() {
    const scoreBrazil = document.getElementById("pred-brazil").value;
    const scoreFrance = document.getElementById("pred-france").value;

    if (scoreBrazil === "" || scoreFrance === "") {
        alert("Enter a score for both teams.");
        return;
    }

    if (!db) {
        alert("Cannot save: Firebase failed to load earlier. Check console.");
        return;
    }

    db.collection("predictions").add({
        user: currentUser,
        match: "Brazil_vs_France",
        teamA_score: parseInt(scoreBrazil),
        teamB_score: parseInt(scoreFrance),
        timestamp: new Date()
    })
    .then(() => {
        alert("Prediction locked!");
    })
    .catch((error) => {
        console.error("Error adding document: ", error);
        alert("Failed to save. Check console.");
    });
});

console.log("5. App.js loaded completely.");
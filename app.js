console.log("1. App.js is starting...");

// Your exact Firebase Config
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

// Check if user is already saved in session storage on refresh
window.onload = () => {
    try {
        const savedUser = sessionStorage.getItem("predictorUser");
        if (savedUser) logUserIn(savedUser);
    } catch (e) {
        console.error("Session storage is blocked by your browser.", e);
    }
};

// Login Buttons
btnPragyan.addEventListener("click", () => {
    logUserIn("Pragyan");
});

btnNischal.addEventListener("click", () => {
    logUserIn("Nischal");
});

// Main Login Function
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

    // SMART UI: Check database and load past predictions for this specific user
    loadUserPredictions(currentUser);
}

// Logout / Switch User Logic
logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    try {
        sessionStorage.removeItem("predictorUser");
    } catch (e) {}
    currentUser = "";
    dashboard.style.display = "none";
    loginScreen.style.display = "block";
});

// Check database for existing predictions and lock UI if found
function loadUserPredictions(username) {
    const inputBrazil = document.getElementById("pred-brazil");
    const inputFrance = document.getElementById("pred-france");
    const lockBtn = document.getElementById("lock-match-1");

    // 1. WIPE THE BOARD CLEAN (Unlock and Empty)
    inputBrazil.value = "";
    inputFrance.value = "";
    inputBrazil.disabled = false;
    inputFrance.disabled = false;
    lockBtn.disabled = false;
    lockBtn.innerText = "Lock In";

    if (!db) return; // If Firebase failed, stop here

    // 2. Ask Firebase if this user already predicted this match
    db.collection("predictions")
        .where("user", "==", username)
        .where("match", "==", "Brazil_vs_France")
        .get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                // The user HAS predicted! Fill in their numbers and lock it.
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    
                    inputBrazil.value = data.teamA_score;
                    inputFrance.value = data.teamB_score;
                    
                    inputBrazil.disabled = true;
                    inputFrance.disabled = true;
                    lockBtn.disabled = true;
                    lockBtn.innerText = "Locked";
                });
            }
        })
        .catch((error) => {
            console.error("Error fetching predictions: ", error);
        });
}

// Database Submit Logic
lockMatch1Btn.addEventListener("click", function() {
    const inputBrazil = document.getElementById("pred-brazil");
    const inputFrance = document.getElementById("pred-france");
    
    const scoreBrazil = inputBrazil.value;
    const scoreFrance = inputFrance.value;

    if (scoreBrazil === "" || scoreFrance === "") {
        alert("Enter a score for both teams.");
        return;
    }

    if (!db) {
        alert("Cannot save: Firebase failed to load earlier. Check console.");
        return;
    }

    // Save to Firestore
    db.collection("predictions").add({
        user: currentUser,
        match: "Brazil_vs_France",
        teamA_score: parseInt(scoreBrazil),
        teamB_score: parseInt(scoreFrance),
        timestamp: new Date()
    })
    .then(() => {
        alert("Prediction locked!");
        
        // Disable the boxes so they can't be changed, but leave numbers visible
        inputBrazil.disabled = true;
        inputFrance.disabled = true;
        
        // Disable the button and change text
        lockMatch1Btn.disabled = true;
        lockMatch1Btn.innerText = "Locked";
    })
    .catch((error) => {
        console.error("Error adding document: ", error);
        alert("Failed to save. Check console.");
    });
});

console.log("5. App.js loaded completely.");
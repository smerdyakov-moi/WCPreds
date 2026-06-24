// 1. Import Firebase from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 2. Paste YOUR Firebase Config here
const firebaseConfig = {
  apiKey: "AIzaSyARnW-6JxIrV6v6Wn1-aVewAIWh3_NSI48",
  authDomain: "wcpredictor-594ee.firebaseapp.com",
  projectId: "wcpredictor-594ee",
  storageBucket: "wcpredictor-594ee.firebasestorage.app",
  messagingSenderId: "34828140064",
  appId: "1:34828140064:web:224330790641e627f9c645"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const btnPragyan = document.getElementById("btn-pragyan");
const btnNischal = document.getElementById("btn-nischal");
const displayName = document.getElementById("display-name");
const logoutLink = document.getElementById("logout-link");
const lockMatch1Btn = document.getElementById("lock-match-1");

let currentUser = "";

// Login Logic
window.onload = () => {
    const savedUser = sessionStorage.getItem("predictorUser");
    if (savedUser) logUserIn(savedUser);
};

btnPragyan.addEventListener("click", () => logUserIn("Pragyan"));
btnNischal.addEventListener("click", () => logUserIn("Nischal"));

function logUserIn(name) {
    currentUser = name;
    sessionStorage.setItem("predictorUser", name);
    displayName.innerText = currentUser;
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
}

logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.removeItem("predictorUser");
    currentUser = "";
    dashboard.style.display = "none";
    loginScreen.style.display = "block";
});

// Database Submit Logic
lockMatch1Btn.addEventListener("click", async () => {
    const scoreBrazil = document.getElementById("pred-brazil").value;
    const scoreFrance = document.getElementById("pred-france").value;

    if (scoreBrazil === "" || scoreFrance === "") {
        alert("Enter a score for both teams.");
        return;
    }

    try {
        await addDoc(collection(db, "predictions"), {
            user: currentUser,
            match: "Brazil_vs_France",
            teamA_score: parseInt(scoreBrazil),
            teamB_score: parseInt(scoreFrance),
            timestamp: new Date()
        });
        alert("Prediction locked!");
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Failed to save. Check console.");
    }
});
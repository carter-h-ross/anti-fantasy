const debugMode = false;
function logBreak() {
    console.log("----- ----- ----- ----- ----- ----- ----- -----");
}

// Import the necessary functions from the Firebase SDK
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getDatabase, ref, set,get, push, child, remove} from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes , getDownloadURL} from "firebase/storage";
import { getAuth } from "firebase/auth";
import { firebaseConfigExport } from "../privateKeys/webpackConfig";

// Initialize Firebase
const app = initializeApp(firebaseConfigExport);
// Initialize Firebase Storage
const storage = getStorage();
//Initialize firebase
const auth = getAuth();
const provider = new GoogleAuthProvider();
let email = null;
// Initialize firebase realtime database
const database = getDatabase();
const databaseRef = ref(database);

function convertDateToTimestamp(dateString) {
    // Parse the date string
    const date = new Date(dateString);

    // Get the timestamp
    const timestamp = date.getTime();

    return timestamp;
}

/*----- login button -----*/
const loginButton = document.getElementById("signInButton");
//const logoutButton = document.getElementById("signOutButton");
console.log(loginButton);

loginButton.addEventListener('click', (e) => {
    signInWithPopup(auth, provider)
        .then(async (result) => {

            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            const user = result.user;
            email = user.email;
            console.log(email);
            loadMenu("seriesChoiceMenu")
            
        }).catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            const credential = GoogleAuthProvider.credentialFromError(error);
            console.error(`error code: ${errorCode} | error message: ${errorMessage} | auth credential type used: ${credential}`);
        });
});

/*
// Add event listener to logout button
logoutButton.addEventListener("click", () => {
    // Sign out user
    auth.signOut().then(() => {
        // Redirect to index page after logout
        window.location.href = "index.html";
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
});
*/

// Set the user's email in local storage outside of the signInWithPopup callback
auth.onAuthStateChanged(user => {
    if (user) {
        email = user.email;
        localStorage.setItem('userEmail', email);
    }
});

// Function to upload image file to Firebase Storage
async function uploadImageFile(imageFile) {
    try {
        // Create a reference to the location where the image will be stored in Firebase Storage
        const storageReference = storageRef(storage, 'images/' + imageFile.name); // 'images/' is the path where the images will be stored
        // Upload the image file to the specified location
        const snapshot = await uploadBytes(storageReference, imageFile);
        console.log("Image uploaded successfully:", snapshot);
        // You can get the download URL of the uploaded image using snapshot.ref.getDownloadURL()
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("Download URL:", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        return null;
    }
}

// called when website is loaded
document.addEventListener("DOMContentLoaded", async function() {
    
});

/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- functions for the nav menus and other css ---- ------ ----- ----- ----- */
/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */

const startMenu = document.getElementById("startMenu");
const seriesChoiceMenu = document.getElementById("seriesChoiceMenu");

function hideAllMenus() {
    startMenu.style.display = "none";
    seriesChoiceMenu.style.display = "none"; 
}

function loadMenu(menuName) {
    hideAllMenus();
    if (menuName == "startMenu") {
        startMenu.style.display = "flex";
    } else if (menuName == "seriesChoiceMenu") {
        seriesChoiceMenu.style.display = "flex"; 
    }
}

loadMenu("startMenu")

/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- functions to calculate score and similar stuff ------ ----- ----- ----- */
/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */

let dnfScaled = true;

// function to calculate the score for one driver from one race
function calculateOneRaceScore(driver, race) {

    if (debugMode) {
        console.log(data);
        logBreak();
        console.log(`calculating one race score for driver: (${driver}) and race: (${race})`)
    }

    if (!data.drivers[driver] || !data.races[race]) {
        console.error(`Invalid driver (${driver}) or race (${race})`);
    }
    let points = 0;

    const qualyPos = data.drivers[driver].results[race].qualy;
    const racePos = data.drivers[driver].results[race].race;
    const raceFinished = data.drivers[driver].results[race].finish;
    const lapsCompleted = data.drivers[driver].results[race].laps;
    const tmQualyPos = data.drivers[data.teamates[driver]].results[race].qualy;
    const tmRacePos = data.drivers[data.teamates[driver]].results[race].race;

    // preformance vs teamate
    if (qualyPos < tmQualyPos){
        points -= 5;
        if (debugMode) {
            console.log(`won qualifying to teamate they got: ${qualyPos} and teamate got: ${tmQualyPos} = -5 pts`)
        }
    } else {
        points += 5;
        if (debugMode) {
            console.log(`lost qualifying to teamate they got: ${qualyPos} and teamate got: ${tmQualyPos} = +5 pts`)
        }
    }

    if (racePos < tmRacePos){
        points -= 10;
        if (debugMode) {
            console.log(`won race vs teamate they got: ${racePos} and teamate got: ${tmRacePos} = -10 pts`)
        }
    } else {
        points += 10;
        if (debugMode) {
            console.log(`lost race vs to teamate they got: ${racePos} and teamate got: ${tmRacePos} = +10 pts`)
        }
    }

    // calculate points for all racess
    points += data.scoring.qualy[qualyPos];
    if (debugMode) {
        console.log(`qualy position of: ${qualyPos} = ${data.scoring.qualy[qualyPos]} pts`)
    }

    points += data.scoring.raceFinish[racePos];
    if (debugMode) {
        console.log(`race position of: ${racePos} = ${data.scoring.raceFinish[racePos]} pts`)
    }

    if (!(raceFinished)) {
        if (dnfScaled) {
            points += Math.floor(5 * (21 - qualyPos + ((lapsCompleted / data.races[race].laps) * 10)))
            if (debugMode) {
                console.log(`dnf in race starting from: ${qualyPos} and on lap: ${lapsCompleted} = ${Math.floor(5 * (21 - qualyPos + ((lapsCompleted / data.races[race].laps) * 10)))} pts (dnf scaled)`);
            }
        } else {
            points -= 50;
            if (debugMode) {
                console.log(`dnf in race starting from: ${qualyPos} and on lap: ${lapsCompleted} = -50 pts (dnf not scaled)`);
            }
        }    
    }

    // calculate the points for a sprint race
    if (data.races[race].sprint == true) {
        const sprintPos = data.drivers[driver].results[sprint];
        const sprintQualyPos = data.drivers[driver].results[sprintQualy];
        const sprintFinished = data.drivers[driver].results[sprintFinish];

        points += data.scoring.sprintQualy[sprintQualyPos];
        if (debugMode) {
            console.log(`sprint qualifying position ${sprintQualyPos} = ${data.scoring.sprintQualy[sprintQualyPos]} pts`)
        }

        points += data.scoring.sprintFinish[sprintPos];
        if (debugMode) {
            console.log(`sprint qualifying position ${sprintPos} = ${data.scoring.sprintFinish[sprintPos]} pts`)
        }

        if (!(sprintFinished)) {
            if (dnfScaled) {
                points -= Math.round(2 * (21 - sprintQualyPos));
                if (debugMode) {
                    console.log(`dnf in sprint race = ${Math.round(2 * (21 - sprintQualyPos))} pts (dnf scaled)`)
                }
            } else {
                points -= 20;
                if (debugMode) {
                    console.log(`dnf in sprint race = -20 pts (dnf not scaled)`)
                }
            }
        } 
    } // end of calculating data for the sprint
    
    if (debugMode) {
        console.log(`total points: ${points}`)
    }
    return points;
} // end of function calculateOneRaceScore(driver, race)

/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- testing the scoring functions ---------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */
/* ----- ----- ----- ----- ---------------------------------------------- ------ ----- ----- ----- */

let data = null;

function getAllScoresByRaces() {
    let result = {};
    const races = data.races.list;
    const drivers = data.drivers.list;
    for (let i = 0;i < races.length;i++) {
        result[races[i]] = {}
        for (let j = 0;j < drivers.length;j++) {
            const nextRaceScore = calculateOneRaceScore(drivers[j], races[i]);
            result[races[i]][drivers[j]] = nextRaceScore;
        }
    }
    return result;
}

function getAllScoresByDriver() {
    let result = {};
    const races = data.races.list;
    const drivers = data.drivers.list;

    // Calculate the scores
    for (let i = 0; i < drivers.length; i++) {
        result[drivers[i]] = {};
        for (let j = 0; j < races.length; j++) {
            const nextRaceScore = calculateOneRaceScore(drivers[i], races[j]);
            if (j == 0) {
                result[drivers[i]]["total"] = nextRaceScore;
            } else {
                result[drivers[i]]["total"] += nextRaceScore;
            }
            result[drivers[i]][races[j]] = nextRaceScore;
        }
    }

    return result;
}

// Function to log the drivers in order
function logDriversInOrder(driversData) {
    // Convert the result object to an array of [key, value] pairs
    let driverScoresArray = Object.entries(driversData);
    
    // Sort the array based on the total scores
    driverScoresArray.sort((a, b) => b[1].total - a[1].total);

    // Log the sorted array
    driverScoresArray.forEach(([driver, scores]) => {
        console.log(driver, scores);
    });
}

// Function to load JSON data from a file
async function loadJSON(file) {
    const response = await fetch(file);
    const data = await response.json();
    return data;
}

// Loading the points data
let racesData = null;
let driversData = null;
loadJSON('season2024.json').then(seasonData => {
    data = seasonData;
    //racesData = getAllScoresByRaces();
    driversData = getAllScoresByDriver();
    console.log(racesData);
    logDriversInOrder(driversData);
});
/**
 * Firebase Realtime Database Integration Logic
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCa0PC0APGfMpIhsE_VUiAGwFFFcIUk5A8",
  authDomain: "ubion-calendar.firebaseapp.com",
  databaseURL: "https://ubion-calendar-default-rtdb.firebaseio.com",
  projectId: "ubion-calendar",
  storageBucket: "ubion-calendar.firebasestorage.app",
  messagingSenderId: "118395049718",
  appId: "1:118395049718:web:42a174eeefa5a56caf3ed7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database, 'sharedState');

let isInitialLoad = true;

/**
 * Initializes Firebase listener for real-time updates
 */
export function initFirebase(onStateUpdateCallback) {
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Data exists in Firebase, update local appState
            onStateUpdateCallback(data);
        } else {
            // First time ever loading (DB is empty), we might want to push our default state
            // But usually we just start empty.
            console.log("No data found in Firebase. DB is empty.");
        }
    });
}

/**
 * Saves current state to Firebase Realtime DB
 */
export function saveStateToFirebase(newState) {
    set(dbRef, newState)
        .then(() => {
            console.log('State successfully synchronized to Firebase.');
        })
        .catch((error) => {
            console.error('Error synchronizing to Firebase: ', error);
        });
}

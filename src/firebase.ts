// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyC1QEAzhImoDygxUySObZt4nfXKjvyPUOA",
  authDomain: "salon-booking-28300.firebaseapp.com",
  projectId: "salon-booking-28300",
  storageBucket: "salon-booking-28300.firebasestorage.app",
  messagingSenderId: "1097118595498",
  appId: "1:1097118595498:web:b59f0988d0ded5172e53d3",
  measurementId: "G-6VVR8FDCJ7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// const analytics = getAnalytics(app);

export { db };

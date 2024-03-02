// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "mern-blog-975a0.firebaseapp.com",
  projectId: "mern-blog-975a0",
  storageBucket: "mern-blog-975a0.appspot.com",
  messagingSenderId: "512014211619",
  appId: "1:512014211619:web:5dc4496ed4d4b357ff2f96",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

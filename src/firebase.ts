import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQABOx7FR58pVEI8ZAcYk2lZXw9tDcrps",
  authDomain: "supermarket-da6c5.firebaseapp.com",
  projectId: "supermarket-da6c5",
  storageBucket: "supermarket-da6c5.firebasestorage.app",
  messagingSenderId: "908132517154",
  appId: "1:908132517154:web:463ad3aca81d0a8cf0917b",
  measurementId: "G-FJE33YLPGH"
};

const app = initializeApp(firebaseConfig);

// تصدير قواعد البيانات والمصادقة للاستخدام في تطبيقك
export const db = getFirestore(app);
export const auth = getAuth(app);

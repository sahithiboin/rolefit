import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// Replace these with your actual keys from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyAOQfd1xkBX73UFitxOyeiX6APe0zSDv9Y",
    authDomain: "rolefit-84d3d.firebaseapp.com",
    projectId: "rolefit-84d3d",
    storageBucket: "rolefit-84d3d.firebasestorage.app",
    messagingSenderId: "946716696276",
    appId: "1:946716696276:web:61938b95e6e2c0ba6ba541",
    measurementId: "G-2R5RCXLXN6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;

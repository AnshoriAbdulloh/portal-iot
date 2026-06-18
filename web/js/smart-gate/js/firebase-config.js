// Firebase Configuration — Replace with your project credentials
const firebaseConfig = {
  apiKey: "AIzaSyAsm5d11_LF2CI0YVP02b6VAa21uXMqYzs",
  authDomain: "portal-iot-2eb50.firebaseapp.com",
  databaseURL:
    "https://portal-iot-2eb50-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "portal-iot-2eb50",
  storageBucket: "portal-iot-2eb50.firebasestorage.app",
  messagingSenderId: "365641186959",
  appId: "1:365641186959:web:aca9c6b52358c6797dbafa",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Database references
const gateRef = db.ref("gate");
const residentsRef = db.ref("residents");
const scheduleRef = db.ref("schedule");
const accessLogsRef = db.ref("riwayatRFID");
const adminLogsRef = db.ref("adminLogs");

console.log("🔥 Firebase initialized");

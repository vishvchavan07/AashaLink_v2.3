import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "mock_api_key",
  appId: "mock_app_id"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
console.log("Auth keys:", Object.keys(auth));

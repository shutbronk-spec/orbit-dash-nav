import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Default GAS URL — set if user hasn't configured one
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbyHrHG5liP32b4Qt7oN7Dvd6loz5NJcztqiYK8m-qtsCKG7F4b-GxEklfxfqDSl-Oc/exec";
if (!localStorage.getItem("gasUrl")) {
  localStorage.setItem("gasUrl", DEFAULT_GAS_URL);
}

createRoot(document.getElementById("root")!).render(<App />);

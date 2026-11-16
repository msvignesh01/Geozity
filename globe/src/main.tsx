import { createRoot } from "react-dom/client";
import { App } from "./App";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Geozity root element is missing");
createRoot(root).render(<App />);

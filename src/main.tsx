import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ReferenceGallery } from "./ReferenceGallery";
import "./index.css";

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    {path === "/reference-gallery" ? <ReferenceGallery /> : <App />}
  </React.StrictMode>
);

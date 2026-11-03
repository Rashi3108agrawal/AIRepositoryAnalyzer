// DarkModeToggle.js – simple toggle that stores preference in localStorage
import React, { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    // initialise from localStorage or system preference
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("darkMode", dark);
  }, [dark]);

  return (
    <button
      className="dark-toggle"
      onClick={() => setDark(!dark)}
      aria-label="Toggle dark mode"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}


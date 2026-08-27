// FILE: src/main.jsx
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App";
import "./index.css";

// Tạo theme Material UI phong cách Frosted Glass (Pink #ec4899 & Purple #a855f7)
const frostedGlassTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#ec4899", // Pink chính từ design
      light: "#f472b6",
      dark: "#db2777",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#a855f7", // Purple tím từ design
      light: "#c084fc",
      dark: "#9333ea",
      contrastText: "#ffffff",
    },
    background: {
      default: "transparent",
      paper: "rgba(255, 255, 255, 0.55)",
    },
    text: {
      primary: "#1e293b",
      secondary: "#64748b",
    },
  },
  typography: {
    fontFamily: "'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: {
      fontFamily: "'Quicksand', 'Comfortaa', sans-serif",
      fontWeight: 800,
    },
    h2: {
      fontFamily: "'Quicksand', 'Comfortaa', sans-serif",
      fontWeight: 800,
    },
    h3: {
      fontFamily: "'Quicksand', 'Comfortaa', sans-serif",
      fontWeight: 700,
    },
    h4: {
      fontFamily: "'Quicksand', 'Comfortaa', sans-serif",
      fontWeight: 700,
    },
    h5: {
      fontFamily: "'Quicksand', 'Comfortaa', sans-serif",
      fontWeight: 700,
    },
    h6: {
      fontFamily: "'Quicksand', 'Comfortaa', sans-serif",
      fontWeight: 700,
    },
    button: {
      fontFamily: "'Quicksand', sans-serif",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 24,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          textTransform: "none",
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "16px",
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(8px)",
            "& fieldset": {
              borderColor: "rgba(236, 72, 153, 0.2)",
            },
            "&:hover fieldset": {
              borderColor: "#ec4899",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#ec4899",
              borderWidth: "1.5px",
            },
          },
        },
      },
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={frostedGlassTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);

// FILE: src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link as RouterLink } from "react-router-dom";
import { Box, Container, Typography, Button, Paper, Chip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Toaster } from "react-hot-toast";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar/Navbar";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import HomePage from "./pages/Home/HomePage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import GlamBotPage from "./pages/GlamBot/GlamBotPage";
import PhotoBoothPage from "./pages/PhotoBooth/PhotoBoothPage";

// Placeholder component cho các module tiếp theo
function PlaceholderModule({ title, icon, subtitle, color, chipText }) {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 110px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 5 },
            textAlign: "center",
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.08)",
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.5rem",
              boxShadow: "0 10px 20px rgba(236, 72, 153, 0.15)",
              mb: 2.5,
            }}
          >
            {icon}
          </Box>

          <Box sx={{ mb: 1.5 }}>
            <Chip
              label={chipText || "Sắp ra mắt trong Module tiếp theo"}
              size="small"
              sx={{
                backgroundColor: "rgba(236, 72, 153, 0.1)",
                color: "#ec4899",
                fontWeight: 700,
                borderRadius: "100px",
                fontFamily: "'Quicksand', sans-serif",
              }}
            />
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontFamily: "'Quicksand', sans-serif",
              color: "#1f2937",
              mb: 1.5,
            }}
          >
            {title}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "#6b7280",
              lineHeight: 1.6,
              mb: 4,
              maxWidth: 420,
              mx: "auto",
              fontFamily: "'Quicksand', sans-serif",
            }}
          >
            {subtitle}
          </Typography>

          <Button
            component={RouterLink}
            to="/"
            variant="text"
            startIcon={<ArrowBackIcon />}
            sx={{
              borderRadius: "100px",
              backgroundColor: "rgba(236, 72, 153, 0.1)",
              color: "#ec4899",
              fontWeight: 600,
              px: 3.5,
              py: 1.2,
              fontFamily: "'Quicksand', sans-serif",
              "&:hover": {
                backgroundColor: "#ec4899",
                color: "#ffffff",
              },
            }}
          >
            Quay về Trang chủ
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}

// Protected Profile Placeholder
function ProfilePage() {
  const { currentUser } = useAuth();

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 110px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 5 },
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.08)",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#ec4899",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "2rem",
              fontWeight: 700,
              boxShadow: "0 10px 20px rgba(236, 72, 153, 0.25)",
              mb: 2,
            }}
          >
            {currentUser?.displayName
              ? currentUser.displayName.charAt(0).toUpperCase()
              : "T"}
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontFamily: "'Quicksand', sans-serif",
              color: "#1f2937",
              mb: 0.5,
            }}
          >
            {currentUser?.displayName || "Thành viên GlamBooth"}
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "#6b7280", mb: 3.5, fontFamily: "'Quicksand', sans-serif" }}
          >
            {currentUser?.email}
          </Typography>

          <Box
            sx={{
              p: 3,
              borderRadius: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              border: "1px solid rgba(236, 72, 153, 0.2)",
              mb: 3.5,
              textAlign: "left",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "#ec4899", mb: 1, fontFamily: "'Quicksand', sans-serif" }}
            >
              ✨ Bộ sưu tập ảnh & Video cá nhân
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280", fontFamily: "'Quicksand', sans-serif", lineHeight: 1.6 }}>
              Tất cả các khoảnh khắc GlamBot, Photo Booth và video cử chỉ đã lưu trên Cloudinary sẽ xuất hiện tại đây trong Module tiếp theo!
            </Typography>
          </Box>

          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            sx={{
              borderRadius: "100px",
              backgroundColor: "#ec4899",
              color: "#ffffff",
              fontWeight: 600,
              px: 4,
              py: 1.3,
              fontFamily: "'Quicksand', sans-serif",
              boxShadow: "0 6px 18px rgba(236, 72, 153, 0.35)",
              "&:hover": {
                backgroundColor: "#db2777",
                boxShadow: "0 8px 22px rgba(236, 72, 153, 0.45)",
              },
            }}
          >
            Về Trang chủ
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Toaster thông báo phong cách Frosted Glass */}
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: "100px",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(16px)",
              color: "#1f2937",
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 600,
              fontSize: "0.95rem",
              padding: "10px 20px",
              border: "1px solid rgba(236, 72, 153, 0.25)",
              boxShadow: "0 10px 25px rgba(236, 72, 153, 0.15)",
            },
          }}
        />

        {/* Navbar hiển thị cố định toàn cục */}
        <Navbar />

        {/* Quản lý các Route của ứng dụng */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* GlamBot Video Page (Bảo vệ bởi ProtectedRoute) */}
          <Route
            path="/glambot"
            element={
              <ProtectedRoute>
                <GlamBotPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/photobooth"
            element={
              <ProtectedRoute>
                <PhotoBoothPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gesture"
            element={
              <PlaceholderModule
                title="Gesture Surprise"
                icon="✌️"
                subtitle="Tính năng nhận diện cử chỉ tay (bắn tim, chữ V) với AI Camera đang được phát triển."
                color="#ec4899"
                chipText="Module 3"
              />
            }
          />

          {/* Route Profile được bảo vệ bởi ProtectedRoute */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


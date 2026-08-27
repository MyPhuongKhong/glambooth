// FILE: src/components/ProtectedRoute/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";

/**
 * HOC Route Guard bảo vệ các route yêu cầu đăng nhập
 */
export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        id="protected-route-loading"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
          gap: 2,
        }}
      >
        <CircularProgress
          size={50}
          thickness={4}
          sx={{
            color: "#f472b6",
          }}
        />
        <Typography
          variant="body1"
          sx={{
            color: "#64748b",
            fontWeight: 600,
            fontFamily: "'Quicksand', sans-serif",
          }}
        >
          Đang xác thực thông tin...
        </Typography>
      </Box>
    );
  }

  if (!currentUser) {
    // Điều hướng về trang đăng nhập và lưu vị trí dự định truy cập
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// FILE: src/pages/Auth/LoginPage.jsx
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Đăng nhập thành công! Chào mừng trở lại ✨", {
        icon: "🎉",
      });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      let errorMsg = "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!";
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        errorMsg = "Email hoặc mật khẩu không chính xác!";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Định dạng email không hợp lệ!";
      } else if (error.code === "auth/too-many-requests") {
        errorMsg = "Quá nhiều lần thử sai. Vui lòng thử lại sau ít phút!";
      }
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      id="login-page-container"
      sx={{
        minHeight: "calc(100vh - 110px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          id="login-card"
          elevation={0}
          sx={{
            p: { xs: 3.5, sm: 4.5 },
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.08)",
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 3.5 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                boxShadow: "0 10px 20px rgba(236, 72, 153, 0.15)",
                mb: 2,
              }}
            >
              📸
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontFamily: "'Quicksand', sans-serif",
                color: "#1f2937",
                mb: 0.5,
                fontSize: "1.75rem",
              }}
            >
              Đăng nhập
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#6b7280",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "0.95rem",
              }}
            >
              Chào mừng bạn đến với GlamBooth
            </Typography>
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              id="input-login-email"
              margin="normal"
              required
              fullWidth
              label="Địa chỉ Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ color: "#ec4899" }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.6)" },
              }}
            />

            <TextField
              id="input-login-password"
              margin="normal"
              required
              fullWidth
              label="Mật khẩu"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: "#ec4899" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.6)" },
              }}
            />

            <Button
              id="btn-login-submit"
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting}
              sx={{
                mt: 3,
                mb: 2.5,
                py: 1.4,
                borderRadius: "100px",
                backgroundColor: "#ec4899",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "1rem",
                fontFamily: "'Quicksand', sans-serif",
                textTransform: "none",
                boxShadow: "0 6px 18px rgba(236, 72, 153, 0.35)",
                "&:hover": {
                  backgroundColor: "#db2777",
                  boxShadow: "0 8px 22px rgba(236, 72, 153, 0.45)",
                },
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                "Đăng nhập"
              )}
            </Button>

            {/* Link sang trang Đăng ký */}
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="body2"
                sx={{
                  color: "#6b7280",
                  fontFamily: "'Quicksand', sans-serif",
                  "& a": {
                    color: "#ec4899",
                    fontWeight: 700,
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  },
                }}
              >
                Chưa có tài khoản?{" "}
                <RouterLink id="link-to-register" to="/register">
                  Đăng ký ngay
                </RouterLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}


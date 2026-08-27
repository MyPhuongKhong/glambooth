// FILE: src/pages/Auth/RegisterPage.jsx
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
import { Link as RouterLink, useNavigate } from "react-router-dom";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Vui lòng nhập Họ và tên!");
      return;
    }
    if (!email.trim()) {
      toast.error("Vui lòng nhập địa chỉ Email!");
      return;
    }
    if (!password) {
      toast.error("Vui lòng nhập mật khẩu!");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải có độ dài tối thiểu 6 ký tự!");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(email.trim(), password, displayName.trim());
      toast.success("Đăng ký tài khoản thành công! Chào mừng bạn ✨", {
        icon: "🎉",
      });
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      let errorMsg = "Đăng ký thất bại. Vui lòng thử lại!";
      if (error.code === "auth/email-already-in-use") {
        errorMsg = "Email này đã được đăng ký tài khoản khác!";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Địa chỉ email không hợp lệ!";
      } else if (error.code === "auth/weak-password") {
        errorMsg = "Mật khẩu quá yếu! Hãy dùng ít nhất 6 ký tự.";
      }
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      id="register-page-container"
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
          id="register-card"
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
          <Box sx={{ textAlign: "center", mb: 3 }}>
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
              ✨
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
              Tạo tài khoản
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#6b7280",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "0.95rem",
              }}
            >
              Bắt đầu lưu giữ kỷ niệm cùng GlamBooth
            </Typography>
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              id="input-register-name"
              margin="dense"
              required
              fullWidth
              label="Họ và tên"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlinedIcon sx={{ color: "#ec4899" }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.6)" },
                },
              }}
            />

            <TextField
              id="input-register-email"
              margin="dense"
              required
              fullWidth
              label="Địa chỉ Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ color: "#ec4899" }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.6)" },
                },
              }}
            />

            <TextField
              id="input-register-password"
              margin="dense"
              required
              fullWidth
              label="Mật khẩu (tối thiểu 6 ký tự)"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              slotProps={{
                input: {
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
                },
              }}
            />

            <TextField
              id="input-register-confirm-password"
              margin="dense"
              required
              fullWidth
              label="Xác nhận mật khẩu"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: "#ec4899" }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.6)" },
                },
              }}
            />

            <Button
              id="btn-register-submit"
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
                "Đăng ký"
              )}
            </Button>

            {/* Link sang trang Đăng nhập */}
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
                Đã có tài khoản?{" "}
                <RouterLink id="link-to-login" to="/login">
                  Đăng nhập
                </RouterLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}


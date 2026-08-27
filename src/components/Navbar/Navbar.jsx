// FILE: src/components/Navbar/Navbar.jsx
import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Container,
  ListItemIcon,
  Divider,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleCloseMenu();
    navigate("/profile");
  };

  const handleLogoutClick = async () => {
    handleCloseMenu();
    try {
      await logout();
      toast.success("Đã đăng xuất thành công!", {
        icon: "👋",
      });
      navigate("/login");
    } catch (error) {
      console.error(error);
      toast.error("Không thể đăng xuất. Vui lòng thử lại!");
    }
  };

  // Lấy ký tự đầu tiên trong tên hoặc email để hiển thị Avatar
  const getUserInitial = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.charAt(0).toUpperCase();
    }
    if (currentUser?.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return "T";
  };

  const getUserDisplayName = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName;
    }
    if (currentUser?.email) {
      return currentUser.email.split("@")[0];
    }
    return "Thanh Tùng";
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, pt: { xs: 2, sm: 3 }, pb: 1 }}>
      <AppBar
        id="main-navbar"
        position="static"
        elevation={0}
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.45)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          borderRadius: "24px",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
          color: "#1e293b",
          transition: "all 0.3s ease",
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: "64px", sm: "80px" }, px: { xs: 1.5, sm: 3 } }}>
            {/* Logo GlamBooth phong cách Frosted Glass */}
            <Box
              id="brand-logo"
              component={RouterLink}
              to="/"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontWeight: 700,
                  fontSize: { xs: "1.4rem", sm: "1.75rem" },
                  letterSpacing: "-0.5px",
                  background: "linear-gradient(to right, #ec4899, #a855f7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  userSelect: "none",
                }}
              >
                GlamBooth
              </Typography>
            </Box>

            {/* Navigation links */}
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 4, ml: 5 }}>
              <Typography
                component={RouterLink}
                to="/"
                sx={{
                  textDecoration: "none",
                  color: location.pathname === "/" ? "#ec4899" : "#4b5563",
                  fontWeight: location.pathname === "/" ? 700 : 500,
                  fontSize: "1rem",
                  transition: "color 0.2s ease",
                  "&:hover": { color: "#ec4899" },
                }}
              >
                Trang chủ
              </Typography>
              <Typography
                component={RouterLink}
                to="/photobooth"
                sx={{
                  textDecoration: "none",
                  color: location.pathname !== "/" && location.pathname !== "/login" && location.pathname !== "/register" ? "#ec4899" : "#4b5563",
                  fontWeight: 500,
                  fontSize: "1rem",
                  transition: "color 0.2s ease",
                  "&:hover": { color: "#ec4899" },
                }}
              >
                Khám phá
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Khu vực điều khiển Auth */}
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
              {currentUser ? (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      cursor: "pointer",
                      p: 0.5,
                      borderRadius: "100px",
                      transition: "background-color 0.2s ease",
                      "&:hover": { bgcolor: "rgba(236, 72, 153, 0.08)" },
                    }}
                    onClick={handleOpenMenu}
                  >
                    <Avatar
                      id="user-avatar-btn"
                      sx={{
                        bgcolor: "#ec4899",
                        color: "#ffffff",
                        fontWeight: 700,
                        width: 40,
                        height: 40,
                        boxShadow: "0 4px 14px rgba(236, 72, 153, 0.35)",
                        fontSize: "1.1rem",
                      }}
                    >
                      {getUserInitial()}
                    </Avatar>
                    <Typography
                      variant="body2"
                      sx={{
                        display: { xs: "none", sm: "block" },
                        fontWeight: 600,
                        color: "#1e293b",
                        pr: 1,
                        fontSize: "0.95rem",
                      }}
                    >
                      {getUserDisplayName()}
                    </Typography>
                  </Box>

                  <Menu
                    id="user-profile-menu"
                    anchorEl={anchorEl}
                    open={isMenuOpen}
                    onClose={handleCloseMenu}
                    transformOrigin={{ horizontal: "right", vertical: "top" }}
                    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    slotProps={{
                      paper: {
                        elevation: 0,
                        sx: {
                          mt: 1.5,
                          minWidth: 210,
                          borderRadius: "20px",
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          backdropFilter: "blur(20px)",
                          WebkitBackdropFilter: "blur(20px)",
                          border: "1px solid rgba(255, 255, 255, 0.7)",
                          boxShadow: "0 12px 36px 0 rgba(31, 38, 135, 0.12)",
                          p: 1,
                        },
                      },
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5, display: { xs: "block", sm: "none" } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                        {getUserDisplayName()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {currentUser.email}
                      </Typography>
                    </Box>
                    <Divider sx={{ display: { xs: "block", sm: "none" }, my: 0.5 }} />

                    <MenuItem
                      id="menu-item-profile"
                      onClick={handleProfileClick}
                      sx={{
                        py: 1.2,
                        px: 2,
                        borderRadius: "12px",
                        my: 0.5,
                        "&:hover": { backgroundColor: "rgba(236, 72, 153, 0.1)" },
                      }}
                    >
                      <ListItemIcon>
                        <PersonOutlinedIcon fontSize="small" sx={{ color: "#ec4899" }} />
                      </ListItemIcon>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
                        Trang cá nhân
                      </Typography>
                    </MenuItem>

                    <MenuItem
                      id="menu-item-logout"
                      onClick={handleLogoutClick}
                      sx={{
                        py: 1.2,
                        px: 2,
                        borderRadius: "12px",
                        my: 0.5,
                        color: "#ef4444",
                        "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.08)" },
                      }}
                    >
                      <ListItemIcon>
                        <LogoutIcon fontSize="small" sx={{ color: "#ef4444" }} />
                      </ListItemIcon>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Đăng xuất
                      </Typography>
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Box sx={{ display: "flex", gap: { xs: 1, sm: 1.5 } }}>
                  <Button
                    id="btn-nav-login"
                    component={RouterLink}
                    to="/login"
                    size="medium"
                    startIcon={<LoginIcon />}
                    sx={{
                      backgroundColor: "rgba(236, 72, 153, 0.1)",
                      color: "#ec4899",
                      fontWeight: 600,
                      padding: { xs: "8px 12px", sm: "8px 20px" },
                      borderRadius: "100px",
                      border: "none",
                      whiteSpace: "nowrap",
                      minWidth: { xs: "auto", sm: "fit-content" },
                      "& .MuiButton-startIcon": {
                        mr: { xs: 0, sm: 1 },
                        ml: { xs: 0, sm: -0.5 },
                      },
                      "&:hover": {
                        backgroundColor: "rgba(236, 72, 153, 0.18)",
                      },
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                      Đăng nhập
                    </Box>
                  </Button>
                  <Button
                    id="btn-nav-register"
                    component={RouterLink}
                    to="/register"
                    variant="contained"
                    size="medium"
                    startIcon={<PersonAddAlt1Icon />}
                    sx={{
                      backgroundColor: "#ec4899",
                      color: "#ffffff",
                      fontWeight: 600,
                      padding: { xs: "8px 12px", sm: "8px 22px" },
                      borderRadius: "100px",
                      boxShadow: "0 6px 18px rgba(236, 72, 153, 0.35)",
                      whiteSpace: "nowrap",
                      minWidth: { xs: "auto", sm: "fit-content" },
                      "& .MuiButton-startIcon": {
                        mr: { xs: 0, sm: 1 },
                        ml: { xs: 0, sm: -0.5 },
                      },
                      "&:hover": {
                        backgroundColor: "#db2777",
                        boxShadow: "0 8px 22px rgba(236, 72, 153, 0.45)",
                      },
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                      Đăng ký
                    </Box>
                  </Button>
                </Box>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </Box>
  );
}


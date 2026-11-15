// FILE: src/pages/Home/HomePage.jsx
import React from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer/Footer";

export default function HomePage() {
  const navigate = useNavigate();

  // Xử lý điều hướng trực tiếp khi bấm thẻ tính năng
  const handleFeatureClick = (path) => {
    navigate(path);
  };

  const featureCards = [
    {
      id: "card-glambot",
      title: "GlamBot Video",
      icon: "🎬",
      iconBg: "#ffffff",
      description: "Quay video slow-motion chuyên nghiệp như thảm đỏ.",
      path: "/glambot",
      btnText: "Trải nghiệm",
      isPrimary: false,
    },
    {
      id: "card-photobooth",
      title: "Photo Booth",
      icon: "📸",
      iconBg: "#fce7f3",
      description: "Chụp ảnh lấy liền với hàng nghìn filter xinh xắn.",
      path: "/photobooth",
      btnText: "Bắt đầu ngay",
      isPrimary: true,
    },
    {
      id: "card-gesture",
      title: "Gesture Surprise",
      icon: "✌️",
      iconBg: "#ffffff",
      description: "Tương tác bằng cử chỉ tay để tạo hiệu ứng bất ngờ.",
      path: "/gesture",
      btnText: "Khám phá",
      isPrimary: false,
    },
  ];

  return (
    <Box
      id="home-page-container"
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "calc(100vh - 110px)",
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Banner tiêu đề chính */}
        <Box sx={{ textAlign: "center", mb: { xs: 4, md: 7 } }}>
          <Typography
            id="home-title"
            variant="h1"
            sx={{
              fontWeight: 800,
              fontFamily: "'Quicksand', sans-serif",
              fontSize: { xs: "2.8rem", sm: "3.8rem", md: "4.5rem" },
              color: "#1f2937",
              letterSpacing: "-0.03em",
              mb: 1.5,
            }}
          >
            GlamBooth
          </Typography>

          <Typography
            id="home-subtitle"
            variant="h6"
            sx={{
              color: "#6b7280",
              fontWeight: 500,
              fontFamily: "'Quicksand', sans-serif",
              fontSize: { xs: "1.1rem", md: "1.35rem" },
              maxWidth: 650,
              mx: "auto",
            }}
          >
            Kỷ niệm từng khoảnh khắc • Đẹp tựa phim Hàn
          </Typography>
        </Box>

        {/* 3 Thẻ tính năng Frosted Glass */}
        <Grid
          container
          spacing={{ xs: 3, md: 4 }}
          sx={{
            width: "100%",
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          {featureCards.map((card) => (
            <Grid
              key={card.id}
              size={{ xs: 12, sm: 6, md: 4 }}
              sx={{ display: "flex" }}
            >
              <Box
                id={card.id}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  p: { xs: 3.5, md: 4 },
                  textAlign: "center",
                  background: card.isPrimary
                    ? "rgba(255, 255, 255, 0.6)"
                    : "rgba(255, 255, 255, 0.45)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: card.isPrimary
                    ? "2px solid rgba(236, 72, 153, 0.35)"
                    : "1px solid rgba(255, 255, 255, 0.6)",
                  borderRadius: "24px",
                  boxShadow: card.isPrimary
                    ? "0 12px 36px 0 rgba(236, 72, 153, 0.12)"
                    : "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 16px 40px 0 rgba(236, 72, 153, 0.18)",
                    border: "2px solid rgba(236, 72, 153, 0.4)",
                  },
                }}
                onClick={() => handleFeatureClick(card.path)}
              >
                {/* Icon Circle */}
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: card.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.5rem",
                    mb: 3,
                    boxShadow: "0 10px 20px rgba(236, 72, 153, 0.15)",
                    transition: "transform 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  {card.icon}
                </Box>

                {/* Title */}
                <Typography
                  variant="h5"
                  component="h3"
                  sx={{
                    fontWeight: 700,
                    fontFamily: "'Quicksand', sans-serif",
                    color: "#1f2937",
                    mb: 1.5,
                    fontSize: "1.35rem",
                  }}
                >
                  {card.title}
                </Typography>

                {/* Description */}
                <Typography
                  variant="body2"
                  sx={{
                    color: "#6b7280",
                    fontSize: "0.925rem",
                    lineHeight: 1.55,
                    mb: 3.5,
                    minHeight: "44px",
                  }}
                >
                  {card.description}
                </Typography>

                {/* Button */}
                <Button
                  id={`btn-action-${card.id}`}
                  fullWidth
                  variant={card.isPrimary ? "contained" : "text"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeatureClick(card.path);
                  }}
                  sx={{
                    py: 1.2,
                    px: 3,
                    borderRadius: "100px",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    fontFamily: "'Quicksand', sans-serif",
                    textTransform: "none",
                    backgroundColor: card.isPrimary ? "#ec4899" : "rgba(236, 72, 153, 0.1)",
                    color: card.isPrimary ? "#ffffff" : "#ec4899",
                    boxShadow: card.isPrimary ? "0 6px 18px rgba(236, 72, 153, 0.35)" : "none",
                    "&:hover": {
                      backgroundColor: card.isPrimary ? "#db2777" : "#ec4899",
                      color: "#ffffff",
                      boxShadow: "0 8px 22px rgba(236, 72, 153, 0.4)",
                    },
                  }}
                >
                  {card.btnText}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
}


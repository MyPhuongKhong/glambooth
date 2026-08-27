import React from "react";
import { Box, Container, Typography } from "@mui/material";

export default function Footer() {
  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 5, md: 8 } }}>
      <Box
        component="footer"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          py: 2,
          px: { xs: 2, sm: 3 },
          color: "#9ca3af",
          fontSize: "0.875rem",
          fontFamily: "'Quicksand', sans-serif",
          fontWeight: 500,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "#9ca3af",
            fontWeight: 500,
            whiteSpace: "nowrap",
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          }}
        >
          © 2024 GlamBooth Studio. All rights reserved.
        </Typography>
        <Box sx={{ display: "flex", gap: 3 }}>
          <Typography
            component="span"
            sx={{
              cursor: "pointer",
              color: "#9ca3af",
              fontSize: "0.875rem",
              "&:hover": { color: "#ec4899" },
            }}
          >
            Điều khoản
          </Typography>
          <Typography
            component="span"
            sx={{
              cursor: "pointer",
              color: "#9ca3af",
              fontSize: "0.875rem",
              "&:hover": { color: "#ec4899" },
            }}
          >
            Liên hệ
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

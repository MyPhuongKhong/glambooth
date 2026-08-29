// FILE: src/pages/PhotoBooth/PhotoBoothPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Tooltip,
  Dialog,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CheckIcon from "@mui/icons-material/Check";
import ReplayIcon from "@mui/icons-material/Replay";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import toast from "react-hot-toast";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { useAuth } from "../../contexts/AuthContext";
import { uploadToCloudinary } from "../../cloudinary/upload";
import { db } from "../../firebase/config";

// ══════════════════════════════════════
// SHARED CONSTANTS (defined outside component)
// ══════════════════════════════════════

const LAYOUTS = [
  { id: "v2", label: "Dọc 2", cols: 1, rows: 2, W: 540, H: 960 },
  { id: "v3", label: "Dọc 3", cols: 1, rows: 3, W: 540, H: 1080 },
  { id: "h1", label: "Ngang 1", cols: 1, rows: 1, W: 900, H: 720 },
  { id: "h2", label: "Ngang 2", cols: 2, rows: 1, W: 900, H: 720 },
  { id: "h4", label: "2×2", cols: 2, rows: 2, W: 900, H: 800 },
];

const FRAME_COLORS = [
  { id: "graduation", label: "Graduation", color: "#3a86ff" },
  { id: "birthday", label: "Birthday", color: "#adff02" },
  { id: "minimal", label: "Minimal", color: "#e3d5ca" },
  { id: "floral", label: "Floral", color: "#EE7674" },
  { id: "retro", label: "Retro", color: "#d4a373" },
  { id: "custom", label: "Tuỳ chọn", color: null },
];

const PRESET_EMOJIS = [
  "🎉", "🎂", "💐", "✨", "🌸", "🦋", "🎈", "💕",
  "🌈", "⭐", "🎓", "🏆", "🍀", "🎀", "🫶", "😊",
];

const MARGIN = { top: 16, right: 16, bottom: 80, left: 16 };
const GAP = 8;

// Compute cell rects for a layout (Pure math function, no hooks/JSX)
const getCells = (layout) => {
  const { cols, rows, W, H } = layout;
  const cellW = (W - MARGIN.left - MARGIN.right - GAP * (cols - 1)) / cols;
  const cellH = (H - MARGIN.top - MARGIN.bottom - GAP * (rows - 1)) / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        index: r * cols + c,
        x: MARGIN.left + c * (cellW + GAP),
        y: MARGIN.top + r * (cellH + GAP),
        w: cellW,
        h: cellH,
      });
    }
  }
  return cells;
};

// Emoji to canvas image (Pure canvas utility, no React hooks/JSX)
const createEmojiImage = (emoji) => {
  const size = 80;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.font = `${size * 0.8}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2);
  return c;
};

// Draw full composite frame on any canvas context
const drawComposite = (ctx, layout, color, stickerList, slotImages = []) => {
  const { W, H } = layout;
  const RADIUS = 24;
  const cells = getCells(layout);

  // 1. Clip to rounded rect
  // ctx.save();
  // ctx.beginPath();
  // ctx.roundRect(0, 0, W, H, RADIUS);
  // ctx.clip();

  // 2. Fill background with frame color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);

  // 3. Fill each cell white (empty slot) or with captured image
  cells.forEach((cell, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cell.x, cell.y, cell.w, cell.h, 8);
    ctx.clip();
    if (slotImages[i]) {
      ctx.drawImage(slotImages[i], cell.x, cell.y, cell.w, cell.h);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    }
    ctx.restore();
  });

  // 4. Draw stickers
  stickerList.forEach((s) => {
    if (s && s.img) {
      ctx.drawImage(s.img, s.x - s.width / 2, s.y - s.height / 2, s.width, s.height);
    }
  });

  ctx.restore(); // end rounded clip

  // 5. Draw border ring (outside clip so corners are clean)
  // ctx.beginPath();
  // ctx.roundRect(1, 1, W - 2, H - 2, RADIUS);
  // ctx.strokeStyle = color;
  // ctx.lineWidth = 4;
  // ctx.stroke();
};

export default function PhotoBoothPage() {
  // All hooks at top level
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState("customize"); // 'customize' | 'capture' | 'review'

  // Customization state
  const [selectedLayout, setSelectedLayout] = useState(LAYOUTS[0]);
  const [frameColorId, setFrameColorId] = useState("graduation");
  const [customColor, setCustomColor] = useState("#e91e8c");
  const [stickers, setStickers] = useState([]);

  // Capture state
  const [capturedSlots, setCapturedSlots] = useState([]);
  const [currentSlot, setCurrentSlot] = useState(0);
  const [countdown, setCountdown] = useState(null);

  // Upload & Save state
  const [isUploading, setIsUploading] = useState(false);
  const [savedUrl, setSavedUrl] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const previewCanvasRef = useRef(null); // Step 1 canvas
  const captureCanvasRef = useRef(null); // Step 2 canvas
  const reviewCanvasRef = useRef(null); // Step 3 canvas
  const dragRef = useRef({ active: false, id: null, offX: 0, offY: 0 });
  const objectUrlsRef = useRef([]);

  // Derived variables
  const frameColor =
    frameColorId === "custom"
      ? customColor
      : FRAME_COLORS.find((f) => f.id === frameColorId)?.color ?? "#e91e8c";
  const totalSlots = selectedLayout.cols * selectedLayout.rows;
  const cells = getCells(selectedLayout);

  // Helper to stop camera streams cleanly
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Helper to start camera streams
  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      toast.error("Không thể mở Camera. Vui lòng cấp quyền truy cập thiết bị!");
    }
  }, [stopCamera]);

  // Overall unmount cleanup
  useEffect(() => {
    return () => {
      stopCamera();
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) { }
      });
      objectUrlsRef.current = [];
    };
  }, [stopCamera]);

  // ══════════════════════════════════════
  // STICKER DRAG & DROP UTILITIES
  // ══════════════════════════════════════
  const toCanvasCoords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getStickerAt = (x, y) => {
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i];
      if (
        x >= s.x - s.width / 2 &&
        x <= s.x + s.width / 2 &&
        y >= s.y - s.height / 2 &&
        y <= s.y + s.height / 2
      ) {
        return s;
      }
    }
    return null;
  };

  const handleStickerMouseDown = (e) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const { x, y } = toCanvasCoords(e, canvas);
    const hit = getStickerAt(x, y);
    if (hit) {
      dragRef.current = {
        active: true,
        id: hit.id,
        offX: x - hit.x,
        offY: y - hit.y,
      };
    }
  };

  const handleStickerMouseMove = (e) => {
    if (!dragRef.current.active) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const { x, y } = toCanvasCoords(e, canvas);
    setStickers((prev) =>
      prev.map((s) =>
        s.id === dragRef.current.id
          ? { ...s, x: x - dragRef.current.offX, y: y - dragRef.current.offY }
          : s
      )
    );
  };

  const handleStickerMouseUp = () => {
    dragRef.current.active = false;
  };

  const handleStickerTouchStart = (e) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const { x, y } = toCanvasCoords(e, canvas);
    const hit = getStickerAt(x, y);
    if (hit) {
      dragRef.current = {
        active: true,
        id: hit.id,
        offX: x - hit.x,
        offY: y - hit.y,
      };
    }
  };

  const handleStickerTouchMove = (e) => {
    if (!dragRef.current.active) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const { x, y } = toCanvasCoords(e, canvas);
    setStickers((prev) =>
      prev.map((s) =>
        s.id === dragRef.current.id
          ? { ...s, x: x - dragRef.current.offX, y: y - dragRef.current.offY }
          : s
      )
    );
  };

  const handleStickerTouchEnd = () => {
    dragRef.current.active = false;
  };

  // Sticker actions
  const addEmojiSticker = (emoji) => {
    const img = createEmojiImage(emoji);
    const { W, H } = selectedLayout;
    setStickers((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        type: "emoji",
        emoji,
        img,
        x: W / 2,
        y: H / 2,
        width: 80,
        height: 80,
      },
    ]);
  };

  const handleStickerUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      const img = new Image();
      img.onload = () => {
        const aspect = img.height / img.width || 1;
        const { W, H } = selectedLayout;
        setStickers((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            type: "custom",
            previewUrl: url,
            img,
            x: W / 2,
            y: H / 2,
            width: 100,
            height: 100 * aspect,
          },
        ]);
      };
      img.src = url;
    });
    e.target.value = "";
  };

  const removeSticker = (id) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  // ══════════════════════════════════════
  // STEP 1: PREVIEW RAF LOOP (with cleanup)
  // ══════════════════════════════════════
  useEffect(() => {
    if (step !== "customize") return;
    let animId;
    const loop = () => {
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        drawComposite(ctx, selectedLayout, frameColor, stickers, []);
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [step, selectedLayout, frameColor, stickers]);

  // ══════════════════════════════════════
  // STEP 2: CAPTURE FLOW & RAF LOOP
  // ══════════════════════════════════════
  const handleStartCapture = async () => {
    setCapturedSlots([]);
    setCurrentSlot(0);
    setStep("capture");
    await startCamera();
  };

  // Capture RAF loop (with cleanup)
  useEffect(() => {
    if (step !== "capture") return;
    let animId;

    const renderCaptureLoop = () => {
      const canvas = captureCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const curCells = getCells(selectedLayout);

        // 1. Draw composite with captured slots so far
        drawComposite(ctx, selectedLayout, frameColor, stickers, capturedSlots);

        // 2. On current empty cell: draw live camera feed
        const activeCell = curCells[currentSlot];
        if (activeCell && videoRef.current && videoRef.current.readyState >= 2) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(activeCell.x, activeCell.y, activeCell.w, activeCell.h, 8);
          ctx.clip();

          const vW = videoRef.current.videoWidth || 640;
          const vH = videoRef.current.videoHeight || 480;
          const cAspect = activeCell.w / activeCell.h;
          const vAspect = vW / vH;

          let sx = 0,
            sy = 0,
            sw = vW,
            sh = vH;
          if (vAspect > cAspect) {
            sw = vH * cAspect;
            sx = (vW - sw) / 2;
          } else {
            sh = vW / cAspect;
            sy = (vH - sh) / 2;
          }

          // Mirror camera (selfie mode)
          ctx.translate(activeCell.x + activeCell.w, activeCell.y);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, sx, sy, sw, sh, 0, 0, activeCell.w, activeCell.h);
          ctx.restore();

          // Highlight current cell with white border
          ctx.save();
          ctx.strokeStyle = "white";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(activeCell.x + 2, activeCell.y + 2, activeCell.w - 4, activeCell.h - 4, 8);
          ctx.stroke();
          ctx.restore();

          // Countdown number in center of cell
          if (countdown !== null) {
            ctx.save();
            ctx.font = `bold ${Math.min(activeCell.w, activeCell.h) * 0.4}px 'Quicksand', Arial, sans-serif`;
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,0.7)";
            ctx.shadowBlur = 12;
            ctx.fillText(String(countdown), activeCell.x + activeCell.w / 2, activeCell.y + activeCell.h / 2);
            ctx.restore();
          }
        }
      }
      animId = requestAnimationFrame(renderCaptureLoop);
    };

    animId = requestAnimationFrame(renderCaptureLoop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [step, selectedLayout, frameColor, stickers, capturedSlots, currentSlot, countdown]);

  // Auto-capture countdown runner (with cleanup)
  useEffect(() => {
    if (step !== "capture") return;
    if (capturedSlots.length >= totalSlots && capturedSlots.every(Boolean)) {
      stopCamera();
      setStep("review");
      return;
    }

    let cancelled = false;

    const runCountdown = async () => {
      // Countdown 3 -> 2 -> 1
      for (let i = 3; i >= 1; i--) {
        if (cancelled) return;
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (cancelled) return;
      setCountdown(null);

      // Capture current cell to offscreen image
      const curCells = getCells(selectedLayout);
      const cell = curCells[currentSlot];
      if (!cell || !videoRef.current) return;

      const offscreen = document.createElement("canvas");
      offscreen.width = cell.w;
      offscreen.height = cell.h;
      const octx = offscreen.getContext("2d");

      const vW = videoRef.current.videoWidth || 640;
      const vH = videoRef.current.videoHeight || 480;
      const cAspect = cell.w / cell.h;
      const vAspect = vW / vH;

      let sx = 0,
        sy = 0,
        sw = vW,
        sh = vH;
      if (vAspect > cAspect) {
        sw = vH * cAspect;
        sx = (vW - sw) / 2;
      } else {
        sh = vW / cAspect;
        sy = (vH - sh) / 2;
      }

      // Mirrored capture
      octx.translate(cell.w, 0);
      octx.scale(-1, 1);
      octx.drawImage(videoRef.current, sx, sy, sw, sh, 0, 0, cell.w, cell.h);

      const blobUrl = await new Promise((res) =>
        offscreen.toBlob((b) => res(URL.createObjectURL(b)), "image/jpeg", 0.95)
      );
      objectUrlsRef.current.push(blobUrl);

      const img = new Image();
      img.src = blobUrl;
      await new Promise((r) => {
        img.onload = r;
      });

      if (cancelled) return;

      setCapturedSlots((prev) => {
        const next = [...prev];
        next[currentSlot] = img;
        return next;
      });

      // Advance to next slot or complete
      if (currentSlot + 1 < totalSlots) {
        setCurrentSlot((s) => s + 1);
      } else {
        stopCamera();
        setStep("review");
      }
    };

    runCountdown();

    return () => {
      cancelled = true;
    };
  }, [step, currentSlot, selectedLayout, totalSlots, stopCamera, capturedSlots]);

  // ══════════════════════════════════════
  // STEP 3: REVIEW & RETAKE & SAVE
  // ══════════════════════════════════════
  useEffect(() => {
    if (step !== "review") return;
    stopCamera();
    const canvas = reviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawComposite(ctx, selectedLayout, frameColor, stickers, capturedSlots);
  }, [step, selectedLayout, frameColor, stickers, capturedSlots, stopCamera]);

  const handleRetake = async (index) => {
    setCapturedSlots((prev) => {
      const n = [...prev];
      n[index] = null;
      return n;
    });
    setCurrentSlot(index);
    setStep("capture");
    await startCamera();
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      const canvas = reviewCanvasRef.current;
      if (!canvas) throw new Error("Canvas not available");

      // Redraw final composite cleanly
      const ctx = canvas.getContext("2d");
      drawComposite(ctx, selectedLayout, frameColor, stickers, capturedSlots);

      const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.95));
      const file = new File([blob], `photobooth-${Date.now()}.jpg`, { type: "image/jpeg" });

      const uploadResult = await uploadToCloudinary(file, "photobooth");

      if (currentUser && currentUser.uid) {
        await addDoc(collection(db, "photos"), {
          userId: currentUser.uid,
          imageUrl: uploadResult.url,
          publicId: uploadResult.publicId || "",
          layoutId: selectedLayout.id,
          frameColorId,
          type: "photobooth",
          isPublic: true,
          createdAt: serverTimestamp(),
        });
      }

      setSavedUrl(uploadResult.url);
      toast.success("Lưu ảnh Photo Booth thành công! ✨");
    } catch (err) {
      console.error("Lỗi khi lưu ảnh:", err);
      toast.error("Lỗi khi tải ảnh lên. Vui lòng thử lại!");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadPhoto = async () => {
    if (!savedUrl) return;
    try {
      const response = await fetch(savedUrl);
      const blob = await response.blob();
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `glambooth-photo-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải ảnh về máy!");
    } catch (err) {
      console.error("Download error:", err);
      window.open(savedUrl, "_blank");
    }
  };

  const handleResetAll = () => {
    setSavedUrl(null);
    setCapturedSlots([]);
    setCurrentSlot(0);
    setStickers([]);
    setStep("customize");
  };

  // ══════════════════════════════════════
  // RENDER PER STEP
  // ══════════════════════════════════════

  return (
    <Box
      id="photobooth-root-container"
      sx={{
        height: "100vh",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "#fdf0f7",
      }}
    >
      {/* Hidden camera video element */}
      <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />

      {/* STEP 1: CUSTOMIZE */}
      {step === "customize" && (
        <>
          {/* Navbar */}
          <Box sx={{ display: "flex", alignItems: "center", px: 3, py: 1.5, flexShrink: 0 }}>
            <Button
              id="btn-photobooth-back-home"
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/")}
              sx={{
                color: "#6b7280",
                fontWeight: 700,
                borderRadius: "100px",
                fontFamily: "'Quicksand', sans-serif",
                textTransform: "none",
                "&:hover": {
                  color: "#ec4899",
                  backgroundColor: "rgba(236, 72, 153, 0.08)",
                },
              }}
            >
              Trang chủ
            </Button>
            <Chip
              label="📸 Photo Booth"
              sx={{
                ml: "auto",
                backgroundColor: "rgba(236, 72, 153, 0.12)",
                color: "#ec4899",
                fontWeight: 700,
                fontFamily: "'Quicksand', sans-serif",
                borderRadius: "100px",
                px: 1,
              }}
            />
          </Box>

          {/* Main Content */}
          <Box
            sx={{
              display: 'flex',
              flex: 1,
              minHeight: 0,
              gap: 2,
              px: { xs: 2, md: 3 },
              pb: 2,
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            {/* LEFT: Preview Canvas */}
            <Paper
              elevation={2}
              sx={{
                // Mobile: fixed height so it doesn't collapse
                height: { xs: 280, md: 'auto' },
                minHeight: { xs: 280, md: 0 },
                flex: { xs: 'none', md: 1 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                overflow: 'hidden',
              }}
            >
              <canvas
                id="photobooth-preview-canvas"
                ref={previewCanvasRef}
                width={selectedLayout.W}
                height={selectedLayout.H}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  // borderRadius: 16,
                  cursor: 'grab',
                  // On mobile: constrain to fit in 280px container
                  height: 'auto',
                  objectFit: 'contain',
                }}
                onMouseDown={handleStickerMouseDown}
                onMouseMove={handleStickerMouseMove}
                onMouseUp={handleStickerMouseUp}
                onTouchStart={handleStickerTouchStart}
                onTouchMove={handleStickerTouchMove}
                onTouchEnd={handleStickerTouchEnd}
              />
            </Paper>

            {/* RIGHT: Controls */}
            <Paper
              elevation={2}
              sx={{
                width: { xs: '100%', md: 300 },
                flex: { xs: 1, md: 'none' }, // flex:1 on mobile so it fills remaining space
                minHeight: 0,
                flexShrink: 0,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                overflowY: 'auto', // scrollable controls on mobile
              }}
            >
              {/* Layout Picker */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontFamily: "'Quicksand', sans-serif" }}>
                  Kiểu khung
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {LAYOUTS.map((l) => (
                    <Chip
                      key={l.id}
                      label={l.label}
                      onClick={() => setSelectedLayout(l)}
                      variant={selectedLayout.id === l.id ? "filled" : "outlined"}
                      color={selectedLayout.id === l.id ? "primary" : "default"}
                      sx={{
                        cursor: "pointer",
                        fontWeight: 600,
                        backgroundColor: selectedLayout.id === l.id ? "#ec4899" : "transparent",
                        borderColor: "#ec4899",
                        color: selectedLayout.id === l.id ? "#fff" : "#ec4899",
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Color Picker */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontFamily: "'Quicksand', sans-serif" }}>
                  Màu khung
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                  {FRAME_COLORS.map((fc) => (
                    <Tooltip key={fc.id} title={fc.label}>
                      <Box
                        onClick={() => setFrameColorId(fc.id)}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          cursor: "pointer",
                          background: fc.color ?? "conic-gradient(red,yellow,green,blue,red)",
                          border: frameColorId === fc.id ? "3px solid #333" : "2px solid #ccc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          transition: "transform 0.15s ease",
                          "&:hover": { transform: "scale(1.1)" },
                        }}
                      >
                        {frameColorId === fc.id && (
                          <CheckIcon sx={{ fontSize: 16, color: fc.id === "birthday" || fc.id === "minimal" ? "#333" : "white" }} />
                        )}
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
                {frameColorId === "custom" && (
                  <Box sx={{ mt: 1 }}>
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      style={{
                        width: "100%",
                        height: 40,
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    />
                  </Box>
                )}
              </Box>

              {/* Emoji Stickers */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8, fontFamily: "'Quicksand', sans-serif" }}>
                  Sticker Emoji
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {PRESET_EMOJIS.map((emoji) => (
                    <Box
                      key={emoji}
                      onClick={() => addEmojiSticker(emoji)}
                      sx={{
                        fontSize: 24,
                        cursor: "pointer",
                        p: 0.5,
                        borderRadius: 1,
                        transition: "transform 0.15s ease",
                        "&:hover": { bgcolor: "action.hover", transform: "scale(1.2)" },
                      }}
                    >
                      {emoji}
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Upload Custom Sticker */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8, fontFamily: "'Quicksand', sans-serif" }}>
                  Sticker tuỳ chỉnh
                </Typography>
                <Button
                  component="label"
                  variant="outlined"
                  fullWidth
                  startIcon={<AddPhotoAlternateIcon />}
                  sx={{
                    borderRadius: "999px",
                    borderColor: "#ec4899",
                    color: "#ec4899",
                    fontWeight: 700,
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#db2777",
                      backgroundColor: "rgba(236, 72, 153, 0.08)",
                    },
                  }}
                >
                  Tải PNG lên
                  <input type="file" accept="image/png,image/webp" hidden multiple onChange={handleStickerUpload} />
                </Button>
              </Box>

              {/* Sticker List with Click-to-Delete (Pattern 4 fixed: no inline canvas ref) */}
              {stickers.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600 }}>
                    Nhấn sticker để xoá ({stickers.length}):
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 0.8 }}>
                    {stickers.map((s) => (
                      <Box
                        key={s.id}
                        onClick={() => removeSticker(s.id)}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "8px",
                          overflow: "hidden",
                          cursor: "pointer",
                          border: "1px solid rgba(236, 72, 153, 0.3)",
                          backgroundColor: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          "&:hover": { opacity: 0.6, borderColor: "#f43f5e" },
                        }}
                      >
                        {s.type === "emoji" ? (
                          <Typography sx={{ fontSize: 20, lineHeight: 1 }}>{s.emoji}</Typography>
                        ) : (
                          <img
                            src={s.previewUrl}
                            alt="sticker"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Start Capture CTA */}
              <Button
                id="btn-start-capture-flow"
                variant="contained"
                size="large"
                fullWidth
                startIcon={<CameraAltIcon />}
                onClick={handleStartCapture}
                sx={{
                  borderRadius: "999px",
                  mt: "auto",
                  py: 1.4,
                  background: "linear-gradient(135deg, #e91e8c, #c2185b)",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "1rem",
                  fontFamily: "'Quicksand', sans-serif",
                  textTransform: "none",
                  boxShadow: "0 8px 24px rgba(236, 72, 153, 0.35)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #d81b60, #ad1457)",
                    boxShadow: "0 10px 28px rgba(236, 72, 153, 0.45)",
                  },
                }}
              >
                Bắt đầu chụp ({totalSlots} ảnh)
              </Button>
            </Paper>
          </Box>
        </>
      )}

      {/* STEP 2: CAPTURE */}
      {step === "capture" && (
        <Box
          sx={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#fdf0f7",
            gap: 2,
            py: 2,
            px: 2,
          }}
        >
          {/* Header & Progress */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 700, color: "#1f2937", fontFamily: "'Quicksand', sans-serif" }}>
              Đang chụp ảnh {Math.min(currentSlot + 1, totalSlots)} / {totalSlots}
            </Typography>
            <Chip
              label={countdown !== null ? `Đếm ngược ${countdown}s` : "Tạo dáng!"}
              color="secondary"
              size="small"
              sx={{ fontWeight: 700, backgroundColor: "#ec4899" }}
            />
          </Box>

          {/* Canvas Composite */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <canvas
              id="photobooth-capture-canvas"
              ref={captureCanvasRef}
              width={selectedLayout.W}
              height={selectedLayout.H}
              style={{
                maxHeight: "100%",
                maxWidth: "100%",
                // borderRadius:  16,
                boxShadow: "0 16px 45px rgba(0, 0, 0, 0.25)",
                display: "block",
              }}
            />
          </Box>

          {/* Linear Progress Indicator */}
          <Box sx={{ width: "80%", maxWidth: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={(capturedSlots.filter(Boolean).length / totalSlots) * 100}
              sx={{
                width: "100%",
                height: 8,
                // borderRadius: 16, 
                backgroundColor: "rgba(236, 72, 153, 0.2)",
                "& .MuiLinearProgress-bar": { backgroundColor: "#ec4899" },
              }}
            />
            <Button
              size="small"
              variant="text"
              onClick={() => {
                stopCamera();
                setStep("customize");
              }}
              sx={{ color: "#6b7280", textTransform: "none", fontWeight: 600 }}
            >
              Hủy và quay lại tuỳ chỉnh
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 3: REVIEW */}
      {step === "review" && (
        <Box
          sx={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            alignItems: "center",
            gap: 2,
            py: 2,
            px: 2,
            bgcolor: "#fdf0f7",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#1f2937", fontFamily: "'Quicksand', sans-serif" }}>
            Xem lại ảnh hoàn chỉnh ✨
          </Typography>

          {/* Final Composite Canvas with dedicated reviewCanvasRef */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <canvas
              id="photobooth-review-canvas"
              ref={reviewCanvasRef}
              width={selectedLayout.W}
              height={selectedLayout.H}
              style={{
                maxHeight: "100%",
                maxWidth: "100%",
                // borderRadius: 16,
                boxShadow: "0 16px 45px rgba(0, 0, 0, 0.25)",
                display: "block",
              }}
            />
          </Box>

          {/* Retake Buttons (one per cell) */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
            {cells.map((cell, i) => (
              <Button
                key={i}
                variant="outlined"
                size="small"
                startIcon={<ReplayIcon />}
                onClick={() => handleRetake(i)}
                sx={{
                  borderRadius: "999px",
                  borderColor: "#ec4899",
                  color: "#ec4899",
                  fontWeight: 700,
                  fontFamily: "'Quicksand', sans-serif",
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#db2777",
                    backgroundColor: "rgba(236, 72, 153, 0.08)",
                  },
                }}
              >
                Chụp lại ô {i + 1}
              </Button>
            ))}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "center" }}>
            <Button
              variant="outlined"
              onClick={handleResetAll}
              sx={{
                borderRadius: "999px",
                px: 3,
                py: 1.1,
                color: "#6b7280",
                borderColor: "#9ca3af",
                fontWeight: 700,
                fontFamily: "'Quicksand', sans-serif",
                textTransform: "none",
              }}
            >
              Chụp bộ mới
            </Button>

            <Button
              id="btn-save-final-photobooth"
              variant="contained"
              size="large"
              startIcon={isUploading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={isUploading}
              onClick={handleSave}
              sx={{
                borderRadius: "999px",
                px: 4,
                py: 1.1,
                background: "linear-gradient(135deg, #e91e8c, #c2185b)",
                color: "#ffffff",
                fontWeight: 700,
                fontFamily: "'Quicksand', sans-serif",
                textTransform: "none",
                boxShadow: "0 8px 24px rgba(236, 72, 153, 0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #d81b60, #ad1457)",
                  boxShadow: "0 10px 28px rgba(236, 72, 153, 0.45)",
                },
              }}
            >
              {isUploading ? "Đang lưu..." : "Lưu ảnh"}
            </Button>
          </Box>
        </Box>
      )}

      {/* Save Success Dialog */}
      <Dialog
        open={Boolean(savedUrl)}
        onClose={() => setSavedUrl(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(255, 253, 253, 0.75)',
              backdropFilter: 'blur(12px)',
            },
          },
          paper: {
            sx: {
              backgroundColor: '#ffffff !important',
              backgroundImage: 'none',
              opacity: 1,
              // borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 16px 40px rgba(236, 72, 153, 0.25)',
            },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, px: 1 }}>
          <Box sx={{ flex: 1 }} />                      {/* ← spacer trái */}
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1f2937", fontFamily: "'Quicksand', sans-serif", fontSize: "1.1rem" }}>
            Ảnh Photo Booth của bạn ✨
          </Typography>
          <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>  {/* ← spacer phải */}
            <IconButton size="small" onClick={() => setSavedUrl(null)} sx={{ color: "#9ca3af" }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
        <DialogContent
          sx={{
            p: 1.5,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {savedUrl && (
            <Box
              sx={{
                // borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                lineHeight: 0,
              }}
            >
              <img
                src={savedUrl}
                alt="Photo Booth Kết quả"
                style={{
                  display: "block",
                  maxHeight: "55vh",
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ display: "flex", flexDirection: "column", gap: 1.2, mt: 2, p: 0, px: 1, pb: 1 }}>
          <Button
            id="btn-dialog-download-photo"
            fullWidth
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPhoto}
            sx={{
              borderRadius: "999px",
              py: 1.1,
              whiteSpace: "nowrap",
              background: "linear-gradient(135deg, #e91e8c, #c2185b)",
              color: "#ffffff",
              fontWeight: 700,
              fontFamily: "'Quicksand', sans-serif",
              textTransform: "none",
              boxShadow: "0 6px 18px rgba(236, 72, 153, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #d81b60, #ad1457)",
              },
            }}
          >
            Tải ảnh về máy
          </Button>

          <Box sx={{ display: "flex", gap: 1.5, width: "100%" }}>
            <Button
              id="btn-dialog-new-session"
              fullWidth
              variant="outlined"
              startIcon={<CameraAltIcon />}
              onClick={handleResetAll}
              sx={{
                borderRadius: "999px",
                py: 1,
                whiteSpace: "nowrap",
                borderColor: "#ec4899",
                color: "#ec4899",
                fontWeight: 700,
                fontFamily: "'Quicksand', sans-serif",
                textTransform: "none",
                "&:hover": {
                  borderColor: "#db2777",
                  backgroundColor: "rgba(236, 72, 153, 0.08)",
                },
              }}
            >
              Chụp bộ mới
            </Button>

            <Button
              id="btn-dialog-profile-album"
              fullWidth
              variant="outlined"
              color="secondary"
              startIcon={<PhotoLibraryIcon />}
              onClick={() => {
                setSavedUrl(null);
                navigate("/profile");
              }}
              sx={{
                borderRadius: "999px",
                py: 1,
                whiteSpace: "nowrap",
                fontWeight: 700,
                fontFamily: "'Quicksand', sans-serif",
                textTransform: "none",
              }}
            >
              Bộ sưu tập
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

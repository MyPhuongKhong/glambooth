// FILE: src/components/GlamBot/GlamBotEffect.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
} from "@mui/material";
import {
  Play as PlayIcon,
  Pause as PauseIcon,
  Sparkles as SparklesIcon,
  Download as DownloadIcon,
  Film as FilmIcon,
  RefreshCw as RefreshCwIcon,
} from "lucide-react";
import toast from "react-hot-toast";

// Ease-in-out interpolation: smooth transitions across keyframe boundaries
function easeInOut(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
}

// Ease-in helper function
function easeIn(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped;
}

// 10-second cinematic GlamBot camera timeline transforms
function getTransformAtTime(timeInSeconds) {
  const t = Math.max(0, Math.min(10, timeInSeconds));

  let start = { scale: 1.0, panX: 0, panY: 0, rot: 0 };
  let end = { scale: 1.2, panX: 0.07, panY: -0.03, rot: 0.8 };
  let progress = 0;
  let scaleOscillation = 0;

  if (t < 2) {
    // Phase 0–2s: "Opening move" (duration 2s)
    // scale: 1.0 → 1.2, translateX: 0% → +7%, translateY: 0% → -3%, rotation: 0 → +0.8deg, easing: easeInOut
    start = { scale: 1.0, panX: 0, panY: 0, rot: 0 };
    end = { scale: 1.2, panX: 0.07, panY: -0.03, rot: 0.8 };
    const localProgress = Math.max(0, Math.min(1, (t - 0) / 2));
    progress = easeInOut(localProgress);
  } else if (t < 5) {
    // Phase 2–5s: "Slow drama hold" (3 seconds, duration 3s)
    // scale: 1.2 → 1.28, translateX: +7% → +11%, translateY: -3% → -5%, rotation: +0.8deg → +1.5deg, easing: linear
    start = { scale: 1.2, panX: 0.07, panY: -0.03, rot: 0.8 };
    end = { scale: 1.28, panX: 0.11, panY: -0.05, rot: 1.5 };
    const localProgress = Math.max(0, Math.min(1, (t - 2) / 3));
    progress = localProgress;
    scaleOscillation = Math.sin(localProgress * Math.PI * 2) * 0.015;
  } else if (t < 5.7) {
    // Phase 5–5.7s: "Fast sweep" (0.7 seconds, fast pan across, duration 0.7s)
    // scale: 1.28 → 1.3, translateX: +11% → -7%, translateY: -5% → +2%, rotation: +1.5deg → -1.2deg, easing: easeIn
    start = { scale: 1.28, panX: 0.11, panY: -0.05, rot: 1.5 };
    end = { scale: 1.3, panX: -0.07, panY: 0.02, rot: -1.2 };
    const localProgress = Math.max(0, Math.min(1, (t - 5) / 0.7));
    progress = easeIn(localProgress);
  } else {
    // Phase 5.7–10s: "Pull back" (duration 4.3s)
    // scale: 1.3 → 1.0, translateX: -7% → 0%, translateY: +2% → 0%, rotation: -1.2deg → 0deg, easing: easeInOut
    start = { scale: 1.3, panX: -0.07, panY: 0.02, rot: -1.2 };
    end = { scale: 1.0, panX: 0, panY: 0, rot: 0 };
    const localProgress = Math.max(0, Math.min(1, (t - 5.7) / 4.3));
    progress = easeInOut(localProgress);
  }

  const interpolatedScale = start.scale + (end.scale - start.scale) * progress;
  const scale = interpolatedScale + scaleOscillation;
  const panX = start.panX + (end.panX - start.panX) * progress;
  const panY = start.panY + (end.panY - start.panY) * progress;
  const rot = start.rot + (end.rot - start.rot) * progress;

  return { scale, panX, panY, rot };
}

function getSupportedExportMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}

export default function GlamBotEffect({ videoBlob, onExportComplete }) {
  if (!videoBlob) return null;

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const exportChunksRef = useRef([]);

  const [videoObjectUrl, setVideoObjectUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [supportsCaptureStream, setSupportsCaptureStream] = useState(true);

  // Check browser support for canvas.captureStream
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const supported = typeof canvas.captureStream === "function";
    setSupportsCaptureStream(supported);
  }, []);

  // Update object URL when videoBlob changes
  useEffect(() => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    setVideoObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoBlob]);

  // Frame rendering on canvas
  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    const currentTime = video.currentTime || 0;
    setCurrentPlaybackTime(currentTime);

    const { scale, panX, panY, rot } = getTransformAtTime(currentTime);

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply transformation from center
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-cx + panX * width, -cy + panY * height);

    // Draw video frame
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, width, height);
    }

    ctx.restore();
  }, []);

  // Animation render loop
  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    drawCurrentFrame();

    if (!video.paused && !video.ended) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    } else {
      setIsPlaying(false);
    }
  }, [drawCurrentFrame]);

  // When video loads metadata, draw initial frame
  const handleVideoLoadedData = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setTimeout(() => {
        drawCurrentFrame();
      }, 100);
    }
  };

  // Preview GlamBot Effect
  const handlePreviewEffect = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isExporting) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    video.currentTime = 0;
    try {
      await video.play();
      setIsPlaying(true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    } catch (err) {
      console.error("Preview play failed:", err);
      toast.error("Không thể phát video xem thử.");
    }
  };

  // Export GlamBot Video using canvas.captureStream
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) {
      toast.error("Chưa tải xong dữ liệu video.");
      return;
    }

    if (typeof canvas.captureStream !== "function") {
      toast.error("Trình duyệt không hỗ trợ xuất video từ Canvas. Vui lòng dùng Chrome hoặc Firefox!");
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(0);

      // Stop any running animations
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Rewind video
      video.currentTime = 0;
      video.muted = true; // Avoid feedback loops during canvas capture

      // Capture 30 FPS stream from canvas
      const canvasStream = canvas.captureStream(30);

      // Try capturing audio track if available from video element
      let combinedStream = canvasStream;
      try {
        if (typeof video.captureStream === "function") {
          const videoAudioStream = video.captureStream();
          const audioTracks = videoAudioStream.getAudioTracks();
          if (audioTracks.length > 0) {
            combinedStream = new MediaStream([
              ...canvasStream.getVideoTracks(),
              audioTracks[0],
            ]);
          }
        }
      } catch (e) {
        // Continue with canvas video stream if audio capture not permitted
        console.warn("Audio capture fallback:", e);
      }

      const mimeType = getSupportedExportMimeType() || "video/webm";
      const mediaRecorder = new MediaRecorder(
        combinedStream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = mediaRecorder;
      exportChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          exportChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || mimeType || "video/webm";
        const exportedBlob = new Blob(exportChunksRef.current, { type: finalMime });
        setIsExporting(false);
        setIsPlaying(false);
        setExportProgress(100);

        toast.success("Xuất hiệu ứng GlamBot thành công! ✨", {
          icon: "🎬",
        });

        if (typeof onExportComplete === "function") {
          onExportComplete(exportedBlob);
        }
      };

      // Progress interval tracker
      const duration = video.duration || 10;
      const progressTimer = setInterval(() => {
        if (video) {
          const p = Math.min(95, Math.round((video.currentTime / duration) * 100));
          setExportProgress(p);
        }
      }, 250);

      // When video ends, finish recording
      const handleVideoEnded = () => {
        clearInterval(progressTimer);
        video.removeEventListener("ended", handleVideoEnded);
        setTimeout(() => {
          if (mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
          }
        }, 300);
      };

      video.addEventListener("ended", handleVideoEnded);

      // Start recording and playback
      mediaRecorder.start(200);
      await video.play();
      setIsPlaying(true);

      const exportRenderLoop = () => {
        drawCurrentFrame();
        if (!video.paused && !video.ended) {
          animationFrameRef.current = requestAnimationFrame(exportRenderLoop);
        }
      };
      animationFrameRef.current = requestAnimationFrame(exportRenderLoop);
    } catch (err) {
      console.error("Export GlamBot failed:", err);
      toast.error("Lỗi khi xuất video GlamBot. Vui lòng thử lại!");
      setIsExporting(false);
      setIsPlaying(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <Paper
      id="glambot-effect-panel"
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: "540px",
        background: "rgba(255, 255, 255, 0.65)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "2px solid rgba(236, 72, 153, 0.3)",
        borderRadius: "24px",
        p: { xs: 2.5, sm: 3.5 },
        boxShadow: "0 12px 36px 0 rgba(236, 72, 153, 0.12)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        mt: 3,
        mb: 2,
      }}
    >
      {/* Hidden Video element for Canvas frame source */}
      <video
        ref={videoRef}
        src={videoObjectUrl || undefined}
        playsInline
        muted
        preload="auto"
        onLoadedData={handleVideoLoadedData}
        onEnded={() => setIsPlaying(false)}
        style={{ display: "none" }}
      />

      {/* Header Info */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SparklesIcon size={20} color="#ec4899" />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontFamily: "'Quicksand', sans-serif",
              color: "#1f2937",
              fontSize: { xs: "1.1rem", sm: "1.25rem" },
            }}
          >
            Hiệu ứng GlamBot Hollywood
          </Typography>
        </Box>
        <Chip
          label="Cinematic 9:16"
          size="small"
          sx={{
            backgroundColor: "rgba(236, 72, 153, 0.12)",
            color: "#ec4899",
            fontWeight: 700,
            borderRadius: "100px",
          }}
        />
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: "#6b7280",
          fontSize: "0.875rem",
          mb: 2.5,
          fontFamily: "'Quicksand', sans-serif",
          lineHeight: 1.5,
        }}
      >
        Tự động mô phỏng máy quay thảm đỏ: zoom slow-motion, lia góc nghiêng và kéo ngược kịch tính.
      </Typography>

      {!supportsCaptureStream && (
        <Alert severity="warning" sx={{ width: "100%", mb: 2, borderRadius: "14px" }}>
          Trình duyệt không hỗ trợ xuất video. Vui lòng dùng Chrome hoặc Firefox.
        </Alert>
      )}

      {/* Canvas Live Preview */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: "240px",
          height: "426px", // 9:16 ratio for 240x426
          borderRadius: "20px",
          overflow: "hidden",
          backgroundColor: "#000000",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
          border: "2px solid rgba(255, 255, 255, 0.8)",
          mb: 2.5,
        }}
      >
        <canvas
          id="glambot-cinematic-canvas"
          ref={canvasRef}
          width={405}
          height={720}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        {/* Live Timeline & Status Badge */}
        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(6px)",
            color: "#ffffff",
            borderRadius: "100px",
            px: 1.2,
            py: 0.3,
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          {isPlaying ? (
            <Box component="span" sx={{ color: "#ec4899" }}>
              ● Đang chạy ({currentPlaybackTime.toFixed(1)}s)
            </Box>
          ) : (
            "Preview Mode"
          )}
        </Box>

        {isExporting && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
              zIndex: 10,
            }}
          >
            <CircularProgress size={44} sx={{ color: "#ec4899", mb: 2 }} />
            <Typography sx={{ color: "#ffffff", fontWeight: 700, fontSize: "0.95rem" }}>
              Đang xuất video... ({exportProgress}%)
            </Typography>
            <Box sx={{ width: "80%", mt: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={exportProgress}
                sx={{
                  height: 6,
                  borderRadius: "100px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  "& .MuiLinearProgress-bar": { backgroundColor: "#ec4899" },
                }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Buttons */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          justifyContent: "center",
        }}
      >
        <Button
          id="btn-preview-glambot-effect"
          variant="outlined"
          fullWidth
          disabled={isExporting}
          onClick={handlePreviewEffect}
          startIcon={isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          sx={{
            py: 1.2,
            px: 2.5,
            borderRadius: "100px",
            borderColor: "#ec4899",
            color: "#ec4899",
            fontWeight: 700,
            fontFamily: "'Quicksand', sans-serif",
            textTransform: "none",
            fontSize: "0.9rem",
            "&:hover": {
              borderColor: "#db2777",
              backgroundColor: "rgba(236, 72, 153, 0.08)",
            },
          }}
        >
          {isPlaying ? "Tạm dừng xem thử" : "▶ Xem thử hiệu ứng (Preview)"}
        </Button>

        <Button
          id="btn-export-glambot-video"
          variant="contained"
          fullWidth
          disabled={isExporting || !supportsCaptureStream}
          onClick={handleExportVideo}
          startIcon={
            isExporting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SparklesIcon size={18} />
            )
          }
          sx={{
            py: 1.2,
            px: 2.5,
            borderRadius: "100px",
            backgroundColor: "#ec4899",
            color: "#ffffff",
            fontWeight: 700,
            fontFamily: "'Quicksand', sans-serif",
            textTransform: "none",
            fontSize: "0.9rem",
            boxShadow: "0 6px 18px rgba(236, 72, 153, 0.35)",
            "&:hover": {
              backgroundColor: "#db2777",
              boxShadow: "0 8px 22px rgba(236, 72, 153, 0.45)",
            },
          }}
        >
          {isExporting ? "Đang xuất video..." : "⬇ Xuất GlamBot Video"}
        </Button>
      </Box>
    </Paper>
  );
}

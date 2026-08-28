// FILE: src/components/GlamBot/GlamBotEffect.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  IconButton,
  Button,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import {
  Sparkles as SparklesIcon,
  RotateCcw as RotateCcwIcon,
  Upload as UploadIcon,
  Film as FilmIcon,
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

// 6-second cinematic GlamBot camera timeline transforms (based on source timeline 0..6s)
function getTransformAtTime(timeInSeconds) {
  const t = Math.max(0, Math.min(6, timeInSeconds));

  let start = { scale: 1.0, panX: 0, panY: 0, rot: 0 };
  let end = { scale: 1.2, panX: 0.07, panY: -0.03, rot: 0.8 };
  let progress = 0;
  let scaleOscillation = 0;

  if (t < 1.5) {
    // Phase 0–1.5s: "Opening move" (duration 1.5s)
    start = { scale: 1.0, panX: 0, panY: 0, rot: 0 };
    end = { scale: 1.2, panX: 0.07, panY: -0.03, rot: 0.8 };
    const localProgress = Math.max(0, Math.min(1, (t - 0) / 1.5));
    progress = easeInOut(localProgress);
  } else if (t < 4) {
    // Phase 1.5–4s: "Slow drama hold" (2.5s duration) - matches slow-mo peak!
    start = { scale: 1.2, panX: 0.07, panY: -0.03, rot: 0.8 };
    end = { scale: 1.28, panX: 0.11, panY: -0.05, rot: 1.5 };
    const localProgress = Math.max(0, Math.min(1, (t - 1.5) / 2.5));
    progress = localProgress;
    scaleOscillation = Math.sin(localProgress * Math.PI * 2) * 0.015;
  } else if (t < 4.7) {
    // Phase 4–4.7s: "Fast sweep" (0.7s duration)
    start = { scale: 1.28, panX: 0.11, panY: -0.05, rot: 1.5 };
    end = { scale: 1.3, panX: -0.07, panY: 0.02, rot: -1.2 };
    const localProgress = Math.max(0, Math.min(1, (t - 4) / 0.7));
    progress = easeIn(localProgress);
  } else {
    // Phase 4.7–6s: "Pull back" (duration 1.3s)
    start = { scale: 1.3, panX: -0.07, panY: 0.02, rot: -1.2 };
    end = { scale: 1.0, panX: 0, panY: 0, rot: 0 };
    const localProgress = Math.max(0, Math.min(1, (t - 4.7) / 1.3));
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

const GlamBotEffect = forwardRef(function GlamBotEffect(
  {
    videoBlob,
    onBack,
    onSaveOriginal,
    onSaveGlamBot,
    onExportComplete,
    isSaving = false,
    savingType = null,
  },
  ref
) {
  if (!videoBlob) return null;

  // Video and Canvas Refs
  const originalVideoRef = useRef(null);
  const glambotVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const exportChunksRef = useRef([]);

  // URL state
  const [videoObjectUrl, setVideoObjectUrl] = useState("");

  // Independent Playback States (FIX 1)
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingGlambot, setIsPlayingGlambot] = useState(false);

  // Export & Time tracking
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [glambotCurrentTime, setGlambotCurrentTime] = useState(0);
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

  // Adjust playbackRate dynamically based on currentTime for GlamBot slow-mo:
  // - When currentTime < 2s  → 1.0x
  // - When 2s <= currentTime < 4s → 0.5x (slow-mo middle)
  // - When currentTime >= 4s → 1.0x
  const updateGlamBotPlaybackRate = useCallback((time) => {
    const video = glambotVideoRef.current;
    if (!video) return;

    let targetRate = 1.0;
    if (time >= 2.0 && time < 4.0) {
      targetRate = 0.5;
    } else {
      targetRate = 1.0;
    }

    if (video.playbackRate !== targetRate) {
      video.playbackRate = targetRate;
    }
  }, []);

  // Frame rendering on canvas using current video position & GlamBot transforms
  const renderCurrentCanvasFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = glambotVideoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    const t = video.currentTime || 0;
    setGlambotCurrentTime(t);
    updateGlamBotPlaybackRate(t);

    const { scale, panX, panY, rot } = getTransformAtTime(t);

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply transformation from center
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(panX * width, panY * height);

    const OVERDRAW = 1.3; // draw 30% larger to eliminate edge borders

    if (video.readyState >= 2) {
      ctx.drawImage(
        video,
        -(width * OVERDRAW) / 2,
        -(height * OVERDRAW) / 2,
        width * OVERDRAW,
        height * OVERDRAW
      );
    }

    ctx.restore();
  }, [updateGlamBotPlaybackRate]);

  // RAF loop for GlamBot canvas
  const startGlamBotRafLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const loop = () => {
      const video = glambotVideoRef.current;
      if (!video) return;

      renderCurrentCanvasFrame();

      if (!video.paused && !video.ended) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [renderCurrentCanvasFrame]);

  // Original Video Play/Pause toggle
  const toggleOriginalPlay = useCallback(() => {
    const video = originalVideoRef.current;
    if (!video) return;

    if (isPlayingOriginal) {
      video.pause();
      setIsPlayingOriginal(false);
    } else {
      if (video.ended || video.currentTime >= (video.duration || 6)) {
        video.currentTime = 0;
      }
      video
        .play()
        .then(() => setIsPlayingOriginal(true))
        .catch((err) => console.warn("Original video play error:", err));
    }
  }, [isPlayingOriginal]);

  // GlamBot Canvas Video Play/Pause toggle
  const toggleGlambotPlay = useCallback(() => {
    const video = glambotVideoRef.current;
    if (!video) return;

    if (isPlayingGlambot) {
      video.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsPlayingGlambot(false);
    } else {
      if (video.ended || video.currentTime >= (video.duration || 6)) {
        video.currentTime = 0;
      }
      updateGlamBotPlaybackRate(video.currentTime);
      video
        .play()
        .then(() => {
          setIsPlayingGlambot(true);
          startGlamBotRafLoop();
        })
        .catch((err) => console.warn("GlamBot video play error:", err));
    }
  }, [isPlayingGlambot, updateGlamBotPlaybackRate, startGlamBotRafLoop]);

  // Handle GlamBot video events
  const handleGlamBotTimeUpdate = () => {
    if (glambotVideoRef.current) {
      updateGlamBotPlaybackRate(glambotVideoRef.current.currentTime);
    }
  };

  const handleGlamBotEnded = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlayingGlambot(false);
    if (glambotVideoRef.current) {
      glambotVideoRef.current.playbackRate = 1.0;
    }
  };

  // Initial load: render 1st frame to canvas so it's not black
  const handleGlamBotLoadedData = () => {
    const video = glambotVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.playbackRate = 1.0;
      setTimeout(() => {
        renderCurrentCanvasFrame();
      }, 60);
    }
  };

  // Export GlamBot Video via Canvas CaptureStream + MediaRecorder
  const handleExportVideo = useCallback(async () => {
    const canvas = canvasRef.current;
    const video = glambotVideoRef.current;

    if (!canvas || !video) {
      toast.error("Chưa tải xong dữ liệu video.");
      return;
    }

    if (typeof canvas.captureStream !== "function") {
      toast.error(
        "Trình duyệt không hỗ trợ xuất video từ Canvas. Vui lòng dùng Chrome hoặc Firefox!"
      );
      return;
    }

    try {
      // Pause active playback
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      video.pause();
      setIsPlayingGlambot(false);

      setIsExporting(true);
      setExportProgress(0);

      video.currentTime = 0;
      video.muted = true;
      updateGlamBotPlaybackRate(0);

      const canvasStream = canvas.captureStream(30);
      const mimeType = getSupportedExportMimeType() || "video/webm";
      const mediaRecorder = new MediaRecorder(
        canvasStream,
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
        setExportProgress(100);

        toast.success("Xuất hiệu ứng GlamBot thành công! ✨", {
          icon: "🎬",
        });

        if (typeof onExportComplete === "function") {
          onExportComplete(exportedBlob);
        }
      };

      mediaRecorder.start(200);

      const totalDuration = video.duration || 6.0;

      const exportLoop = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
          return;
        }

        renderCurrentCanvasFrame();

        const progressPercent = Math.min(
          98,
          Math.round(((video.currentTime || 0) / totalDuration) * 100)
        );
        setExportProgress(progressPercent);

        if (!video.ended && !video.paused) {
          animationFrameRef.current = requestAnimationFrame(exportLoop);
        } else {
          setExportProgress(100);
          setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
              mediaRecorderRef.current.stop();
            }
          }, 300);
        }
      };

      video.onended = () => {
        setExportProgress(100);
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
        }, 300);
      };

      await video.play();
      animationFrameRef.current = requestAnimationFrame(exportLoop);
    } catch (err) {
      console.error("Export GlamBot failed:", err);
      toast.error("Lỗi khi xuất video GlamBot. Vui lòng thử lại!");
      setIsExporting(false);
    }
  }, [renderCurrentCanvasFrame, updateGlamBotPlaybackRate, onExportComplete]);

  // Imperative handle
  useImperativeHandle(
    ref,
    () => ({
      exportVideo: () => handleExportVideo(),
      playOriginal: () => {
        if (originalVideoRef.current) {
          originalVideoRef.current.play();
          setIsPlayingOriginal(true);
        }
      },
      pauseOriginal: () => {
        if (originalVideoRef.current) {
          originalVideoRef.current.pause();
          setIsPlayingOriginal(false);
        }
      },
      playGlamBot: () => {
        const video = glambotVideoRef.current;
        if (video) {
          updateGlamBotPlaybackRate(video.currentTime);
          video.play().then(() => {
            setIsPlayingGlambot(true);
            startGlamBotRafLoop();
          });
        }
      },
      pauseGlamBot: () => {
        const video = glambotVideoRef.current;
        if (video) {
          video.pause();
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          setIsPlayingGlambot(false);
        }
      },
      isPlayingOriginal,
      isPlayingGlambot,
      isExporting,
    }),
    [
      handleExportVideo,
      updateGlamBotPlaybackRate,
      startGlamBotRafLoop,
      isPlayingOriginal,
      isPlayingGlambot,
      isExporting,
    ]
  );

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
    <Box
      id="glambot-preview-fullscreen-container"
      sx={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        px: { xs: 2, md: 3 },
        py: 2,
        boxSizing: "border-box",
      }}
    >
      {/* Hidden GlamBot Video Element for frame rendering */}
      <video
        ref={glambotVideoRef}
        src={videoObjectUrl || undefined}
        playsInline
        muted
        preload="auto"
        onTimeUpdate={handleGlamBotTimeUpdate}
        onEnded={handleGlamBotEnded}
        onLoadedData={handleGlamBotLoadedData}
        style={{ display: "none" }}
      />

      {/* TOP: Two cards side by side — flex: 1, min-height 0 (FIX 3) */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 2, md: 3 },
          flex: 1,
          minHeight: 0,
          overflow: { xs: "auto", md: "hidden" },
        }}
      >
        {/* LEFT CARD — Original Video */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            minHeight: 0,
            height: { xs: "50%", md: "auto" },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: { xs: 1.5, md: 2 },
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(236, 72, 153, 0.25)",
            boxShadow: "0 8px 30px rgba(236, 72, 153, 0.08)",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
              px: 0.5,
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FilmIcon size={18} color="#ec4899" />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontFamily: "'Quicksand', sans-serif",
                  color: "#1f2937",
                  fontSize: { xs: "0.95rem", sm: "1.05rem" },
                }}
              >
                Video gốc
              </Typography>
            </Box>
            <Chip
              label="Original 6s"
              size="small"
              sx={{
                backgroundColor: "rgba(107, 114, 128, 0.12)",
                color: "#4b5563",
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 22,
                borderRadius: "100px",
              }}
            />
          </Box>

          {/* Video Container — maxHeight: 100% to shrink without overflow */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <video
              ref={originalVideoRef}
              src={videoObjectUrl || undefined}
              playsInline
              onEnded={() => setIsPlayingOriginal(false)}
              style={{
                maxHeight: "100%",
                maxWidth: "100%",
                aspectRatio: "9/16",
                borderRadius: "14px",
                objectFit: "cover",
                display: "block",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
                backgroundColor: "#000000",
              }}
            />
          </Box>

          {/* Dedicated Play/Pause Button BELOW the panel (FIX 1) */}
          <IconButton
            id="btn-play-original"
            onClick={toggleOriginalPlay}
            aria-label={isPlayingOriginal ? "Tạm dừng video gốc" : "Phát video gốc"}
            sx={{
              mt: 1,
              flexShrink: 0,
              width: 44,
              height: 44,
              border: "1.5px solid #ec4899",
              color: "#ec4899",
              backgroundColor: "rgba(236, 72, 153, 0.06)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: "rgba(236, 72, 153, 0.16)",
                borderColor: "#db2777",
                color: "#db2777",
                transform: "scale(1.05)",
              },
            }}
          >
            {isPlayingOriginal ? (
              <PauseIcon sx={{ fontSize: 24 }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: 24, ml: 0.2 }} />
            )}
          </IconButton>
        </Paper>

        {/* RIGHT CARD — GlamBot Effect Canvas */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            minHeight: 0,
            height: { xs: "50%", md: "auto" },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: { xs: 1.5, md: 2 },
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(236, 72, 153, 0.25)",
            boxShadow: "0 8px 30px rgba(236, 72, 153, 0.08)",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
              px: 0.5,
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SparklesIcon size={18} color="#ec4899" />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontFamily: "'Quicksand', sans-serif",
                  color: "#1f2937",
                  fontSize: { xs: "0.95rem", sm: "1.05rem" },
                }}
              >
                GlamBot Effect
              </Typography>
            </Box>
            <Chip
              label="Slow-Mo 0.5x"
              size="small"
              sx={{
                backgroundColor: "rgba(236, 72, 153, 0.12)",
                color: "#ec4899",
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 22,
                borderRadius: "100px",
              }}
            />
          </Box>

          {/* Canvas Container — maxHeight: 100% to shrink without overflow */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <canvas
              id="glambot-cinematic-canvas"
              ref={canvasRef}
              width={405}
              height={720}
              style={{
                maxHeight: "100%",
                maxWidth: "100%",
                aspectRatio: "9/16",
                borderRadius: "14px",
                objectFit: "cover",
                display: "block",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
                backgroundColor: "#000000",
              }}
            />

            {/* Time status badge on canvas */}
            <Box
              sx={{
                position: "absolute",
                top: 8,
                left: 8,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(6px)",
                color: "#ffffff",
                borderRadius: "100px",
                px: 1.1,
                py: 0.2,
                fontSize: "0.7rem",
                fontWeight: 700,
                zIndex: 12,
                pointerEvents: "none",
              }}
            >
              {isPlayingGlambot ? (
                <Box component="span" sx={{ color: "#ec4899" }}>
                  ● Đang chạy ({glambotCurrentTime.toFixed(1)}s)
                </Box>
              ) : (
                "GlamBot 6s"
              )}
            </Box>

            {/* Exporting Progress Overlay */}
            {isExporting && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.75)",
                  backdropFilter: "blur(4px)",
                  borderRadius: "14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 2,
                  zIndex: 20,
                }}
              >
                <CircularProgress size={38} sx={{ color: "#ec4899", mb: 1.5 }} />
                <Typography sx={{ color: "#ffffff", fontWeight: 700, fontSize: "0.85rem" }}>
                  Đang xuất video... ({exportProgress}%)
                </Typography>
                <Box sx={{ width: "80%", mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={exportProgress}
                    sx={{
                      height: 5,
                      borderRadius: "100px",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      "& .MuiLinearProgress-bar": { backgroundColor: "#ec4899" },
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>

          {/* Dedicated Play/Pause Button BELOW the panel (FIX 1) */}
          <IconButton
            id="btn-play-glambot"
            disabled={isExporting}
            onClick={toggleGlambotPlay}
            aria-label={isPlayingGlambot ? "Tạm dừng GlamBot" : "Phát GlamBot"}
            sx={{
              mt: 1,
              flexShrink: 0,
              width: 44,
              height: 44,
              border: "1.5px solid #ec4899",
              color: "#ec4899",
              backgroundColor: "rgba(236, 72, 153, 0.06)",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: "rgba(236, 72, 153, 0.16)",
                borderColor: "#db2777",
                color: "#db2777",
                transform: "scale(1.05)",
              },
              "&.Mui-disabled": {
                borderColor: "rgba(236, 72, 153, 0.3)",
                color: "rgba(236, 72, 153, 0.3)",
              },
            }}
          >
            {isPlayingGlambot ? (
              <PauseIcon sx={{ fontSize: 24 }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: 24, ml: 0.2 }} />
            )}
          </IconButton>
        </Paper>
      </Box>

      {/* BOTTOM: Action Buttons — fixed height, does NOT push content (FIX 2 & FIX 3) */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: { xs: 1.5, sm: 2.5 },
          pt: 2,
          flexShrink: 0,
        }}
      >
        {/* Button 1: "Quay lại" */}
        <Button
          id="btn-re-record"
          variant="outlined"
          color="secondary"
          disabled={isSaving || isExporting}
          onClick={onBack}
          startIcon={<RotateCcwIcon size={18} />}
          sx={{
            py: 1.1,
            px: { xs: 2, sm: 3 },
            borderRadius: "100px",
            fontWeight: 700,
            fontSize: "0.9rem",
            fontFamily: "'Quicksand', sans-serif",
            textTransform: "none",
          }}
        >
          Quay lại
        </Button>

        {/* Button 2: "Lưu video gốc" */}
        <Button
          id="btn-save-original-video"
          variant="outlined"
          color="primary"
          disabled={isSaving || isExporting}
          onClick={onSaveOriginal}
          startIcon={
            isSaving && savingType === "original" ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <UploadIcon size={18} />
            )
          }
          sx={{
            py: 1.1,
            px: { xs: 2, sm: 3 },
            borderRadius: "100px",
            borderColor: "#ec4899",
            color: "#ec4899",
            fontWeight: 700,
            fontSize: "0.9rem",
            fontFamily: "'Quicksand', sans-serif",
            textTransform: "none",
            "&:hover": {
              borderColor: "#db2777",
              backgroundColor: "rgba(236, 72, 153, 0.08)",
            },
          }}
        >
          {isSaving && savingType === "original"
            ? "Đang lưu video gốc..."
            : "Lưu video gốc"}
        </Button>

        {/* Button 3: "Lưu Video GlamBot" */}
        <Button
          id="btn-save-glambot-video"
          variant="contained"
          color="primary"
          disabled={isSaving || isExporting}
          onClick={() => {
            if (onSaveGlamBot) {
              onSaveGlamBot();
            } else {
              handleExportVideo();
            }
          }}
          startIcon={
            (isSaving && savingType === "glambot") || isExporting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SparklesIcon size={18} />
            )
          }
          sx={{
            py: 1.1,
            px: { xs: 2.5, sm: 3.5 },
            borderRadius: "100px",
            backgroundColor: "#ec4899",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.9rem",
            fontFamily: "'Quicksand', sans-serif",
            textTransform: "none",
            boxShadow: "0 6px 20px rgba(236, 72, 153, 0.35)",
            "&:hover": {
              backgroundColor: "#db2777",
              boxShadow: "0 8px 25px rgba(236, 72, 153, 0.45)",
            },
          }}
        >
          {(isSaving && savingType === "glambot") || isExporting
            ? "Đang xuất & lưu GlamBot..."
            : "Lưu Video GlamBot"}
        </Button>
      </Box>
    </Box>
  );
});

export default GlamBotEffect;

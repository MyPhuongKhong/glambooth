// FILE: src/pages/GlamBot/GlamBotPage.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Chip,
  LinearProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VideocamIcon from "@mui/icons-material/Videocam";
import StopIcon from "@mui/icons-material/Stop";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ReplayIcon from "@mui/icons-material/Replay";
import ErrorIcon from "@mui/icons-material/Error";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { useAuth } from "../../contexts/AuthContext";
import { uploadToCloudinary } from "../../cloudinary/upload";
import { db } from "../../firebase/config";
import GlamBotEffect from "../../components/GlamBot/GlamBotEffect";

// Xác định định dạng video tương thích trên trình duyệt
function getSupportedMimeType() {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export default function GlamBotPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Camera & Recorder References
  const videoLiveRef = useRef(null);
  const glamBotRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // States
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Video recording state (single recording)
  const [recordedBlob, setRecordedBlob] = useState(null);

  // Trạng thái lưu / upload
  const [isSaving, setIsSaving] = useState(false);
  const [savingType, setSavingType] = useState(null); // 'original' | 'glambot'

  // Object URL cho recordedBlob
  const recordedVideoUrl = useMemo(() => {
    if (!recordedBlob) return null;
    return URL.createObjectURL(recordedBlob);
  }, [recordedBlob]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [recordedVideoUrl]);

  // Khởi tạo Camera (startCamera async function)
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 720 },
          height: { ideal: 1280 },
          facingMode: "user",
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = stream;
        videoLiveRef.current.play().catch((err) => console.warn("Video play error:", err));
      }
      setCameraReady(true);
    } catch (error) {
      console.error("Camera access error:", error);
      let message = "Không thể truy cập camera hoặc micro.";
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        message = "Vui lòng cấp quyền truy cập Camera & Micro trên trình duyệt để quay video!";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        message = "Không tìm thấy thiết bị Camera phù hợp.";
      }
      setCameraError(message);
      toast.error(message);
    }
  };

  // 1. Khởi chạy Camera khi mount
  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Gắn stream khi quay lại màn hình camera (khi videoLiveRef được mount lại)
  useEffect(() => {
    if (!recordedBlob && streamRef.current && videoLiveRef.current) {
      if (videoLiveRef.current.srcObject !== streamRef.current) {
        videoLiveRef.current.srcObject = streamRef.current;
        videoLiveRef.current.play().catch((err) => console.warn("Video live play error:", err));
      }
    }
  }, [recordedBlob, cameraReady]);

  // Xử lý Quay lại (handleGoBack: Reset state & Khởi động lại Camera)
  const handleGoBack = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // Reset all state
    setRecordedBlob(null);
    setCountdown(null);
    setIsRecording(false);
    setRecordingSeconds(0);

    // Restart camera
    startCamera();
  };

  // Xử lý đếm ngược 3...2...1 trước khi bắt đầu quay
  const handleStartCountdown = () => {
    if (!cameraReady || !streamRef.current) {
      toast.error("Camera chưa sẵn sàng!");
      return;
    }

    setCountdown(3);

    let count = 3;
    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        startRecording();
      }
    }, 1000);
  };

  // Bắt đầu quay video (6 giây)
  const startRecording = () => {
    try {
      recordedChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = mediaRecorder.mimeType || "video/webm";
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        setRecordedBlob(blob);

        toast.success("Đã quay xong video 6s! ✨", {
          icon: "🎬",
        });
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Bộ đếm thời gian 6 giây
      let seconds = 0;
      recordingTimerRef.current = setInterval(() => {
        seconds += 1;
        setRecordingSeconds(seconds);
        if (seconds >= 6) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error("Recording start error:", err);
      toast.error("Không thể khởi động bộ quay video!");
      setIsRecording(false);
    }
  };

  // Dừng quay video
  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Helper hiển thị thông báo Toast thành công
  const showSavedSuccessToast = () => {
    toast.custom(
      (t) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(16px)",
            p: 1.5,
            px: 2.5,
            borderRadius: "100px",
            border: "1px solid rgba(236, 72, 153, 0.3)",
            boxShadow: "0 12px 30px rgba(236, 72, 153, 0.25)",
          }}
        >
          <Typography sx={{ fontWeight: 700, color: "#1f2937", fontSize: "0.95rem" }}>
            Video saved! 🎉
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              toast.dismiss(t.id);
              navigate("/profile");
            }}
            sx={{
              borderRadius: "100px",
              backgroundColor: "#ec4899",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.8rem",
              textTransform: "none",
              py: 0.5,
              px: 1.8,
              "&:hover": { backgroundColor: "#db2777" },
            }}
          >
            View in Album
          </Button>
        </Box>
      ),
      { duration: 5000 }
    );
  };

  // 1. Lưu video gốc (chưa qua hiệu ứng GlamBot)
  const handleSaveOriginalVideo = async () => {
    if (!recordedBlob) {
      toast.error("Vui lòng quay video trước khi lưu!");
      return;
    }

    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để lưu video vào tài khoản!");
      navigate("/login");
      return;
    }

    setIsSaving(true);
    setSavingType("original");

    try {
      const mime = recordedBlob.type || "video/webm";
      const extension = mime.includes("mp4") ? "mp4" : "webm";
      const file = new File(
        [recordedBlob],
        `glambot_raw_${currentUser.uid}_${Date.now()}.${extension}`,
        { type: mime }
      );

      const uploadResult = await uploadToCloudinary(file, "glambot");

      await addDoc(collection(db, "videos"), {
        userId: currentUser.uid,
        url: uploadResult.url,
        publicId: uploadResult.publicId || "",
        type: "glambot",
        isOriginal: true,
        createdAt: serverTimestamp(),
      });

      showSavedSuccessToast();
    } catch (error) {
      console.error("Save original video error:", error);
      toast.error("Lưu video gốc thất bại. Vui lòng thử lại!");
    } finally {
      setIsSaving(false);
      setSavingType(null);
    }
  };

  // 2. Kích hoạt xuất & Lưu video sau khi xuất hiệu ứng GlamBot Cinematic
  const handleTriggerSaveGlamBot = () => {
    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để lưu video!");
      navigate("/login");
      return;
    }

    if (glamBotRef.current) {
      setIsSaving(true);
      setSavingType("glambot");
      glamBotRef.current.exportVideo();
    }
  };

  const handleGlamBotExportComplete = async (exportedBlob) => {
    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để lưu video!");
      navigate("/login");
      setIsSaving(false);
      setSavingType(null);
      return;
    }

    try {
      const extension = exportedBlob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File(
        [exportedBlob],
        `glambot_cinematic_${currentUser.uid}_${Date.now()}.${extension}`,
        { type: exportedBlob.type || "video/webm" }
      );

      const uploadResult = await uploadToCloudinary(file, "glambot");

      await addDoc(collection(db, "videos"), {
        userId: currentUser.uid,
        url: uploadResult.url,
        publicId: uploadResult.publicId || "",
        type: "glambot",
        effect: "cinematic_slowmo_transform",
        createdAt: serverTimestamp(),
      });

      showSavedSuccessToast();
    } catch (error) {
      console.error("Save GlamBot video error:", error);
      toast.error("Lưu GlamBot video thất bại. Vui lòng thử lại!");
    } finally {
      setIsSaving(false);
      setSavingType(null);
    }
  };

  // Nếu người dùng chưa đăng nhập
  if (!currentUser) {
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
              background: "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.08)",
            }}
          >
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ec4899",
                boxShadow: "0 10px 20px rgba(236, 72, 153, 0.15)",
                mb: 2.5,
              }}
            >
              <ErrorIcon sx={{ fontSize: 38 }} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                fontFamily: "'Quicksand', sans-serif",
                color: "#1f2937",
                mb: 1.5,
              }}
            >
              Yêu cầu đăng nhập
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "#6b7280", mb: 3.5, fontFamily: "'Quicksand', sans-serif" }}
            >
              Vui lòng đăng nhập để trải nghiệm GlamBot Video và lưu các thước phim thảm đỏ của bạn!
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
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
              Đăng nhập ngay
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      id="glambot-page-container"
      sx={{
        minHeight: "calc(100vh - 110px)",
        py: { xs: 2, sm: 4 },
        px: { xs: 1.5, sm: 3 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Header điều hướng & Tiêu đề */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2.5,
          }}
        >
          <Button
            component={RouterLink}
            to="/"
            variant="text"
            startIcon={<ArrowBackIcon />}
            sx={{
              color: "#6b7280",
              fontWeight: 600,
              borderRadius: "100px",
              fontFamily: "'Quicksand', sans-serif",
              "&:hover": { color: "#ec4899", backgroundColor: "rgba(236, 72, 153, 0.08)" },
            }}
          >
            Trang chủ
          </Button>

          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: "16px !important", color: "#ec4899" }} />}
            label="GlamBot 6s Slow-Mo"
            sx={{
              backgroundColor: "rgba(236, 72, 153, 0.12)",
              color: "#ec4899",
              fontWeight: 700,
              fontFamily: "'Quicksand', sans-serif",
              borderRadius: "100px",
              px: 1,
            }}
          />
        </Box>

        {/* FLOW 1: Camera Preview & Recording (Khi chưa có recordedBlob) */}
        {!recordedBlob && (
          <>
            {/* Khung Camera Dọc 9:16 Max Height 480px Centered */}
            <Paper
              id="glambot-camera-card"
              elevation={0}
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: "270px", // 9:16 tương ứng 270x480
                height: "480px",
                maxHeight: "480px",
                aspectRatio: "9/16",
                borderRadius: "28px",
                overflow: "hidden",
                backgroundColor: "#000000",
                border: "3px solid rgba(255, 255, 255, 0.8)",
                boxShadow: isRecording
                  ? "0 0 35px rgba(236, 72, 153, 0.6), 0 12px 40px rgba(0, 0, 0, 0.3)"
                  : "0 16px 45px rgba(236, 72, 153, 0.15), 0 10px 30px rgba(0, 0, 0, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
                transition: "all 0.3s ease",
              }}
            >
              {cameraError ? (
                <Box sx={{ p: 3, textAlign: "center", color: "#ffffff" }}>
                  <ErrorIcon sx={{ fontSize: 40, color: "#f43f5e", mb: 1.5 }} />
                  <Typography variant="body2" sx={{ mb: 2, fontSize: "0.85rem" }}>
                    {cameraError}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={startCamera}
                    startIcon={<ReplayIcon />}
                    sx={{
                      backgroundColor: "#ec4899",
                      borderRadius: "100px",
                      fontSize: "0.8rem",
                      "&:hover": { backgroundColor: "#db2777" },
                    }}
                  >
                    Thử lại
                  </Button>
                </Box>
              ) : (
                <>
                  {/* Video Live Stream từ Camera */}
                  <video
                    ref={videoLiveRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)", // Mirror effect cho camera trước
                    }}
                  />

                  {/* Tag Trạng thái quay trên góc camera */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      right: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      zIndex: 10,
                    }}
                  >
                    {isRecording ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          backgroundColor: "rgba(220, 38, 38, 0.85)",
                          color: "#ffffff",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "100px",
                          backdropFilter: "blur(8px)",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: "#ffffff",
                            animation: "pulse 1s infinite",
                            "@keyframes pulse": {
                              "0%": { opacity: 1 },
                              "50%": { opacity: 0.3 },
                              "100%": { opacity: 1 },
                            },
                          }}
                        />
                        REC 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:06
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          backgroundColor: "rgba(0, 0, 0, 0.45)",
                          color: "#ffffff",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: "100px",
                          backdropFilter: "blur(8px)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        GlamBot 9:16
                      </Box>
                    )}

                    <Box
                      sx={{
                        backgroundColor: "rgba(0, 0, 0, 0.45)",
                        color: "#ffffff",
                        px: 1.2,
                        py: 0.5,
                        borderRadius: "100px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      HD 1080p
                    </Box>
                  </Box>

                  {/* Progress bar thời gian quay 6s */}
                  {isRecording && (
                    <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(recordingSeconds / 6) * 100}
                        sx={{
                          height: 5,
                          backgroundColor: "rgba(255,255,255,0.2)",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: "#ec4899",
                          },
                        }}
                      />
                    </Box>
                  )}

                  {/* Overlay Đếm ngược 3...2...1 */}
                  <AnimatePresence>
                    {countdown !== null && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          backgroundColor: "rgba(0, 0, 0, 0.55)",
                          backdropFilter: "blur(4px)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 20,
                        }}
                      >
                        <motion.div
                          key={countdown}
                          initial={{ scale: 0.3, opacity: 0 }}
                          animate={{ scale: 1.2, opacity: 1 }}
                          exit={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        >
                          <Typography
                            sx={{
                              fontSize: "80px",
                              fontWeight: 900,
                              color: "#ffffff",
                              fontFamily: "'Quicksand', sans-serif",
                              textShadow: "0 0 30px rgba(236, 72, 153, 0.9)",
                              lineHeight: 1,
                            }}
                          >
                            {countdown}
                          </Typography>
                        </motion.div>
                        <Typography
                          sx={{
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            mt: 2,
                            fontFamily: "'Quicksand', sans-serif",
                          }}
                        >
                          Chuẩn bị tạo dáng...
                        </Typography>
                      </Box>
                    )}
                  </AnimatePresence>
                </>
              )}
            </Paper>

            {/* Nút Điều khiển Camera (Bắt đầu quay / Dừng quay) */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
              {isRecording ? (
                <Button
                  id="btn-stop-recording"
                  variant="contained"
                  onClick={stopRecording}
                  startIcon={<StopIcon />}
                  sx={{
                    py: 1.4,
                    px: 4,
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "1rem",
                    fontFamily: "'Quicksand', sans-serif",
                    textTransform: "none",
                    boxShadow: "0 8px 24px rgba(239, 68, 68, 0.4)",
                    "&:hover": {
                      backgroundColor: "#dc2626",
                    },
                  }}
                >
                  Dừng quay ({6 - recordingSeconds}s)
                </Button>
              ) : (
                <Button
                  id="btn-start-recording"
                  variant="contained"
                  disabled={countdown !== null || !cameraReady}
                  onClick={handleStartCountdown}
                  startIcon={<VideocamIcon />}
                  sx={{
                    py: 1.4,
                    px: 4.5,
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                    backgroundColor: "#ec4899",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    fontFamily: "'Quicksand', sans-serif",
                    textTransform: "none",
                    boxShadow: "0 8px 24px rgba(236, 72, 153, 0.35)",
                    "&:hover": {
                      backgroundColor: "#db2777",
                      boxShadow: "0 10px 28px rgba(236, 72, 153, 0.45)",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: "rgba(236, 72, 153, 0.4)",
                      color: "#ffffff",
                    },
                  }}
                >
                  Bắt đầu quay
                </Button>
              )}
            </Box>
          </>
        )}

        {/* FLOW 2: GlamBot Preview & Save Screen Sau khi đã quay xong video */}
        {recordedBlob && (
          <GlamBotEffect
            ref={glamBotRef}
            videoBlob={recordedBlob}
            onBack={handleGoBack}
            onSaveOriginal={handleSaveOriginalVideo}
            onSaveGlamBot={handleTriggerSaveGlamBot}
            onExportComplete={handleGlamBotExportComplete}
            isSaving={isSaving}
            savingType={savingType}
          />
        )}
      </Container>
    </Box>
  );
}

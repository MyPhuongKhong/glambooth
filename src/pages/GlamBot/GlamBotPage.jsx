// FILE: src/pages/GlamBot/GlamBotPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  Video as VideoIcon,
  Square as SquareIcon,
  Play as PlayIcon,
  RotateCcw as RotateCcwIcon,
  Upload as UploadIcon,
  CheckCircle2 as CheckCircle2Icon,
  Camera as CameraIcon,
  Film as FilmIcon,
  Sparkles as SparklesIcon,
  ArrowLeft as ArrowLeftIcon,
  AlertCircle as AlertCircleIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { useAuth } from "../../contexts/AuthContext";
import { uploadToCloudinary } from "../../cloudinary/upload";
import { db } from "../../firebase/config";

// Hàm xác định định dạng video được trình duyệt hỗ trợ
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
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // States
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Danh sách các video đã quay (tối đa 3 lượt)
  const [recordedVideos, setRecordedVideos] = useState([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);

  // Trạng thái lưu / upload
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessIndex, setSavedSuccessIndex] = useState(null);

  // Khởi tạo Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
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

  // Dọn dẹp stream khi unmount
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

  // Xử lý đếm ngược 3...2...1 trước khi bắt đầu quay
  const handleStartCountdown = () => {
    if (recordedVideos.length >= 3) {
      toast.error("Bạn đã hoàn thành tối đa 3 lần quay thử!");
      return;
    }
    if (!cameraReady || !streamRef.current) {
      toast.error("Camera chưa sẵn sàng!");
      return;
    }

    setIsCountingDown(true);
    setCountdownValue(3);

    let currentCount = 3;
    countdownTimerRef.current = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdownValue(currentCount);
      } else {
        clearInterval(countdownTimerRef.current);
        setIsCountingDown(false);
        startRecording();
      }
    }, 1000);
  };

  // Bắt đầu quay video
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
        const videoUrl = URL.createObjectURL(blob);

        setRecordedVideos((prev) => {
          const newIndex = prev.length;
          const updated = [
            ...prev,
            {
              id: Date.now(),
              blob,
              url: videoUrl,
              mimeType: mime,
              duration: 10,
              createdAt: new Date(),
            },
          ];
          setSelectedVideoIndex(newIndex);
          return updated;
        });

        toast.success(`Đã quay xong lần ${recordedVideos.length + 1}! 🎉`, {
          icon: "🎬",
        });
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Bộ đếm thời gian 10 giây
      let seconds = 0;
      recordingTimerRef.current = setInterval(() => {
        seconds += 1;
        setRecordingSeconds(seconds);
        if (seconds >= 10) {
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

  // Chọn video để xem lại và lưu
  const handleSelectVideo = (index) => {
    setSelectedVideoIndex(index);
  };

  // Lưu video lên Cloudinary + Firestore
  const handleSaveVideo = async () => {
    if (selectedVideoIndex === null || !recordedVideos[selectedVideoIndex]) {
      toast.error("Vui lòng chọn 1 video để lưu!");
      return;
    }

    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để lưu video vào tài khoản!");
      navigate("/login");
      return;
    }

    const targetVideo = recordedVideos[selectedVideoIndex];
    setIsSaving(true);

    try {
      // 1. Chuyển Blob thành File object
      const extension = targetVideo.mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File(
        [targetVideo.blob],
        `glambot_${currentUser.uid}_${Date.now()}.${extension}`,
        { type: targetVideo.mimeType }
      );

      // 2. Upload lên Cloudinary thư mục 'glambot'
      const uploadResult = await uploadToCloudinary(file, "glambot");

      // 3. Lưu bản ghi vào Firestore collection 'videos'
      await addDoc(collection(db, "videos"), {
        userId: currentUser.uid,
        url: uploadResult.url,
        publicId: uploadResult.publicId || "",
        type: "glambot",
        createdAt: serverTimestamp(),
      });

      setSavedSuccessIndex(selectedVideoIndex);

      // 4. Hiển thị thông báo thành công với nút Xem trong Album
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
    } catch (error) {
      console.error("Save video error:", error);
      toast.error("Lưu video thất bại. Vui lòng thử lại!");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset quay lại từ đầu
  const handleResetAttempts = () => {
    setRecordedVideos([]);
    setSelectedVideoIndex(null);
    setSavedSuccessIndex(null);
    toast.success("Đã làm mới các lượt quay!");
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
              <AlertCircleIcon size={38} />
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
        maxWidth="md"
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
            startIcon={<ArrowLeftIcon size={18} />}
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
            icon={<SparklesIcon size={14} color="#ec4899" />}
            label={`Lượt quay: ${recordedVideos.length}/3`}
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
              <AlertCircleIcon size={40} color="#f43f5e" style={{ margin: "0 auto 12px" }} />
              <Typography variant="body2" sx={{ mb: 2, fontSize: "0.85rem" }}>
                {cameraError}
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={startCamera}
                startIcon={<RotateCcwIcon size={16} />}
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
                    REC 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:10
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

              {/* Progress bar thời gian quay 10s */}
              {isRecording && (
                <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(recordingSeconds / 10) * 100}
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

              {/* Overlay Đếm ngược 3...2...1 (Large 80px White Text + Motion Pulse Animation) */}
              <AnimatePresence>
                {isCountingDown && (
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
                      key={countdownValue}
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
                        {countdownValue}
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

        {/* Nút Điều khiển Camera (Start / Stop Recording) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          {isRecording ? (
            <Button
              id="btn-stop-recording"
              variant="contained"
              onClick={stopRecording}
              startIcon={<SquareIcon size={20} fill="#ffffff" />}
              sx={{
                py: 1.4,
                px: 4,
                borderRadius: "100px",
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
              Dừng quay ({10 - recordingSeconds}s)
            </Button>
          ) : (
            <Button
              id="btn-start-recording"
              variant="contained"
              disabled={isCountingDown || recordedVideos.length >= 3 || !cameraReady}
              onClick={handleStartCountdown}
              startIcon={<VideoIcon size={22} />}
              sx={{
                py: 1.4,
                px: 4.5,
                borderRadius: "100px",
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
              {recordedVideos.length >= 3 ? "Đã đạt tối đa 3 lần quay" : "Bắt đầu quay"}
            </Button>
          )}

          {recordedVideos.length > 0 && !isRecording && (
            <Tooltip title="Làm mới để quay lại từ đầu">
              <IconButton
                onClick={handleResetAttempts}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(236, 72, 153, 0.25)",
                  color: "#ec4899",
                  p: 1.2,
                  "&:hover": {
                    backgroundColor: "rgba(236, 72, 153, 0.15)",
                  },
                }}
              >
                <RotateCcwIcon size={20} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Danh sách các video đã quay (Tối đa 3 thumbnails nằm ngang) */}
        {recordedVideos.length > 0 && (
          <Box
            sx={{
              width: "100%",
              maxWidth: "540px",
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              borderRadius: "24px",
              p: { xs: 2, sm: 3 },
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.08)",
              mb: 3,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontFamily: "'Quicksand', sans-serif",
                  color: "#1f2937",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <FilmIcon size={18} color="#ec4899" />
                Chọn video ưng ý nhất ({recordedVideos.length}/3)
              </Typography>

              {selectedVideoIndex !== null && (
                <Typography variant="caption" sx={{ color: "#ec4899", fontWeight: 700 }}>
                  Đang chọn: Video #{selectedVideoIndex + 1}
                </Typography>
              )}
            </Box>

            {/* Horizontal Grid Thumbnails */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              {recordedVideos.map((video, index) => {
                const isSelected = selectedVideoIndex === index;
                const isSaved = savedSuccessIndex === index;

                return (
                  <Box
                    key={video.id}
                    id={`video-thumb-${index}`}
                    onClick={() => handleSelectVideo(index)}
                    sx={{
                      position: "relative",
                      aspectRatio: "9/16",
                      borderRadius: "16px",
                      overflow: "hidden",
                      cursor: "pointer",
                      backgroundColor: "#000000",
                      border: isSelected
                        ? "3px solid #ec4899"
                        : "2px solid rgba(255, 255, 255, 0.8)",
                      boxShadow: isSelected
                        ? "0 0 20px rgba(236, 72, 153, 0.45)"
                        : "0 4px 12px rgba(0, 0, 0, 0.08)",
                      transform: isSelected ? "scale(1.03)" : "scale(1)",
                      transition: "all 0.25s ease",
                      "&:hover": {
                        transform: "scale(1.03)",
                        borderColor: isSelected ? "#ec4899" : "rgba(236, 72, 153, 0.5)",
                      },
                    }}
                  >
                    <video
                      src={video.url}
                      muted
                      loop
                      autoPlay
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />

                    {/* Tag số thứ tự */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        backgroundColor: isSelected
                          ? "#ec4899"
                          : "rgba(0, 0, 0, 0.6)",
                        color: "#ffffff",
                        borderRadius: "100px",
                        px: 1,
                        py: 0.2,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      #{index + 1}
                    </Box>

                    {/* Badge đã lưu */}
                    {isSaved && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 8,
                          right: 8,
                          backgroundColor: "#10b981",
                          color: "#ffffff",
                          borderRadius: "50%",
                          p: 0.4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircle2Icon size={14} />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Nút Lưu Video */}
            {selectedVideoIndex !== null && (
              <Box sx={{ mt: 3, textAlign: "center" }}>
                <Button
                  id="btn-save-video"
                  variant="contained"
                  fullWidth
                  disabled={isSaving}
                  onClick={handleSaveVideo}
                  startIcon={
                    isSaving ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <UploadIcon size={18} />
                    )
                  }
                  sx={{
                    py: 1.3,
                    borderRadius: "100px",
                    backgroundColor: "#ec4899",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    fontFamily: "'Quicksand', sans-serif",
                    textTransform: "none",
                    boxShadow: "0 6px 20px rgba(236, 72, 153, 0.35)",
                    "&:hover": {
                      backgroundColor: "#db2777",
                      boxShadow: "0 8px 25px rgba(236, 72, 153, 0.45)",
                    },
                  }}
                >
                  {isSaving
                    ? "Đang tải video lên Cloudinary..."
                    : `Lưu video này (Lần ${selectedVideoIndex + 1})`}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}

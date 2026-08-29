// FILE: src/pages/GestureBooth/GestureBoothPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DownloadIcon from '@mui/icons-material/Download';
import CollectionsIcon from '@mui/icons-material/Collections';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { uploadToCloudinary } from '../../cloudinary/upload';

// ══════════════════════════════════════
// CONSTANTS (outside component)
// ══════════════════════════════════════

const GESTURE_THEMES = {
  Victory: {
    name: 'Victory ✌️',
    label: 'Giữ ✌️ để chụp',
    bgImage: '/backgrounds/victory.jpg',
    bgColors: ['#FFD700', '#FF8C00'],
    particleType: 'confetti',
    emoji: '✌️',
  },
  Open_Palm: {
    name: 'Galaxy 🖐️',
    label: 'Giữ 🖐️ để chụp',
    bgImage: '/backgrounds/galaxy.jpg',
    bgColors: ['#0a0a2e', '#1a1a4e'],
    particleType: 'stars',
    emoji: '🖐️',
  },
  ILoveYou: {
    name: 'Finger Heart 🤞',
    label: 'Giữ 🤞 để chụp',
    bgImage: '/backgrounds/heart.jpg',
    bgColors: ['#FF69B4', '#FF1493'],
    particleType: 'hearts',
    emoji: '🤞',
  },
};

const HOLD_DURATION = 2000;
const CANVAS_W = 640;
const CANVAS_H = 480;

// ══════════════════════════════════════
// PARTICLE SYSTEM (outside component)
// ══════════════════════════════════════

const initParticles = (type) => {
  const count = type === 'stars' ? 150 : 60;
  return Array.from({ length: count }, () => ({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    vx: (Math.random() - 0.5) * 2,
    vy:
      type === 'confetti'
        ? Math.random() * 3 + 1
        : type === 'hearts'
          ? -Math.random() * 2 - 0.5
          : (Math.random() - 0.5) * 0.3,
    size: Math.random() * 10 + 5,
    color:
      type === 'confetti'
        ? ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][
        Math.floor(Math.random() * 5)
        ]
        : type === 'hearts'
          ? '#FF69B4'
          : '#ffffff',
    opacity: Math.random() * 0.8 + 0.2,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.1,
    twinkle: Math.random() * Math.PI * 2,
  }));
};

const drawParticles = (ctx, particles, type, time) => {
  particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha =
      type === 'stars'
        ? 0.5 + 0.5 * Math.sin(p.twinkle + time * 0.002)
        : p.opacity;

    if (type === 'confetti') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (type === 'stars') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'hearts') {
      ctx.fillStyle = p.color;
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('♥', p.x, p.y);
    }
    ctx.restore();

    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    p.twinkle += 0.05;

    if (p.y > CANVAS_H + 20) p.y = -20;
    if (p.y < -20) p.y = CANVAS_H + 20;
    if (p.x > CANVAS_W + 20) p.x = -20;
    if (p.x < -20) p.x = CANVAS_W + 20;
  });
};

export default function GestureBoothPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const gestureRecognizerRef = useRef(null);
  const particlesRef = useRef([]);
  const holdStartRef = useRef(null);
  const lastGestureRef = useRef(null);
  const streamRef = useRef(null);
  const bgImagesRef = useRef({});
  const isCapturingRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [currentGesture, setCurrentGesture] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);

  // Background Image Preload
  useEffect(() => {
    Object.entries(GESTURE_THEMES).forEach(([key, theme]) => {
      const img = new Image();
      img.src = theme.bgImage;
      img.onload = () => {
        bgImagesRef.current[key] = img;
      };
      img.onerror = () => {
        console.warn(`BG image failed to load: ${theme.bgImage}`);
      };
    });
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const triggerCapture = async (gesture) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ✅ THAY: copy sang offscreen ĐỒNG BỘ trước khi RAF đụng vào
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_W;
    offscreen.height = CANVAS_H;
    offscreen.getContext('2d').drawImage(canvas, 0, 0); // sync, không async

    // Flash effect trên canvas chính
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    setIsUploading(true);
    try {
      // ✅ THAY: toBlob từ offscreen thay vì canvas chính
      const blob = await new Promise(res =>
        offscreen.toBlob(res, 'image/jpeg', 0.92)
      );
      const file = new File(
        [blob],
        `gesture-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );
      const result = await uploadToCloudinary(file, 'gesture-booth');
      const imageUrl =
        typeof result === 'string'
          ? result
          : result?.url ?? result?.secure_url;

      if (!imageUrl) throw new Error('No URL returned from Cloudinary');

      const { collection, addDoc, serverTimestamp } = await import(
        'firebase/firestore'
      );
      await addDoc(collection(db, 'photos'), {
        userId: currentUser?.uid || null,
        imageUrl,
        gesture,
        type: 'gesture',
        isPublic: true,
        createdAt: serverTimestamp(),
      });

      setCapturedUrl(imageUrl);
      setPhotoCount((c) => c + 1);
      setHoldProgress(0);
    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      setIsUploading(false);
      isCapturingRef.current = false;
      holdStartRef.current = Date.now(); // restart hold timer
    }
  };

  const startRenderLoop = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');

    const render = (timestamp) => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Always try to draw video, even if readyState < 2
      if (video && video.videoWidth > 0) {
        // 1. Detect gesture
        let detectedGesture = null;
        if (gestureRecognizerRef.current && video.readyState >= 2) {
          try {
            const results = gestureRecognizerRef.current.recognizeForVideo(
              video,
              timestamp
            );
            if (results.gestures?.length > 0) {
              const top = results.gestures[0][0];
              if (top.score > 0.7 && GESTURE_THEMES[top.categoryName]) {
                detectedGesture = top.categoryName;
              }
            }
          } catch (e) {
            /* skip */
          }
        }

        // 2. Handle gesture change
        if (detectedGesture !== lastGestureRef.current) {
          lastGestureRef.current = detectedGesture;
          setCurrentGesture(detectedGesture);
          holdStartRef.current = detectedGesture ? Date.now() : null;
          setHoldProgress(0);
          if (detectedGesture) {
            particlesRef.current = initParticles(
              GESTURE_THEMES[detectedGesture].particleType
            );
          }
        }

        // 4. Draw background
        if (detectedGesture) {
          const bgImg = bgImagesRef.current[detectedGesture];
          if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            // Cover fit
            const scale = Math.max(
              CANVAS_W / bgImg.width,
              CANVAS_H / bgImg.height
            );
            const w = bgImg.width * scale;
            const h = bgImg.height * scale;
            const x = (CANVAS_W - w) / 2;
            const y = (CANVAS_H - h) / 2;
            ctx.drawImage(bgImg, x, y, w, h);
          } else {
            // Gradient fallback
            const theme = GESTURE_THEMES[detectedGesture];
            const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
            grad.addColorStop(0, theme.bgColors[0]);
            grad.addColorStop(1, theme.bgColors[1]);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          }

          // Particles on top of background
          drawParticles(
            ctx,
            particlesRef.current,
            GESTURE_THEMES[detectedGesture].particleType,
            timestamp
          );
        }

        // 5. Draw mirrored camera (person on top)
        ctx.save();
        ctx.translate(CANVAS_W, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();

        // 3. Hold progress + auto-capture
        if (detectedGesture && holdStartRef.current && !isCapturingRef.current) {
          const elapsed = Date.now() - holdStartRef.current;
          const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
          setHoldProgress(progress);
          if (progress >= 100) {
            holdStartRef.current = null;
            isCapturingRef.current = true;
            triggerCapture(detectedGesture); // Lúc này canvas đã có hình ảnh để copy!
          }
        }

        // 6. HUD overlay
        if (detectedGesture) {
          const theme = GESTURE_THEMES[detectedGesture];
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath();
          ctx.roundRect(CANVAS_W / 2 - 110, 14, 220, 40, 20);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 17px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(theme.label, CANVAS_W / 2, 40);
        } else {
          // Idle hint
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.roundRect(CANVAS_W / 2 - 130, 14, 260, 40, 20);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = '15px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Giơ tay ✌️ 🖐️ 🤞 trước camera', CANVAS_W / 2, 40);
        }
      } else {
        // Show "camera loading" placeholder
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Đang khởi động camera...', CANVAS_W / 2, CANVAS_H / 2);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: CANVAS_W, height: CANVAS_H, facingMode: 'user' },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      // Wait for video to be truly ready
      await new Promise((resolve) => {
        video.addEventListener('canplay', resolve, { once: true });
        setTimeout(resolve, 5000);
      });

      try {
        await video.play();
      } catch (e) {
        console.warn('play() error:', e);
      }
      // DO NOT call startRenderLoop() here
    } catch (err) {
      console.error('Camera access error:', err);
      setLoadError('Không thể mở camera. Vui lòng cấp quyền truy cập!');
    }
  };

  // MediaPipe Initialization
  useEffect(() => {
    let cancelled = false;

    const initMediaPipe = async () => {
      try {
        const { FilesetResolver, GestureRecognizer } = await import(
          '@mediapipe/tasks-vision'
        );

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (!cancelled) {
          gestureRecognizerRef.current = recognizer;
          await startCamera();
          setIsLoading(false);
        }
      } catch (err) {
        console.error('MediaPipe init error:', err);
        if (!cancelled) {
          setLoadError(err.message || 'Lỗi khởi tạo AI');
          setIsLoading(false);
        }
      }
    };

    initMediaPipe();

    return () => {
      cancelled = true;
      stopCamera();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Start render loop after canvas is mounted
  useEffect(() => {
    if (isLoading || loadError) return;
    // Small delay ensures canvas DOM element is mounted
    const timer = setTimeout(() => {
      if (canvasRef.current && videoRef.current) {
        startRenderLoop();
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isLoading, loadError]);

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: '#0a0a1a',
      }}
    >
      {/* Video element ALWAYS mounted as FIRST child to guarantee ref availability */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Navbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 3,
          py: 1.5,
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            stopCamera();
            navigate('/');
          }}
          sx={{ color: 'white' }}
        >
          Trang chủ
        </Button>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {photoCount > 0 && (
            <Chip
              label={`${photoCount} ảnh`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }}
            />
          )}
          <Chip
            icon={<AutoAwesomeIcon sx={{ color: 'white !important' }} />}
            label="Gesture Booth"
            sx={{ bgcolor: 'rgba(233,30,140,0.3)', color: 'white' }}
          />
        </Box>
      </Box>

      {/* Main */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          p: 2,
        }}
      >
        {/* Left: Canvas area */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          {isLoading && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <CircularProgress sx={{ color: '#e91e8c' }} size={48} />
              <Typography color="white">Đang tải AI model...</Typography>
              <Typography color="rgba(255,255,255,0.5)" variant="caption">
                Lần đầu có thể mất 10-15 giây
              </Typography>
            </Box>
          )}

          {loadError && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => window.location.reload()}
                >
                  Thử lại
                </Button>
              }
            >
              Không tải được AI model: {loadError}
            </Alert>
          )}

          {!isLoading && !loadError && (
            <Box
              sx={{
                position: 'relative',
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: currentGesture
                  ? `0 0 40px ${GESTURE_THEMES[currentGesture]?.bgColors[0]}88`
                  : '0 8px 32px rgba(0,0,0,0.5)',
                transition: 'box-shadow 0.3s ease',
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '65vh',
                }}
              />

              {/* Hold progress bar */}
              {currentGesture && holdProgress > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 6,
                    bgcolor: 'rgba(0,0,0,0.3)',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${holdProgress}%`,
                      bgcolor: '#e91e8c',
                      transition: 'width 0.1s linear',
                      boxShadow: '0 0 8px #e91e8c',
                    }}
                  />
                </Box>
              )}

              {/* Upload overlay */}
              {isUploading && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.6)',
                  }}
                >
                  <CircularProgress sx={{ color: '#e91e8c' }} />
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Right: Guide + preview */}
        <Box
          sx={{
            width: { xs: '100%', md: 240 },
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}
          >
            Thực hiện cử chỉ để chụp
          </Typography>

          {Object.entries(GESTURE_THEMES).map(([key, theme]) => (
            <Paper
              key={key}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor:
                  currentGesture === key
                    ? 'rgba(233,30,140,0.2)'
                    : 'rgba(255,255,255,0.05)',
                border:
                  currentGesture === key
                    ? '1px solid #e91e8c'
                    : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography fontSize={28}>{theme.emoji}</Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={700} color="white">
                    {theme.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    Giữ 2 giây để chụp
                  </Typography>
                </Box>
                {currentGesture === key && (
                  <CircularProgress
                    variant="determinate"
                    value={holdProgress}
                    size={28}
                    thickness={5}
                    sx={{ color: '#e91e8c' }}
                  />
                )}
              </Box>
            </Paper>
          ))}

          {/* Last captured preview */}
          {capturedUrl && (
            <Paper
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.5)',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                Ảnh vừa chụp
              </Typography>
              <img
                src={capturedUrl}
                alt="captured"
                style={{ width: '100%', borderRadius: 8, display: 'block' }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button
                  size="small"
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    fetch(capturedUrl)
                      .then((r) => r.blob())
                      .then((blob) => {
                        const a = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        a.href = url;
                        a.download = 'gesture-photo.jpg';
                        a.click();
                        URL.revokeObjectURL(url);
                      });
                  }}
                  sx={{
                    borderRadius: '999px',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    fontSize: '0.7rem',
                  }}
                >
                  Tải về
                </Button>
                <Button
                  size="small"
                  fullWidth
                  variant="outlined"
                  startIcon={<CollectionsIcon />}
                  onClick={() => navigate('/profile')}
                  sx={{
                    borderRadius: '999px',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    fontSize: '0.7rem',
                  }}
                >
                  Album
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}

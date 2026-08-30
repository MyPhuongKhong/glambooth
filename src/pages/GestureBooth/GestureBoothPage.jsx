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
  Thumb_Up: {
    name: 'Thumb Up 👍',
    label: 'Giữ 👍 để chụp',
    bgImage: '/backgrounds/heart.jpg',
    bgColors: ['#FF69B4', '#FF1493'],
    particleType: 'hearts',
    emoji: '👍',
  },
};

const HOLD_DURATION = 3000;
const CANVAS_W = 640;
const CANVAS_H = 480;

// MediaPipe Hand skeleton connections
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20], // Pinky & Palm
];

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

// ══════════════════════════════════════
// HAND LANDMARK VISUALIZER (HUD Layer)
// ══════════════════════════════════════

const drawHandLandmarks = (ctx, landmarksList) => {
  if (!landmarksList || landmarksList.length === 0) return;

  landmarksList.forEach((landmarks) => {
    // Map normalized mirrored coordinates
    const points = landmarks.map((lm) => ({
      x: (1 - lm.x) * CANVAS_W,
      y: lm.y * CANVAS_H,
    }));

    // Draw connecting lines
    ctx.save();
    ctx.strokeStyle = 'rgba(233, 30, 140, 0.85)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = points[startIdx];
      const p2 = points[endIdx];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });

    // Draw joints
    points.forEach((p, idx) => {
      ctx.beginPath();
      // Highlight fingertips
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      ctx.arc(p.x, p.y, isTip ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? '#ffffff' : '#FFD700';
      ctx.fill();
      ctx.strokeStyle = 'rgba(233, 30, 140, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.restore();
  });
};

export default function GestureBoothPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const gestureRecognizerRef = useRef(null);
  const imageSegmenterRef = useRef(null);
  const particlesRef = useRef([]);
  const holdStartRef = useRef(null);
  const lastGestureRef = useRef(null);
  const streamRef = useRef(null);
  const bgImagesRef = useRef({});
  const isCapturingRef = useRef(false);
  const maskCanvasRef = useRef(null);
  const personCanvasRef = useRef(null);

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

  const triggerCapture = async (gesture, captureCanvas) => {
    const canvas = canvasRef.current;
    if (!canvas || !captureCanvas) return;
    const ctx = canvas.getContext('2d');

    // Flash effect on main canvas
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    setIsUploading(true);
    try {
      // Capture clean snapshot without HUD, large countdown or hand landmark skeletons
      const blob = await new Promise((res) =>
        captureCanvas.toBlob(res, 'image/jpeg', 0.92)
      );
      if (!blob) throw new Error('Canvas blob conversion failed');

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

      // Always try to draw video when video frames exist
      if (video && video.videoWidth > 0) {
        // 1. Detect gesture & extract hand landmarks with GestureRecognizer
        let detectedGesture = null;
        let detectedLandmarks = [];

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

            if (results.landmarks?.length > 0) {
              detectedLandmarks = results.landmarks;
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

        // 3. Segment person if gesture is active
        let segmentationResult = null;
        if (detectedGesture && imageSegmenterRef.current && video.readyState >= 2) {
          try {
            imageSegmenterRef.current.segmentForVideo(
              video,
              timestamp,
              (result) => {
                segmentationResult = result;
              }
            );
          } catch (e) {
            /* skip */
          }
        }

        if (detectedGesture) {
          // LAYER 1 (Bottom): Background (theme bgImage or gradient fallback)
          const bgImg = bgImagesRef.current[detectedGesture];
          if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
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
            const theme = GESTURE_THEMES[detectedGesture];
            const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
            grad.addColorStop(0, theme.bgColors[0]);
            grad.addColorStop(1, theme.bgColors[1]);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          }

          // LAYER 2 (Person): Segmented mirrored person on top of background
          const mask =
            segmentationResult?.confidenceMasks?.[0] ||
            segmentationResult?.categoryMask;

          if (mask) {
            const maskWidth = mask.width;
            const maskHeight = mask.height;

            if (!maskCanvasRef.current) {
              maskCanvasRef.current = document.createElement('canvas');
            }
            const maskCanvas = maskCanvasRef.current;
            if (maskCanvas.width !== maskWidth || maskCanvas.height !== maskHeight) {
              maskCanvas.width = maskWidth;
              maskCanvas.height = maskHeight;
            }
            const maskCtx = maskCanvas.getContext('2d');
            const imgData = maskCtx.createImageData(maskWidth, maskHeight);
            const data = imgData.data;

            if (segmentationResult.confidenceMasks?.[0]) {
              const floatArr = mask.getAsFloat32Array();
              for (let i = 0; i < floatArr.length; i++) {
                const idx = i * 4;
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
                data[idx + 3] = Math.round(floatArr[i] * 255);
              }
            } else {
              const uintArr = mask.getAsUint8Array();
              for (let i = 0; i < uintArr.length; i++) {
                const idx = i * 4;
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
                data[idx + 3] = uintArr[i] > 0 ? 255 : 0;
              }
            }
            maskCtx.putImageData(imgData, 0, 0);

            // Composite person onto personCanvas
            if (!personCanvasRef.current) {
              personCanvasRef.current = document.createElement('canvas');
              personCanvasRef.current.width = CANVAS_W;
              personCanvasRef.current.height = CANVAS_H;
            }
            const personCanvas = personCanvasRef.current;
            const pCtx = personCanvas.getContext('2d');
            pCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);

            // A. Draw mirrored camera feed
            pCtx.save();
            pCtx.translate(CANVAS_W, 0);
            pCtx.scale(-1, 1);
            pCtx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H);
            pCtx.restore();

            // B. Mask with mirrored maskCanvas
            pCtx.save();
            pCtx.globalCompositeOperation = 'destination-in';
            pCtx.translate(CANVAS_W, 0);
            pCtx.scale(-1, 1);
            pCtx.drawImage(maskCanvas, 0, 0, CANVAS_W, CANVAS_H);
            pCtx.restore();

            // Draw segmented person on top of background
            ctx.drawImage(personCanvas, 0, 0, CANVAS_W, CANVAS_H);
          } else {
            // Fallback: draw mirrored video if mask is still processing
            ctx.save();
            ctx.translate(CANVAS_W, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H);
            ctx.restore();
          }

          // LAYER 3 (Effects): Falling particles on top of person & background
          drawParticles(
            ctx,
            particlesRef.current,
            GESTURE_THEMES[detectedGesture].particleType,
            timestamp
          );
        } else {
          // No gesture detected: Normal mirrored camera preview
          ctx.save();
          ctx.translate(CANVAS_W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H);
          ctx.restore();
        }

        // ══════════════════════════════════════
        // SNAPSHOT CHECK (Clean Capture: Layers 1, 2, 3 WITHOUT HUD & Countdown)
        // ══════════════════════════════════════
        let captureCanvasSnapshot = null;
        let currentProgress = 0;

        if (detectedGesture && holdStartRef.current && !isCapturingRef.current) {
          const elapsed = Date.now() - holdStartRef.current;
          currentProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
          setHoldProgress(currentProgress);
          if (currentProgress >= 100) {
            holdStartRef.current = null;
            isCapturingRef.current = true;

            // Copy the exact Layer 1 + 2 + 3 rendering to offscreen canvas
            captureCanvasSnapshot = document.createElement('canvas');
            captureCanvasSnapshot.width = CANVAS_W;
            captureCanvasSnapshot.height = CANVAS_H;
            captureCanvasSnapshot
              .getContext('2d')
              .drawImage(canvas, 0, 0, CANVAS_W, CANVAS_H);

            triggerCapture(detectedGesture, captureCanvasSnapshot);
          }
        }

        // ══════════════════════════════════════
        // LAYER 4 (Top): HUD Overlay (Hand Landmarks, Large Floating Countdown & Enhanced Instructions)
        // ══════════════════════════════════════

        // Visual feedback: Draw tracked hand skeleton
        if (detectedLandmarks.length > 0) {
          drawHandLandmarks(ctx, detectedLandmarks);
        }

        if (detectedGesture) {
          const theme = GESTURE_THEMES[detectedGesture];

          // 1. High contrast instruction badge at top
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.roundRect(CANVAS_W / 2 - 110, 14, 220, 42, 21);
          ctx.fill();

          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 17px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(theme.label, CANVAS_W / 2, 35);
          ctx.restore();

          // 2. Large Floating Countdown (3, 2, 1) in the center of canvas
          const remainingSeconds = Math.max(
            1,
            Math.ceil(((100 - currentProgress) / 100) * (HOLD_DURATION / 1000))
          );

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '900 120px Arial, system-ui, sans-serif';

          // Heavy dark stroke for ultra-pop contrast
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.lineWidth = 12;
          ctx.lineJoin = 'round';
          ctx.strokeText(`${remainingSeconds}`, CANVAS_W / 2, CANVAS_H / 2);

          // Glowing white text fill with drop shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 16;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${remainingSeconds}`, CANVAS_W / 2, CANVAS_H / 2);
          ctx.restore();
        } else {
          // Idle hint with high contrast badge
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.roundRect(CANVAS_W / 2 - 135, 14, 270, 42, 21);
          ctx.fill();

          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.font = 'bold 15px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Giơ tay ✌️ 🖐️ 👍 trước camera', CANVAS_W / 2, 35);
          ctx.restore();
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

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.addEventListener('canplay', resolve, { once: true });
        setTimeout(resolve, 5000);
      });

      try {
        await video.play();
      } catch (e) {
        console.warn('play() error:', e);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setLoadError('Không thể mở camera. Vui lòng cấp quyền truy cập!');
    }
  };

  // Concurrent MediaPipe Initialization: GestureRecognizer + ImageSegmenter
  useEffect(() => {
    let cancelled = false;

    const initMediaPipe = async () => {
      try {
        const { FilesetResolver, GestureRecognizer, ImageSegmenter } =
          await import('@mediapipe/tasks-vision');

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const recognizerPromise = GestureRecognizer.createFromOptions(vision, {
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

        const segmenterPromise = ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: true,
        });

        const [recognizer, segmenter] = await Promise.all([
          recognizerPromise,
          segmenterPromise,
        ]);

        if (!cancelled) {
          gestureRecognizerRef.current = recognizer;
          imageSegmenterRef.current = segmenter;
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
                    Giữ 3 giây để chụp
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

# 📸 Web GlamBooth: Photo Booth & GlamBot AI

Ứng dụng chụp ảnh Photo Booth tương tác và quay video hiệu ứng thảm đỏ GlamBot chạy trực tiếp trên trình duyệt web, tích hợp công nghệ nhận diện cử chỉ tay và tách nền thời gian thực bằng AI.

> 🚧 **Trạng thái cập nhật:**
> - **15/11/2026:** Đang sửa logic Đăng nhập / Lưu Cloud.

---

## ✨ Tính năng nổi bật

### 1. 🎥 Xuất video 6s mô phỏng hiệu ứng GlamBot
Trải nghiệm quay video thảm đỏ chuyên nghiệp ngay trên trình duyệt mà không cần phần mềm hậu kỳ phức tạp:
* **Xử lý trực tiếp trên trình duyệt:** Sử dụng sức mạnh của **HTML5 Canvas** để ghi và render video thời gian thực.
* **Kịch bản chuyển động 4 pha:** Mô phỏng chính xác quỹ đạo cánh tay robot GlamBot thông qua các phép biến đổi xoay (rotation), thu phóng (zoom) và điều chỉnh tốc độ khung hình:
  * **Pha 1 (`0.0s – 1.5s`):** Lao máy vào chủ thể (Zoom-in nhanh).
  * **Pha 2 (`1.5s – 4.0s`):** Chuyển động chậm (Slow-Mo `0.5x`) bắt trọn khoảnh khắc thần thái.
  * **Pha 3 (`4.0s – 4.7s`):** Cú lướt tốc độ cao đặc trưng của GlamBot.
  * **Pha 4 (`4.7s – 6.0s`):** Thu máy mượt mà về điểm gốc.
* **Chất lượng & Định dạng tối ưu:**
  * **Tỷ lệ & Độ phân giải:** Khung hình dọc `9:16`, render trực tiếp ở độ phân giải `405 × 720 px` (lấy nguồn từ camera lý tưởng Full HD `1080p` hoặc tối thiểu webcam HD `720p`).
  * **Định dạng xuất:** Tự động chọn container `WebM (VP9/VP8)` hoặc `MP4 (H.264)` tùy theo khả năng hỗ trợ của trình duyệt với tốc độ `~30 FPS`, đảm bảo thời gian nén siêu tốc và phát mượt mà trên mọi thiết bị di động.

---

### 2. 🖐️ Nhận diện 3 cử chỉ tay (✌️ 🖐️ 👍) thời gian thực
Tương tác rảnh tay thông minh với công nghệ thị giác máy tính:
* **Tích hợp AI tốc độ cao:** Sử dụng **MediaPipe Tasks Vision** (`GestureRecognizer` & `ImageSegmenter`) để theo dõi các điểm mốc (landmarks) trên bàn tay và tách nền người dùng theo thời gian thực với độ trễ tải mô hình cực thấp (`~10 – 25 ms`).
* **Cơ chế chống nhận diện nhầm (Anti-False Positives):** Ngăn chặn việc vô tình kích hoạt chụp khi người dùng lướt tay qua camera thông qua bộ lọc kép:
  * **Ngưỡng tin cậy (Confidence score threshold):** `> 0.7` (`70%`).
  * **Thời gian giữ cử chỉ (Hold Duration):** `3.000 ms` (`3 giây`), đi kèm thanh tiến trình (progress bar) và bộ đếm ngược trực quan ngay trên màn hình trước khi tự động bấm máy.
* **Hiệu ứng tương tác bất ngờ:** Ngay khi xác nhận một trong 3 cử chỉ (`✌️`, `🖐️`, `👍`), hệ thống sẽ kích hoạt hiệu ứng hạt (particle system) và thay đổi phông nền theo chủ đề tương ứng để tạo ra những bức ảnh độc đáo.

---

### 3. 🖼️ Chụp ảnh Photo Booth với Khung ảnh & Sticker tùy chỉnh
Tự do sáng tạo dải ảnh kỷ niệm mang đậm dấu ấn cá nhân:
* **Đa dạng bố cục (Layouts):** Hỗ trợ nhiều kiểu khung hình phổ biến như `Lưới 2x2`, `Dọc 2`, `Dọc 3`, `Ngang 1`, `Ngang 2`.
* **Tùy biến & Trang trí:** Cho phép đổi màu nền khung viền và tích hợp cơ chế **kéo-thả (drag-and-drop)** bộ nhãn dán (sticker) trực quan.
* **Trải nghiệm chụp mượt mà:** Tự động đếm ngược `3 giây` trên từng ô canvas trước mỗi lần chụp.
* **Xuất ảnh chất lượng cao:**
  * **Định dạng:** File ảnh `JPEG (.jpg)` giữ nguyên độ sắc nét với chất lượng `95%` (`image/jpeg`, `quality: 0.95`).
  * **Độ phân giải đầu ra:** Tự động điều chỉnh theo bố cục được chọn (ví dụ: dải ảnh `Dọc 3` xuất ra kích thước `540 × 1080 px`, khung `Lưới 2×2` xuất ra `900 × 800 px`), bao gồm đầy đủ màu khung, ảnh chụp bo góc và toàn bộ sticker đã trang trí.

---

## 🛠️ Công nghệ sử dụng

* **Frontend & Graphics:** HTML5 Canvas API, MediaRecorder API, CSS3 / JavaScript
* **AI & Computer Vision:** Google MediaPipe Tasks Vision (`GestureRecognizer`, `ImageSegmenter`)
* **Media Processing:** WebM / MP4 Client-side Encoding, High-Res Canvas Export
// FILE: src/cloudinary/upload.js

const CLOUD_NAME = "hcuqdzed";
const UPLOAD_PRESET = "photobooth";

/**
 * Tải tệp lên Cloudinary thông qua Direct REST API (Unsigned upload)
 * @param {File|Blob|string} file - Tệp ảnh/video hoặc chuỗi base64 cần tải lên
 * @param {string} [folder="glambooth"] - Thư mục đích trên Cloudinary
 * @returns {Promise<{ url: string, publicId: string }>} Đối tượng chứa URL và public ID của tệp
 */
export async function uploadToCloudinary(file, folder = "glambooth") {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    if (folder) {
      formData.append("folder", folder);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error?.message ||
        `Lỗi khi tải tệp lên Cloudinary (${response.status}: ${response.statusText})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      url: data.secure_url || data.url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error("Lỗi uploadToCloudinary:", error);
    throw error;
  }
}

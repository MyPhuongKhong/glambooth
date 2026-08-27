// FILE: src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase/config";

const AuthContext = createContext(null);

/**
 * Custom hook truy cập AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng bên trong AuthProvider");
  }
  return context;
}

/**
 * Provider quản lý trạng thái đăng nhập Firebase Auth
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Đăng ký tài khoản mới kèm cập nhật Tên hiển thị (displayName)
  async function signup(email, password, displayName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, {
        displayName: displayName.trim(),
      });
      // Cập nhật state nội bộ để giao diện nhận ngay displayName
      setCurrentUser({
        ...userCredential.user,
        displayName: displayName.trim(),
      });
    }
    return userCredential.user;
  }

  // Đăng nhập bằng Email và Mật khẩu
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Đăng xuất khỏi hệ thống
  function logout() {
    return signOut(auth);
  }

  // Lắng nghe thay đổi trạng thái đăng nhập theo thời gian thực
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

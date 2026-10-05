import React, { useState } from 'react';
import { 
  Home, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  // Map Firebase Auth error codes to user-friendly Vietnamese messages
  const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/operation-not-allowed':
        return 'Phương thức đăng nhập Email/Password chưa được Bật trong Firebase Console. Hãy vào Firebase Console > Authentication > Sign-in method và Bật (Enable) Email/Password.';
      case 'auth/invalid-email':
        return 'Địa chỉ email không đúng định dạng.';
      case 'auth/user-not-found':
        return 'Tài khoản không tồn tại trên hệ thống.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
      case 'auth/user-disabled':
        return 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ quản trị viên.';
      case 'auth/too-many-requests':
        return 'Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau vài phút.';
      case 'auth/network-request-failed':
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền Internet.';
      case 'auth/missing-password':
        return 'Vui lòng nhập mật khẩu.';
      default:
        return 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
    }
  };

  const getResetErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/operation-not-allowed':
        return 'Phương thức Email/Password chưa được Bật trong Firebase Console.';
      case 'auth/invalid-email':
        return 'Địa chỉ email không đúng định dạng.';
      case 'auth/user-not-found':
        return 'Không tìm thấy tài khoản với địa chỉ email này.';
      case 'auth/too-many-requests':
        return 'Đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.';
      case 'auth/network-request-failed':
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền Internet.';
      default:
        return 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      // onAuthStateChanged in App.tsx will automatically pick up the logged in user
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      const code = error?.code || '';
      setErrorMessage(getAuthErrorMessage(code));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage(null);
    setResetSuccessMessage(null);

    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail) {
      setResetErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }

    setIsResetSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetSuccessMessage(
        'Đã gửi liên kết đặt lại mật khẩu tới email của bạn. Vui lòng kiểm tra hộp thư (bao gồm cả thư mục Spam/Rác).'
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      const code = error?.code || '';
      setResetErrorMessage(getResetErrorMessage(code));
    } finally {
      setIsResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-200 relative overflow-hidden"
      >
        {/* Subtle decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl pointer-events-none opacity-60" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-50 rounded-full blur-3xl pointer-events-none opacity-60" />

        <AnimatePresence mode="wait">
          {!isForgotPassword ? (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Home className="w-8 h-8 text-emerald-600" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">RoomMaster</h1>
                <p className="text-sm text-stone-500 mt-1">Đăng nhập vào hệ thống quản lý phòng trọ</p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </motion.div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="admin@example.com"
                      autoComplete="email"
                      disabled={isSubmitting}
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-60"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setResetEmail(email);
                        setErrorMessage(null);
                        setResetErrorMessage(null);
                        setResetSuccessMessage(null);
                      }}
                      tabIndex={-1}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors focus:outline-none"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      className="w-full pl-11 pr-11 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-60"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang đăng nhập...</span>
                    </>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-stone-100 text-center">
                <p className="text-xs text-stone-400">
                  Tài khoản hệ thống được cấp bởi Quản trị viên
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="forgot-password-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Back button */}
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetErrorMessage(null);
                  setResetSuccessMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors mb-6 py-1 pr-2 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại đăng nhập</span>
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <KeyRound className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Quên mật khẩu</h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Nhập địa chỉ email tài khoản để nhận liên kết thiết lập lại mật khẩu
                </p>
              </div>

              {/* Success Message */}
              {resetSuccessMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-sm"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="leading-relaxed">{resetSuccessMessage}</span>
                </motion.div>
              )}

              {/* Error Message */}
              {resetErrorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <span className="leading-relaxed">{resetErrorMessage}</span>
                </motion.div>
              )}

              {/* Reset Password Form */}
              <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Địa chỉ Email của bạn
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (resetErrorMessage) setResetErrorMessage(null);
                      }}
                      placeholder="admin@example.com"
                      autoComplete="email"
                      disabled={isResetSubmitting}
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-60"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isResetSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang gửi liên kết...</span>
                    </>
                  ) : (
                    <span>Gửi liên kết đặt lại mật khẩu</span>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

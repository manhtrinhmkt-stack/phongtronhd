import React, { useState } from 'react';
import { 
  Home, 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2
} from 'lucide-react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Map Firebase Auth error codes to user-friendly Vietnamese messages
  const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/operation-not-allowed':
        return 'Phương thức đăng nhập Email/Password chưa được Bật trong Firebase Console.';
      case 'auth/invalid-email':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
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

  const getInternalEmail = (inputUsername: string) => {
    const trimmed = inputUsername.trim();
    if (trimmed.includes('@')) return trimmed.toLowerCase();
    return `${trimmed.toLowerCase()}@roommaster.local`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage('Vui lòng nhập tên đăng nhập.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    const internalEmail = getInternalEmail(trimmedUsername);

    setIsSubmitting(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, internalEmail, password);
    } catch (error: any) {
      const code = error?.code || '';
      if (code !== 'auth/invalid-credential' && code !== 'auth/user-not-found' && code !== 'auth/wrong-password') {
        console.warn('Sign-in failed:', code || error);
      }
      setErrorMessage(getAuthErrorMessage(code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-200 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl pointer-events-none opacity-60" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-50 rounded-full blur-3xl pointer-events-none opacity-60" />

        <div>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Home className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">Quản lý phòng trọ</h1>
            <p className="text-sm font-semibold text-stone-500 mt-1">Đăng nhập vào hệ thống quản lý phòng trọ</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Nhập tên đăng nhập (VD: admin)"
                  autoComplete="username"
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm font-bold placeholder:font-normal placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-60"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
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
                  className="w-full pl-11 pr-11 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm font-bold placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-60"
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
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200/60 disabled:opacity-70 disabled:cursor-not-allowed"
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

          <div className="mt-8 pt-6 border-t border-stone-100 text-center space-y-2">
            <p className="text-xs text-stone-500 font-semibold">
              Tài khoản hệ thống do Quản trị viên cấp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

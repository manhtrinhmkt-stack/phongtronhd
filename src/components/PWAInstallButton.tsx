import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200/50 transition-all cursor-pointer animate-pulse shrink-0"
        title="Tải ứng dụng về máy"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Cài đặt Ứng dụng</span>
        <span className="sm:hidden">Tải App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer shrink-0"
        >
          <Smartphone className="w-4 h-4" />
          <span>Thêm vào Màn hình chính</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 relative space-y-4">
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 font-bold">
                  🏠
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Cài đặt trên iPhone / iPad</h3>
                  <p className="text-xs text-stone-500 font-medium">Thêm ứng dụng vào màn hình chính</p>
                </div>
              </div>

              <div className="text-xs text-stone-700 font-medium space-y-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                <p>1. Chạm vào nút <strong>Chia sẻ (Share)</strong> trên thanh công cụ Safari 📤.</p>
                <p>2. Cuộn xuống và chọn <strong>Thêm vào Màn hình chính (Add to Home Screen)</strong> ➕.</p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback direct Chrome install button
  return (
    <button
      onClick={() => {
        alert("Để cài đặt App: Bấm vào biểu tượng 3 chấm ở góc phải trình duyệt Chrome -> Chọn 'Cài đặt ứng dụng' hoặc 'Thêm vào màn hình chính'.");
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer shrink-0"
      title="Tải ứng dụng về máy"
    >
      <Download className="w-4 h-4 text-emerald-600" />
      <span className="hidden sm:inline">Tải App</span>
    </button>
  );
};

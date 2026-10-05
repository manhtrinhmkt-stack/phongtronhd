import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${
                type === 'danger' ? 'bg-red-100 text-red-600' : 
                type === 'warning' ? 'bg-amber-100 text-amber-600' : 
                'bg-blue-100 text-blue-600'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">{title}</h3>
              <p className="text-sm text-stone-500 mb-6">{message}</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-stone-200 text-stone-600 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
                >
                  {cancelText}
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-2 px-4 text-white font-semibold rounded-xl transition-colors shadow-lg ${
                    type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 
                    type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 
                    'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

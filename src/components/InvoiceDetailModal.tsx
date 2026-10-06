import React, { useState } from 'react';
import { Invoice, Room, Tenant, formatNumber } from '../types';
import { X, CheckCircle2, AlertTriangle, Copy, Check, Home, User, FileText } from 'lucide-react';
import { firebaseService } from '../firebaseService';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  rooms: Room[];
  tenants: Tenant[];
  onClose: () => void;
  onStatusChange?: () => void;
}

export default function InvoiceDetailModal({
  invoice,
  rooms,
  tenants,
  onClose,
  onStatusChange
}: InvoiceDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!invoice) return null;

  const room = rooms.find(r => r.id === invoice.roomId);
  const tenant = tenants.find(t => t.id === invoice.tenantId);

  const handleToggleStatus = async () => {
    if (!invoice.id || isUpdating) return;
    setIsUpdating(true);
    try {
      const newStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';
      await firebaseService.updateInvoiceStatus(invoice.id, newStatus);
      if (onStatusChange) onStatusChange();
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyText = () => {
    if (invoice.textTemplate) {
      navigator.clipboard.writeText(invoice.textTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs" 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-stone-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900">Chi tiết hóa đơn</h3>
              <p className="text-xs text-stone-500 font-medium">
                Tháng {invoice.month}/{invoice.year}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-200/60 rounded-xl transition-colors text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Status & Room/Tenant Info */}
          <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3.5 sm:p-4 rounded-xl border border-stone-200/80">
            <div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Phòng trọ
              </span>
              <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs sm:text-sm">
                <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Phòng {room?.name || '---'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Khách thuê
              </span>
              <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs sm:text-sm">
                <User className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{tenant?.name || invoice.tenantName || room?.tenantName || 'Khách thuê'}</span>
              </div>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/80">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-xs font-semibold text-stone-600">Trạng thái:</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {invoice.status === 'Paid' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã thu tiền
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Chưa thu tiền
                  </>
                )}
              </span>
            </div>

            <button
              onClick={handleToggleStatus}
              disabled={isUpdating}
              className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center ${
                invoice.status === 'Paid'
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {invoice.status === 'Paid' ? 'Đổi thành Chưa thu' : 'Xác nhận Đã thu'}
            </button>
          </div>

          {/* Breakdown Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">
              Chi tiết các khoản phí
            </h4>
            <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
              {/* Tiền phòng */}
              <div className="flex justify-between items-center p-3 text-xs sm:text-sm">
                <span className="text-stone-700 font-semibold">Tiền phòng</span>
                <span className="font-bold text-stone-900">{formatNumber(invoice.rentCost)}đ</span>
              </div>

              {/* Tiền điện */}
              <div className="flex justify-between items-center p-3 text-xs sm:text-sm">
                <div>
                  <span className="text-stone-700 font-semibold block">Tiền điện</span>
                  {invoice.electricityUsage !== undefined && (
                    <span className="text-[11px] text-stone-400 font-semibold">
                      {invoice.electricityUsage} kWh
                    </span>
                  )}
                </div>
                <span className="font-bold text-stone-900">{formatNumber(invoice.electricityCost)}đ</span>
              </div>

              {/* Tiền nước */}
              <div className="flex justify-between items-center p-3 text-xs sm:text-sm">
                <div>
                  <span className="text-stone-700 font-semibold block">Tiền nước</span>
                  {invoice.waterUsage !== undefined && (
                    <span className="text-[11px] text-stone-400 font-semibold">
                      {invoice.waterUsage} m³
                    </span>
                  )}
                </div>
                <span className="font-bold text-stone-900">{formatNumber(invoice.waterCost)}đ</span>
              </div>

              {/* Dịch vụ khác */}
              {invoice.serviceCosts && invoice.serviceCosts.length > 0 && invoice.serviceCosts.map((sc, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 text-xs sm:text-sm">
                  <span className="text-stone-700 font-semibold">{sc.name}</span>
                  <span className="font-bold text-stone-900">{formatNumber(sc.cost)}đ</span>
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-between items-center p-3.5 sm:p-4 bg-emerald-50/70 font-bold text-sm sm:text-base text-stone-900">
                <span>Tổng cộng</span>
                <span className="text-emerald-700 text-base sm:text-lg font-black">{formatNumber(invoice.totalAmount)}đ</span>
              </div>
            </div>
          </div>

          {/* Text Template Preview / Copy */}
          {invoice.textTemplate && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Nội dung gửi tin nhắn
                </h4>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép tin nhắn</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 bg-stone-100 rounded-xl text-xs font-mono text-stone-700 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto border border-stone-200/60">
                {invoice.textTemplate}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm rounded-xl hover:bg-stone-300 transition-colors cursor-pointer text-center"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

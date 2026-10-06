import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Room, Invoice, formatNumber } from '../types';
import { Home, Users, FileText, AlertTriangle, TrendingUp, CheckCircle2, Trash2, Eye, Calculator } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import UtilityReadingModal from '../components/UtilityReadingModal';

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    const unsubRooms = firebaseService.subscribeRooms(setRooms);
    const unsubInvoices = firebaseService.subscribeInvoices((invs) => {
      setInvoices(invs);
      setSelectedInvoice(prev => prev ? invs.find(i => i.id === prev.id) || null : null);
    });
    return () => {
      unsubRooms();
      unsubInvoices();
    };
  }, []);

  const rentedRoomsCount = rooms.filter(r => r.status === 'Rented').length;
  const emptyRoomsCount = rooms.filter(r => r.status === 'Empty').length;
  const unpaidInvoicesCount = invoices.filter(i => i.status === 'Unpaid').length;

  const stats = [
    { 
      label: 'Tổng số phòng', 
      value: rooms.length, 
      icon: Home, 
      color: 'bg-blue-500',
      detail: 'Tất cả các phòng'
    },
    { 
      label: 'Phòng đã thuê', 
      value: rentedRoomsCount, 
      icon: Users, 
      color: 'bg-emerald-500',
      detail: 'Đang có người ở'
    },
    { 
      label: 'Phòng còn trống', 
      value: emptyRoomsCount, 
      icon: Home, 
      color: 'bg-amber-500',
      detail: 'Sẵn sàng cho thuê'
    },
    { 
      label: 'Hóa đơn chưa thu', 
      value: unpaidInvoicesCount, 
      icon: FileText, 
      color: 'bg-red-500',
      detail: 'Cần thu tiền'
    },
  ];

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Top Banner with Chốt số tháng này Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-emerald-900 text-white p-4 sm:p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-lg sm:text-2xl font-black tracking-tight">Tổng quan quản lý phòng trọ</h2>
          <p className="text-xs sm:text-sm font-semibold text-emerald-200 mt-0.5 sm:mt-1">
            Chốt số điện nước, quản lý doanh thu và theo dõi hóa đơn
          </p>
        </div>
        <button
          onClick={() => setIsReadingModalOpen(true)}
          className="relative z-10 w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white font-black px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all shrink-0 text-sm sm:text-base cursor-pointer"
        >
          <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Chốt số tháng này</span>
        </button>
        {/* Background glow */}
        <div className="absolute -right-10 -bottom-10 w-36 sm:w-40 h-36 sm:h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Stats Grid - 2 cols on phone, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-3.5 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className={`${stat.color} p-2 sm:p-2.5 rounded-xl text-white shadow-2xs`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-stone-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{stat.label}</h3>
            <p className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5 sm:mt-1">{formatNumber(stat.value)}</p>
            <p className="text-[11px] sm:text-xs text-stone-500 mt-1 font-semibold truncate">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* Recent Activity / Invoices */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base sm:text-lg">Hóa đơn gần đây</h3>
            <TrendingUp className="w-5 h-5 text-stone-400" />
          </div>
          <div className="divide-y divide-stone-100">
            {recentInvoices.length > 0 ? recentInvoices.map((invoice) => {
              const room = rooms.find(r => r.id === invoice.roomId);
              return (
                <div 
                  key={invoice.id} 
                  onClick={() => setSelectedInvoice(invoice)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0",
                      invoice.status === 'Paid' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    )}>
                      {invoice.status === 'Paid' ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 text-sm sm:text-base group-hover:text-emerald-600 transition-colors truncate">
                        Phòng {room?.name || 'N/A'} {invoice.tenantName ? `(${invoice.tenantName})` : ''}
                      </p>
                      <p className="text-xs text-stone-500 font-semibold">Tháng {invoice.month}/{invoice.year}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100/80">
                    <div className="text-left sm:text-right">
                      <p className="font-black text-stone-900 text-sm sm:text-base">{formatNumber(invoice.totalAmount)}đ</p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        invoice.status === 'Paid' ? "text-emerald-600" : "text-red-600"
                      )}>
                        {invoice.status === 'Paid' ? 'Đã thu' : 'Chưa thu'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="p-1.5 sm:p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                        title="Xem chi tiết hóa đơn"
                      >
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      {invoice.status === 'Unpaid' && (
                        <button 
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Xác nhận thu tiền',
                              message: 'Xác nhận đã thu tiền cho hóa đơn này?',
                              onConfirm: async () => {
                                await firebaseService.updateInvoiceStatus(invoice.id!, 'Paid');
                              }
                            });
                          }}
                          className="p-1.5 sm:p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                          title="Đánh dấu đã thu"
                        >
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Xác nhận xóa',
                            message: 'Xóa hóa đơn này?',
                            onConfirm: async () => {
                              await firebaseService.deleteInvoice(invoice.id!);
                            }
                          });
                        }}
                        className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg text-red-600"
                        title="Xóa hóa đơn"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-stone-400 font-semibold text-sm">
                Chưa có hóa đơn nào
              </div>
            )}
          </div>
        </div>

        {/* Room Status Overview */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-4 sm:p-6">
          <h3 className="font-bold text-stone-900 mb-4 sm:mb-6 text-base sm:text-lg">Trạng thái phòng</h3>
          <div className="space-y-4">
            {['Rented', 'Empty', 'Repairing'].map((status) => {
              const count = rooms.filter(r => r.status === status).length;
              const percentage = rooms.length > 0 ? (count / rooms.length) * 100 : 0;
              const label = status === 'Rented' ? 'Đã thuê' : status === 'Empty' ? 'Trống' : 'Đang sửa chữa';
              const color = status === 'Rented' ? 'bg-emerald-500' : status === 'Empty' ? 'bg-blue-500' : 'bg-amber-500';
              
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                    <span className="text-stone-700 font-semibold">{label}</span>
                    <span className="font-bold text-stone-900">{count} ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${percentage}%` }}
                      className={`h-full ${color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <UtilityReadingModal 
        isOpen={isReadingModalOpen}
        rooms={rooms}
        onClose={() => setIsReadingModalOpen(false)}
      />

      <InvoiceDetailModal 
        invoice={selectedInvoice}
        rooms={rooms}
        tenants={[]}
        onClose={() => setSelectedInvoice(null)}
      />

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

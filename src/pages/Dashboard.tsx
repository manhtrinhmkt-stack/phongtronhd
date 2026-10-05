import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Room, Tenant, Contract, UtilityReading, Invoice, Service, AppSettings, formatNumber } from '../types';
import { Home, Users, FileText, AlertTriangle, TrendingUp, CheckCircle2, Trash2 } from 'lucide-react';
import { format, isAfter, addDays, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import ConfirmModal from '../components/ConfirmModal';

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
    const unsubTenants = firebaseService.subscribeTenants(setTenants);
    const unsubContracts = firebaseService.subscribeContracts(setContracts);
    const unsubInvoices = firebaseService.subscribeInvoices(setInvoices);
    return () => {
      unsubRooms();
      unsubTenants();
      unsubContracts();
      unsubInvoices();
    };
  }, []);

  const stats = [
    { 
      label: 'Tổng số phòng', 
      value: rooms.length, 
      icon: Home, 
      color: 'bg-blue-500',
      detail: `${rooms.filter(r => r.status === 'Rented').length} đã thuê, ${rooms.filter(r => r.status === 'Empty').length} trống`
    },
    { 
      label: 'Khách thuê', 
      value: tenants.length, 
      icon: Users, 
      color: 'bg-emerald-500',
      detail: 'Hồ sơ khách hàng'
    },
    { 
      label: 'Hợp đồng sắp hết hạn', 
      value: contracts.filter(c => {
        if (c.status !== 'Active') return false;
        const end = parseISO(c.endDate);
        return isAfter(addDays(new Date(), 30), end) && isAfter(end, new Date());
      }).length, 
      icon: AlertTriangle, 
      color: 'bg-amber-500',
      detail: 'Trong 30 ngày tới'
    },
    { 
      label: 'Hóa đơn chưa thanh toán', 
      value: invoices.filter(i => i.status === 'Unpaid').length, 
      icon: FileText, 
      color: 'bg-red-500',
      detail: 'Cần thu tiền'
    },
  ];

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-xl text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-stone-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-2xl font-bold text-stone-900 mt-1">{formatNumber(stat.value)}</p>
            <p className="text-xs text-stone-400 mt-2">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity / Invoices */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900">Hóa đơn gần đây</h3>
            <TrendingUp className="w-5 h-5 text-stone-400" />
          </div>
          <div className="divide-y divide-stone-100">
            {recentInvoices.length > 0 ? recentInvoices.map((invoice) => {
              const room = rooms.find(r => r.id === invoice.roomId);
              return (
                <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      invoice.status === 'Paid' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    )}>
                      {invoice.status === 'Paid' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">Phòng {room?.name || 'N/A'}</p>
                      <p className="text-xs text-stone-500">Tháng {invoice.month}/{invoice.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-bold text-stone-900">{formatNumber(invoice.totalAmount)}đ</p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        invoice.status === 'Paid' ? "text-emerald-600" : "text-red-600"
                      )}>
                        {invoice.status === 'Paid' ? 'Đã thu' : 'Chưa thu'}
                      </p>
                    </div>
                    {invoice.status === 'Unpaid' && (
                      <div className="flex items-center gap-1">
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
                          className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                          title="Đánh dấu đã thu"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
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
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                          title="Xóa hóa đơn"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-stone-400">
                Chưa có hóa đơn nào
              </div>
            )}
          </div>
        </div>

        {/* Room Status Overview */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <h3 className="font-bold text-stone-900 mb-6">Trạng thái phòng</h3>
          <div className="space-y-4">
            {['Rented', 'Empty', 'Repairing'].map((status) => {
              const count = rooms.filter(r => r.status === status).length;
              const percentage = rooms.length > 0 ? (count / rooms.length) * 100 : 0;
              const label = status === 'Rented' ? 'Đã thuê' : status === 'Empty' ? 'Trống' : 'Đang sửa chữa';
              const color = status === 'Rented' ? 'bg-emerald-500' : status === 'Empty' ? 'bg-blue-500' : 'bg-amber-500';
              
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-600">{label}</span>
                    <span className="font-bold text-stone-900">{count} ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className={`h-full ${color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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

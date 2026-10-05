import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Contract, Room, Tenant, formatNumber } from '../types';
import { Plus, FileText, Calendar, DollarSign, AlertCircle, CheckCircle, X, Trash2 } from 'lucide-react';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import FormattedNumericInput from '../components/FormattedNumericInput';
import ConfirmModal from '../components/ConfirmModal';

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const [formData, setFormData] = useState<Omit<Contract, 'id'>>({
    roomId: '',
    tenantId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    deposit: 0,
    status: 'Active'
  });

  useEffect(() => {
    const unsubContracts = firebaseService.subscribeContracts(setContracts);
    const unsubRooms = firebaseService.subscribeRooms(setRooms);
    const unsubTenants = firebaseService.subscribeTenants(setTenants);
    return () => {
      unsubContracts();
      unsubRooms();
      unsubTenants();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await firebaseService.addContract(formData);
    closeModal();
  };

  const openModal = () => {
    setFormData({
      roomId: '',
      tenantId: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
      deposit: 0,
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const getRoomName = (id: string) => rooms.find(r => r.id === id)?.name || 'N/A';
  const getTenantName = (id: string) => tenants.find(t => t.id === id)?.name || 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-stone-900">Quản lý hợp đồng</h2>
        <button 
          onClick={openModal}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Tạo hợp đồng mới
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {contracts.map((contract) => {
          const isExpiring = contract.status === 'Active' && isAfter(addDays(new Date(), 30), parseISO(contract.endDate));
          
          return (
            <div key={contract.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  contract.status === 'Active' ? "bg-emerald-100 text-emerald-600" : "bg-stone-100 text-stone-400"
                )}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">Phòng {getRoomName(contract.roomId)} - {getTenantName(contract.tenantId)}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-stone-500">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(contract.startDate), 'dd/MM/yyyy')} - {format(parseISO(contract.endDate), 'dd/MM/yyyy')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-stone-500">
                      <DollarSign className="w-3 h-3" />
                      Cọc: {formatNumber(contract.deposit)}đ
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {isExpiring && (
                  <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-bold">
                    <AlertCircle className="w-3 h-3" />
                    Sắp hết hạn
                  </div>
                )}
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  contract.status === 'Active' ? "bg-emerald-100 text-emerald-600" : 
                  contract.status === 'Expired' ? "bg-red-100 text-red-600" : "bg-stone-100 text-stone-500"
                )}>
                  {contract.status === 'Active' ? 'Đang hiệu lực' : contract.status === 'Expired' ? 'Hết hạn' : 'Đã thanh lý'}
                </div>
                <button 
                  onClick={() => {
                    setConfirmConfig({
                      isOpen: true,
                      title: 'Xác nhận xóa',
                      message: 'Bạn có chắc chắn muốn xóa hợp đồng này? Phòng sẽ được chuyển về trạng thái Trống.',
                      onConfirm: async () => {
                        await firebaseService.deleteContract(contract.id!, contract.roomId);
                      }
                    });
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                  title="Xóa"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-900">Tạo hợp đồng điện tử</h3>
                <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Chọn phòng</label>
                  <select 
                    required
                    value={formData.roomId}
                    onChange={(e) => setFormData({...formData, roomId: e.target.value})}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Chọn phòng --</option>
                    {rooms.filter(r => r.status === 'Empty').map(room => (
                      <option key={room.id} value={room.id}>{room.name} ({formatNumber(room.price)}đ)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Chọn khách thuê</label>
                  <select 
                    required
                    value={formData.tenantId}
                    onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Chọn khách thuê --</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>{tenant.name} - {tenant.phone}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Ngày bắt đầu</label>
                    <input 
                      required
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Ngày kết thúc</label>
                    <input 
                      required
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tiền đặt cọc (đ)</label>
                  <FormattedNumericInput 
                    required
                    value={formData.deposit}
                    onChange={(val) => setFormData({...formData, deposit: val})}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 py-2 px-4 border border-stone-200 text-stone-600 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2 px-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                  >
                    Tạo hợp đồng
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

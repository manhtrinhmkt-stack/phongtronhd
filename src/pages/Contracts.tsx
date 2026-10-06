import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Contract, Room, Tenant, formatNumber, naturalCompare } from '../types';
import { Plus, Edit2, FileText, Calendar, DollarSign, AlertCircle, CheckCircle, X, Trash2 } from 'lucide-react';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import FormattedNumericInput from '../components/FormattedNumericInput';
import ConfirmModal from '../components/ConfirmModal';

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
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

  const openModal = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        roomId: contract.roomId,
        tenantId: contract.tenantId,
        startDate: contract.startDate,
        endDate: contract.endDate,
        deposit: contract.deposit,
        status: contract.status || 'Active'
      });
    } else {
      setEditingContract(null);
      setFormData({
        roomId: '',
        tenantId: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
        deposit: 0,
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContract(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomId || !formData.tenantId) return;

    if (editingContract?.id) {
      await firebaseService.updateContract(editingContract.id, formData, editingContract.roomId);
    } else {
      await firebaseService.addContract(formData);
    }
    
    closeModal();
  };

  // Sort contracts naturally by room name
  const sortedContracts = [...contracts].sort((a, b) => {
    const roomA = rooms.find(r => r.id === a.roomId)?.name || '';
    const roomB = rooms.find(r => r.id === b.roomId)?.name || '';
    return naturalCompare(roomA, roomB);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-stone-900">Danh sách hợp đồng</h3>
        <button 
          onClick={() => openModal()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Tạo hợp đồng mới
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Phòng</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Khách thuê</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Thời hạn</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Tiền cọc</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sortedContracts.map((contract) => {
                const room = rooms.find(r => r.id === contract.roomId);
                const tenant = tenants.find(t => t.id === contract.tenantId);
                const isExpiring = isAfter(addDays(new Date(), 30), parseISO(contract.endDate)) && contract.status === 'Active';

                return (
                  <tr key={contract.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-stone-900">Phòng {room?.name || '---'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-stone-700">{tenant?.name || '---'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-700 font-semibold">
                      {format(parseISO(contract.startDate), 'dd/MM/yyyy')} - {format(parseISO(contract.endDate), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 font-bold text-stone-900">
                      {formatNumber(contract.deposit)}đ
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        contract.status === 'Active' 
                          ? isExpiring ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          : contract.status === 'Terminated' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {contract.status === 'Active' ? (
                          isExpiring ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />
                        ) : null}
                        {contract.status === 'Active' 
                          ? (isExpiring ? 'Sắp hết hạn' : 'Đang hiệu lực') 
                          : contract.status === 'Terminated' ? 'Đã chấm dứt' : 'Hết hạn'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(contract)}
                          className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-700"
                          title="Sửa hợp đồng"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Xác nhận xóa',
                              message: 'Xóa hợp đồng này?',
                              onConfirm: async () => {
                                await firebaseService.deleteContract(contract.id!, contract.roomId);
                              }
                            });
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                          title="Xóa hợp đồng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedContracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-stone-500 font-semibold">
                    Chưa có hợp đồng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-stone-100">
          {sortedContracts.map((contract) => {
            const room = rooms.find(r => r.id === contract.roomId);
            const tenant = tenants.find(t => t.id === contract.tenantId);
            const isExpiring = isAfter(addDays(new Date(), 30), parseISO(contract.endDate)) && contract.status === 'Active';

            return (
              <div key={contract.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-stone-900">Phòng {room?.name || '---'}</h4>
                    <p className="text-sm font-semibold text-stone-600">{tenant?.name || '---'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      contract.status === 'Active' 
                        ? isExpiring ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        : contract.status === 'Terminated' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {contract.status === 'Active' ? (isExpiring ? 'Sắp hết hạn' : 'Hiệu lực') : contract.status === 'Terminated' ? 'Đã hủy' : 'Hết hạn'}
                    </span>
                    <button
                      onClick={() => openModal(contract)}
                      className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-700"
                      title="Sửa hợp đồng"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmConfig({
                          isOpen: true,
                          title: 'Xác nhận xóa',
                          message: 'Xóa hợp đồng này?',
                          onConfirm: async () => {
                            await firebaseService.deleteContract(contract.id!, contract.roomId);
                          }
                        });
                      }}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-stone-600 font-semibold space-y-1 pt-1 border-t border-stone-100">
                  <p>Thời hạn: {format(parseISO(contract.startDate), 'dd/MM/yy')} - {format(parseISO(contract.endDate), 'dd/MM/yy')}</p>
                  <p>Tiền cọc: <strong className="text-stone-900">{formatNumber(contract.deposit)}đ</strong></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">
                {editingContract ? 'Sửa thông tin hợp đồng' : 'Tạo hợp đồng mới'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Chọn phòng</label>
                <select 
                  required
                  value={formData.roomId}
                  onChange={(e) => setFormData({...formData, roomId: e.target.value})}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900"
                >
                  <option value="">-- Chọn phòng --</option>
                  {[...rooms]
                    .sort((a, b) => naturalCompare(a.name, b.name))
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        Phòng {r.name} ({r.status === 'Empty' ? 'Trống' : r.id === formData.roomId ? 'Hiện tại' : 'Đã thuê'})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Chọn đại diện khách thuê</label>
                <select 
                  required
                  value={formData.tenantId}
                  onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900"
                >
                  <option value="">-- Chọn khách thuê --</option>
                  {[...tenants]
                    .sort((a, b) => naturalCompare(a.name, b.name))
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name} - {t.phone}</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Ngày bắt đầu</label>
                  <input 
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Ngày kết thúc</label>
                  <input 
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Tiền đặt cọc (đ)</label>
                <FormattedNumericInput 
                  value={formData.deposit}
                  onChange={(val) => setFormData({...formData, deposit: val})}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Trạng thái hợp đồng</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900"
                >
                  <option value="Active">Đang hiệu lực</option>
                  <option value="Expired">Đã hết hạn</option>
                  <option value="Terminated">Đã chấm dứt</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 py-2.5 px-4 border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                >
                  {editingContract ? 'Cập nhật' : 'Tạo hợp đồng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

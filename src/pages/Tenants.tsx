import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Tenant } from '../types';
import { Plus, Edit2, Search, User, Phone, CreditCard, Users as UsersIcon, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from '../components/ConfirmModal';

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const [formData, setFormData] = useState<Omit<Tenant, 'id'>>({
    name: '',
    phone: '',
    idNumber: '',
    tempResidenceStatus: 'Chưa đăng ký',
    members: []
  });

  useEffect(() => {
    const unsub = firebaseService.subscribeTenants(setTenants);
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant?.id) {
      await firebaseService.updateTenant(editingTenant.id, formData);
    } else {
      await firebaseService.addTenant(formData);
    }
    closeModal();
  };

  const openModal = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        phone: tenant.phone,
        idNumber: tenant.idNumber || '',
        tempResidenceStatus: tenant.tempResidenceStatus || 'Chưa đăng ký',
        members: tenant.members || []
      });
    } else {
      setEditingTenant(null);
      setFormData({ name: '', phone: '', idNumber: '', tempResidenceStatus: 'Chưa đăng ký', members: [] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
  };

  const addMember = () => {
    setFormData({
      ...formData,
      members: [...(formData.members || []), { name: '', relation: '' }]
    });
  };

  const updateMember = (index: number, field: string, value: string) => {
    const newMembers = [...(formData.members || [])];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData({ ...formData, members: newMembers });
  };

  const removeMember = (index: number) => {
    const newMembers = [...(formData.members || [])];
    newMembers.splice(index, 1);
    setFormData({ ...formData, members: newMembers });
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm khách thuê..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Thêm khách thuê
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Khách thuê</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Liên hệ</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">CCCD</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Thành viên</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-stone-600" />
                      </div>
                      <span className="font-medium text-stone-900">{tenant.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-stone-600">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{tenant.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-stone-600">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">{tenant.idNumber || '---'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-stone-600">
                      <UsersIcon className="w-4 h-4" />
                      <span className="text-sm">{tenant.members?.length || 0} người</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openModal(tenant)}
                        className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Xác nhận xóa',
                            message: `Xóa khách thuê ${tenant.name}?`,
                            onConfirm: async () => {
                              await firebaseService.deleteTenant(tenant.id!);
                            }
                          });
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-stone-100">
          {filteredTenants.map((tenant) => (
            <div key={tenant.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-stone-600" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{tenant.name}</p>
                    <p className="text-xs text-stone-500">{tenant.tempResidenceStatus}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openModal(tenant)}
                    className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setConfirmConfig({
                        isOpen: true,
                        title: 'Xác nhận xóa',
                        message: `Xóa khách thuê ${tenant.name}?`,
                        onConfirm: async () => {
                          await firebaseService.deleteTenant(tenant.id!);
                        }
                      });
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-stone-600">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="text-xs">{tenant.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-600">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="text-xs">{tenant.idNumber || '---'}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-600">
                  <UsersIcon className="w-3.5 h-3.5" />
                  <span className="text-xs">{tenant.members?.length || 0} thành viên</span>
                </div>
              </div>
            </div>
          ))}
          {filteredTenants.length === 0 && (
            <div className="p-8 text-center text-stone-400 text-sm">
              Không tìm thấy khách thuê nào
            </div>
          )}
        </div>
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
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold text-stone-900">
                  {editingTenant ? 'Sửa thông tin khách thuê' : 'Thêm khách thuê mới'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-lg">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Họ và tên</label>
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Số điện thoại</label>
                    <input 
                      required
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Số CCCD</label>
                    <input 
                      type="text"
                      value={formData.idNumber}
                      onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Tạm trú tạm vắng</label>
                    <select 
                      value={formData.tempResidenceStatus}
                      onChange={(e) => setFormData({...formData, tempResidenceStatus: e.target.value})}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Chưa đăng ký">Chưa đăng ký</option>
                      <option value="Đã đăng ký">Đã đăng ký</option>
                      <option value="Đang xử lý">Đang xử lý</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-stone-900 flex items-center gap-2">
                      <UsersIcon className="w-4 h-4" />
                      Thành viên ở cùng
                    </h4>
                    <button 
                      type="button"
                      onClick={addMember}
                      className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm thành viên
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.members?.map((member, idx) => (
                      <div key={idx} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <input 
                            placeholder="Tên thành viên"
                            value={member.name}
                            onChange={(e) => updateMember(idx, 'name', e.target.value)}
                            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <input 
                            placeholder="Quan hệ"
                            value={member.relation}
                            onChange={(e) => updateMember(idx, 'relation', e.target.value)}
                            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeMember(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3 shrink-0">
                  {editingTenant && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setConfirmConfig({
                          isOpen: true,
                          title: 'Xác nhận xóa',
                          message: `Xóa khách thuê ${formData.name}?`,
                          onConfirm: async () => {
                            await firebaseService.deleteTenant(editingTenant.id!);
                            closeModal();
                          }
                        });
                      }}
                      className="flex-1 py-2 px-4 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors"
                    >
                      Xóa khách thuê
                    </button>
                  )}
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
                    {editingTenant ? 'Cập nhật' : 'Lưu'}
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

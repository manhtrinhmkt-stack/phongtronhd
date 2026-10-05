import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Room, formatNumber } from '../types';
import { Plus, Edit2, Trash2, Search, Filter, Home, FileText, Tag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FormattedNumericInput from '../components/FormattedNumericInput';
import ConfirmModal from '../components/ConfirmModal';

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  // Form state
  const [formData, setFormData] = useState<Omit<Room, 'id'>>({
    name: '',
    status: 'Empty',
    price: 0,
    note: ''
  });

  useEffect(() => {
    const unsub = firebaseService.subscribeRooms(setRooms);
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom?.id) {
      await firebaseService.updateRoom(editingRoom.id, formData);
    } else {
      await firebaseService.addRoom(formData);
    }
    closeModal();
  };

  const openModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        status: room.status,
        price: room.price,
        note: room.note || ''
      });
    } else {
      setEditingRoom(null);
      setFormData({ name: '', status: 'Empty', price: 0, note: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa phòng này?',
      onConfirm: async () => {
        await firebaseService.deleteRoom(id);
      }
    });
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Empty">Trống</option>
            <option value="Rented">Đã thuê</option>
            <option value="Repairing">Đang sửa chữa</option>
          </select>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Thêm phòng mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <motion.div 
            layout
            key={room.id}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                    <Home className="w-6 h-6 text-stone-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">Phòng {room.name}</h3>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                      room.status === 'Empty' ? "bg-blue-100 text-blue-600" : 
                      room.status === 'Rented' ? "bg-emerald-100 text-emerald-600" : 
                      "bg-amber-100 text-amber-600"
                    )}>
                      {room.status === 'Empty' ? 'Trống' : room.status === 'Rented' ? 'Đã thuê' : 'Sửa chữa'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(room)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(room.id!)} className="p-2 hover:bg-red-50 rounded-lg text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 mt-4">
                <div className="flex items-center gap-2 text-stone-600">
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-bold text-stone-900">{formatNumber(room.price)}đ</span>
                </div>
                {room.note && (
                  <div className="flex items-start gap-2 text-stone-600">
                    <FileText className="w-4 h-4 mt-0.5" />
                    <span className="text-sm text-stone-600 italic line-clamp-2">{room.note}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
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
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-900">
                  {editingRoom ? 'Sửa thông tin phòng' : 'Thêm phòng mới'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tên phòng / Số phòng</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="VD: 101, A1..."
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Giá thuê (đ/tháng)</label>
                    <FormattedNumericInput 
                      required
                      value={formData.price}
                      onChange={(val) => setFormData({...formData, price: val})}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Ghi chú</label>
                    <textarea 
                      value={formData.note}
                      onChange={(e) => setFormData({...formData, note: e.target.value})}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none"
                      placeholder="Ghi chú về phòng..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Trạng thái</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Empty">Trống</option>
                    <option value="Rented">Đã thuê</option>
                    <option value="Repairing">Đang sửa chữa</option>
                  </select>
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
                    {editingRoom ? 'Cập nhật' : 'Lưu'}
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

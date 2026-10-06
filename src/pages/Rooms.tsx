import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Room, formatNumber, naturalCompare } from '../types';
import { Plus, Edit2, Trash2, Search, Filter, Home, FileText, Tag, X, User, Phone, Zap, Droplets, Wifi, PlusCircle } from 'lucide-react';
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

  // State for adding a new service inside the room modal
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [newServiceUnit, setNewServiceUnit] = useState<'room' | 'person'>('room');

  // Form state
  const [formData, setFormData] = useState<Omit<Room, 'id'>>({
    name: '',
    status: 'Empty',
    price: 0,
    tenantName: '',
    tenantPhone: '',
    electricityRate: 3500,
    waterRate: 20000,
    waterCalculationMethod: 'usage',
    occupantCount: 1,
    services: [
      { name: 'Wifi', price: 100000, unit: 'room' },
      { name: 'Rác & Vệ sinh', price: 30000, unit: 'room' }
    ],
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
        name: room.name || '',
        status: room.status || 'Empty',
        price: room.price || 0,
        tenantName: room.tenantName || '',
        tenantPhone: room.tenantPhone || '',
        electricityRate: room.electricityRate ?? 3500,
        waterRate: room.waterRate ?? 20000,
        waterCalculationMethod: room.waterCalculationMethod || 'usage',
        occupantCount: room.occupantCount ?? 1,
        services: room.services || [
          { name: 'Wifi', price: 100000, unit: 'room' },
          { name: 'Rác & Vệ sinh', price: 30000, unit: 'room' }
        ],
        note: room.note || ''
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        status: 'Empty',
        price: 0,
        tenantName: '',
        tenantPhone: '',
        electricityRate: 3500,
        waterRate: 20000,
        waterCalculationMethod: 'usage',
        occupantCount: 1,
        services: [
          { name: 'Wifi', price: 100000, unit: 'room' },
          { name: 'Rác & Vệ sinh', price: 30000, unit: 'room' }
        ],
        note: ''
      });
    }
    setNewServiceName('');
    setNewServicePrice(0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
  };

  const handleAddServiceToRoom = () => {
    if (!newServiceName.trim()) return;
    const updatedServices = [...(formData.services || [])];
    updatedServices.push({
      name: newServiceName.trim(),
      price: newServicePrice,
      unit: newServiceUnit
    });
    setFormData({ ...formData, services: updatedServices });
    setNewServiceName('');
    setNewServicePrice(0);
  };

  const handleRemoveServiceFromRoom = (index: number) => {
    const updatedServices = [...(formData.services || [])];
    updatedServices.splice(index, 1);
    setFormData({ ...formData, services: updatedServices });
  };

  const filteredRooms = rooms
    .filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (room.tenantName && room.tenantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (room.tenantPhone && room.tenantPhone.includes(searchTerm)) ||
                            (room.note && room.note.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => naturalCompare(a.name, b.name));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Tìm theo tên phòng, người thuê, sđt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-sm text-stone-900 placeholder:font-normal placeholder-stone-400"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-stone-400 shrink-0" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-bold text-stone-700 outline-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Empty">Trống</option>
              <option value="Rented">Đã thuê</option>
              <option value="Repairing">Đang sửa</option>
            </select>
          </div>
        </div>

        <button 
          onClick={() => openModal()}
          className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-200/50 shrink-0 text-sm sm:text-base cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm phòng mới</span>
        </button>
      </div>

      {/* Grid Rooms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
        {filteredRooms.map((room) => {
          const statusBg = room.status === 'Rented' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                           room.status === 'Empty' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                           'bg-amber-50 text-amber-700 border-amber-200';
          const statusText = room.status === 'Rented' ? 'Đã thuê' :
                             room.status === 'Empty' ? 'Phòng trống' : 'Đang sửa';

          return (
            <div key={room.id} className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3.5">
              <div>
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
                      <Home className="w-5 h-5 text-emerald-600 shrink-0" />
                      Phòng {room.name}
                    </h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusBg}`}>
                    {statusText}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-stone-700 text-xs sm:text-sm font-semibold">
                    <Tag className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>Giá thuê: <strong className="text-stone-900 font-black">{formatNumber(room.price)}đ</strong>/tháng</span>
                  </div>

                  {/* Tenant info if rented */}
                  {room.status === 'Rented' && (
                    <div className="bg-emerald-50/70 p-2.5 sm:p-3 rounded-xl border border-emerald-100 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Người thuê: {room.tenantName || 'Chưa nhập tên'}</span>
                      </div>
                      {room.tenantPhone && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 pl-5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{room.tenantPhone}</span>
                        </div>
                      )}
                      {room.occupantCount && (
                        <div className="text-[11px] font-semibold text-emerald-600 pl-5">
                          Số người ở: {room.occupantCount} người
                        </div>
                      )}
                    </div>
                  )}

                  {/* Utility rates info */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs font-semibold bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    <div className="flex items-center gap-1.5 text-stone-700">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Điện: <strong className="text-stone-900">{formatNumber(room.electricityRate ?? 3500)}đ</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-700">
                      <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Nước: <strong className="text-stone-900">{formatNumber(room.waterRate ?? 20000)}đ</strong></span>
                    </div>
                  </div>

                  {/* Services tags */}
                  {room.services && room.services.length > 0 && (
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Dịch vụ đính kèm:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {room.services.map((srv, idx) => (
                          <span key={idx} className="bg-stone-100 text-stone-800 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border border-stone-200/60">
                            {srv.name}: {formatNumber(srv.price)}đ
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {room.note && (
                    <div className="flex items-start gap-2 text-stone-600 text-xs font-semibold bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                      <FileText className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{room.note}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-stone-100">
                <button 
                  onClick={() => openModal(room)}
                  className="p-2 hover:bg-stone-100 rounded-xl text-stone-700 font-semibold flex items-center gap-1 text-xs"
                  title="Cài đặt thông tin & Phí dịch vụ"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Sửa</span>
                </button>
                <button 
                  onClick={() => {
                    setConfirmConfig({
                      isOpen: true,
                      title: 'Xác nhận xóa',
                      message: `Xóa Phòng ${room.name}? Hành động này không thể hoàn tác.`,
                      onConfirm: async () => {
                        await firebaseService.deleteRoom(room.id!);
                      }
                    });
                  }}
                  className="p-2 hover:bg-red-50 rounded-xl text-red-600 font-semibold flex items-center gap-1 text-xs"
                  title="Xóa phòng"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          );
        })}
        {filteredRooms.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-stone-200 p-8 sm:p-12 text-center text-stone-500 font-semibold text-sm">
            Không tìm thấy phòng nào phù hợp
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-200 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-stone-100 flex justify-between items-center shrink-0 bg-stone-50/50">
              <h3 className="text-lg sm:text-xl font-bold text-stone-900">
                {editingRoom ? `Cài đặt Phòng ${editingRoom.name}` : 'Thêm phòng mới'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-stone-200/60 rounded-xl">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
              {/* SECTION 1: Thông tin cơ bản */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-100 pb-2">
                  <Home className="w-4 h-4 text-emerald-600" />
                  1. Thông tin cơ bản
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Tên/Số phòng</label>
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm"
                      placeholder="VD: 101, A1..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Trạng thái phòng</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm"
                    >
                      <option value="Empty">Trống</option>
                      <option value="Rented">Đã thuê</option>
                      <option value="Repairing">Đang sửa chữa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Giá thuê phòng (đ/tháng)</label>
                    <FormattedNumericInput 
                      required
                      value={formData.price}
                      onChange={(val) => setFormData({...formData, price: val})}
                      className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm"
                    />
                  </div>
                  {formData.status === 'Rented' && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Số người ở</label>
                      <input 
                        type="number"
                        min={1}
                        value={formData.occupantCount}
                        onChange={(e) => setFormData({...formData, occupantCount: Number(e.target.value)})}
                        className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: Người thuê (Nếu Đã Thuê) */}
              {formData.status === 'Rented' && (
                <div className="space-y-3.5 bg-emerald-50/50 p-3.5 sm:p-4 rounded-xl border border-emerald-100">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-200/60 pb-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    2. Thông tin người thuê
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Họ tên người thuê</label>
                      <input 
                        type="text"
                        value={formData.tenantName || ''}
                        onChange={(e) => setFormData({...formData, tenantName: e.target.value})}
                        placeholder="VD: Nguyễn Văn A"
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Số điện thoại</label>
                      <input 
                        type="text"
                        value={formData.tenantPhone || ''}
                        onChange={(e) => setFormData({...formData, tenantPhone: e.target.value})}
                        placeholder="VD: 0987654321"
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: Cài đặt Điện & Nước cho phòng này */}
              <div className="space-y-3.5 bg-stone-50 p-3.5 sm:p-4 rounded-xl border border-stone-200/80">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  3. Đơn giá Điện & Nước cho phòng này
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Đơn giá điện (đ/kWh)</label>
                    <FormattedNumericInput 
                      value={formData.electricityRate ?? 3500}
                      onChange={(val) => setFormData({...formData, electricityRate: val})}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Hình thức tính nước</label>
                    <select 
                      value={formData.waterCalculationMethod || 'usage'}
                      onChange={(e) => setFormData({...formData, waterCalculationMethod: e.target.value as any})}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900 text-sm"
                    >
                      <option value="usage">Tính theo khối (m³)</option>
                      <option value="person">Tính theo đầu người</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Đơn giá nước ({formData.waterCalculationMethod === 'person' ? 'đ/người' : 'đ/m³'})
                    </label>
                    <FormattedNumericInput 
                      value={formData.waterRate ?? 20000}
                      onChange={(val) => setFormData({...formData, waterRate: val})}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Phí dịch vụ đính kèm */}
              <div className="space-y-3.5 bg-stone-50 p-3.5 sm:p-4 rounded-xl border border-stone-200/80">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  4. Phí dịch vụ phòng (Wifi, Rác, Vệ sinh...)
                </h4>

                <div className="space-y-2">
                  {formData.services && formData.services.length > 0 ? (
                    formData.services.map((srv, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-xl border border-stone-200">
                        <div>
                          <span className="font-bold text-stone-900 text-xs sm:text-sm block">{srv.name}</span>
                          <span className="text-xs font-semibold text-stone-500">
                            {formatNumber(srv.price)}đ /{srv.unit === 'person' ? 'người' : 'phòng'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceFromRoom(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa dịch vụ này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-500 italic">Chưa có dịch vụ nào đính kèm cho phòng này.</p>
                  )}
                </div>

                {/* Add new service form inline */}
                <div className="pt-3 border-t border-stone-200/60 space-y-2">
                  <span className="text-xs font-bold text-stone-700 block">Thêm dịch vụ cho phòng:</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      placeholder="Tên dịch vụ (VD: Wifi, Rác)"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900"
                    />
                    <div className="flex gap-2">
                      <FormattedNumericInput 
                        placeholder="Giá tiền (đ)"
                        value={newServicePrice}
                        onChange={(val) => setNewServicePrice(val)}
                        className="w-28 sm:w-32 px-3 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900"
                      />
                      <select
                        value={newServiceUnit}
                        onChange={(e) => setNewServiceUnit(e.target.value as any)}
                        className="px-2 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900"
                      >
                        <option value="room">/ phòng</option>
                        <option value="person">/ người</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddServiceToRoom}
                        className="px-3 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 shrink-0 text-xs"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Thêm</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Ghi chú</label>
                <textarea 
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none font-semibold text-stone-900 text-sm"
                  placeholder="Ghi chú về phòng..."
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 py-2.5 px-4 border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors text-sm"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200 text-sm"
                >
                  {editingRoom ? 'Lưu thay đổi' : 'Tạo phòng'}
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

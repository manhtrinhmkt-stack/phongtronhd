import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Room, UtilityReading, Invoice, Service, AppSettings, Tenant, formatNumber } from '../types';
import { Plus, Zap, Droplets, FileText, Calculator, Copy, CheckCircle, Settings, X, Trash2, Wifi, Trash, User, Droplet, CreditCard, Users } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import FormattedNumericInput from '../components/FormattedNumericInput';
import ConfirmModal from '../components/ConfirmModal';

export default function Utilities() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    electricityRate: 3500, 
    waterRate: 20000,
    waterCalculationMethod: 'usage'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const [newService, setNewService] = useState<Omit<Service, 'id'>>({
    name: '',
    price: 0,
    unit: 'room'
  });

  const [formData, setFormData] = useState<Omit<UtilityReading, 'id'>>({
    roomId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    electricityStart: 0,
    electricityEnd: 0,
    waterStart: 0,
    waterEnd: 0,
    occupantCount: 1,
    waterCalculationMethod: 'usage',
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    const unsubRooms = firebaseService.subscribeRooms(setRooms);
    const unsubTenants = firebaseService.subscribeTenants(setTenants);
    const unsubReadings = firebaseService.subscribeUtilityReadings(setReadings);
    const unsubServices = firebaseService.subscribeServices(setServices);
    firebaseService.getSettings().then(s => {
      setSettings(s);
      setFormData(prev => ({ ...prev, waterCalculationMethod: s.waterCalculationMethod }));
    });
    return () => {
      unsubRooms();
      unsubTenants();
      unsubReadings();
      unsubServices();
    };
  }, []);

  const handleRoomChange = (roomId: string) => {
    const lastReading = readings.find(r => r.roomId === roomId);
    const room = rooms.find(r => r.id === roomId);
    const tenant = tenants.find(t => t.id === room?.currentTenantId);
    const occupantCount = tenant ? (tenant.members?.length || 0) + 1 : 1;

    setFormData({
      ...formData,
      roomId,
      electricityStart: lastReading ? lastReading.electricityEnd : 0,
      waterStart: lastReading ? lastReading.waterEnd : 0,
      electricityEnd: lastReading ? lastReading.electricityEnd : 0,
      waterEnd: lastReading ? lastReading.waterEnd : 0,
      occupantCount,
      waterCalculationMethod: 'person',
    });
    // Default select all services
    setSelectedServiceIds(services.map(s => s.id!));
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await firebaseService.addService(newService);
      setIsServiceModalOpen(false);
      setNewService({ name: '', price: 0, unit: 'room' });
    } catch (error) {
      console.error("Error adding service:", error);
      alert("Có lỗi xảy ra khi thêm dịch vụ. Vui lòng kiểm tra lại thông tin và thử lại.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find(r => r.id === formData.roomId);
    const tenant = tenants.find(t => t.id === room?.currentTenantId);
    
    if (!room || !tenant) return;

    // 1. Add reading
    await firebaseService.addUtilityReading(formData);

    // 2. Calculate costs
    const electricityUsage = formData.electricityEnd - formData.electricityStart;
    const waterUsage = formData.waterEnd - formData.waterStart;
    const electricityCost = electricityUsage * settings.electricityRate;
    
    let waterCost = 0;
    const occupantCount = formData.occupantCount || (tenant.members?.length || 0) + 1;
    if (formData.waterCalculationMethod === 'person') {
      waterCost = occupantCount * settings.waterRate;
    } else {
      waterCost = waterUsage * settings.waterRate;
    }

    // 3. Service costs
    const selectedServices = services.filter(s => selectedServiceIds.includes(s.id!));
    const serviceCosts = selectedServices.map(s => {
      let cost = s.price;
      if (s.unit === 'person') cost *= occupantCount;
      return { name: s.name, cost, unit: s.unit, price: s.price, occupantCount };
    });

    const totalServices = serviceCosts.reduce((acc, s) => acc + s.cost, 0);
    const totalAmount = room.price + electricityCost + waterCost + totalServices;

    // 4. Generate text template
    const waterDetail = formData.waterCalculationMethod === 'person' 
      ? `${occupantCount} người x ${formatNumber(settings.waterRate)}đ = ${formatNumber(waterCost)}đ`
      : `${waterUsage} khối x ${formatNumber(settings.waterRate)}đ = ${formatNumber(waterCost)}đ (Chỉ số: ${formData.waterStart} -> ${formData.waterEnd})`;

    const serviceDetails = serviceCosts.map(s => {
      if (s.unit === 'room') {
        return `   - ${s.name}: ${formatNumber(s.cost)}đ`;
      }
      return `   - ${s.name}: ${formatNumber(s.price)}đ x ${s.unit === 'person' ? `${s.occupantCount} người` : '1 phòng'} = ${formatNumber(s.cost)}đ`;
    }).join('\n');

    const formattedBankNumber = settings.bankAccountNumber?.replace(/(\d{4})(\d{3})(\d+)/, '$1 $2 $3') || settings.bankAccountNumber;

    const bankInfo = settings.bankAccountNumber ? `----------------------------------
THÔNG TIN CHUYỂN KHOẢN:
- Ngân hàng: ${settings.bankName}
- Số TK: ${formattedBankNumber}
- Chủ tài khoản: ${settings.bankAccountName}
- Nội dung: Thanh toan phong ${room.name} thang ${formData.month}` : '';

    const textTemplate = `
HÓA ĐƠN TIỀN PHÒNG ${room.name} - THÁNG ${formData.month}/${formData.year}
----------------------------------
1. Tiền phòng: ${formatNumber(room.price)}đ
2. Tiền điện: ${electricityUsage} kWh x ${formatNumber(settings.electricityRate)}đ = ${formatNumber(electricityCost)}đ
   (Chỉ số: ${formData.electricityStart} -> ${formData.electricityEnd})
3. Tiền nước: ${waterDetail}
4. Dịch vụ khác:
${serviceDetails}
----------------------------------
TỔNG CỘNG: ${formatNumber(totalAmount)}đ
${bankInfo}
    `.trim();

    // 5. Create invoice
    await firebaseService.addInvoice({
      roomId: formData.roomId,
      tenantId: tenant.id!,
      month: formData.month,
      year: formData.year,
      rentCost: room.price,
      electricityCost,
      waterCost,
      waterUsage: formData.waterCalculationMethod === 'usage' ? waterUsage : occupantCount,
      electricityUsage,
      waterCalculationMethod: formData.waterCalculationMethod,
      serviceCosts,
      totalAmount,
      status: 'Unpaid',
      textTemplate
    });

    closeModal();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-stone-900">Chốt điện nước & Hóa đơn</h2>
          <button 
            onClick={() => setIsServiceModalOpen(true)}
            className="p-2 hover:bg-stone-100 rounded-lg text-emerald-600 flex items-center gap-2 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Thêm dịch vụ (Wifi, Rác...)
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-500"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          <Calculator className="w-5 h-5" />
          Chốt số tháng này
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Phòng</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Tháng/Năm</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Điện (kWh)</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Nước (Khối)</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {Object.entries(readings.reduce((acc, reading) => {
                const key = `${reading.year}-${String(reading.month).padStart(2, '0')}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(reading);
                return acc;
              }, {} as Record<string, UtilityReading[]>))
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([key, monthReadings]) => {
                  const [year, month] = key.split('-');
                  return (
                    <React.Fragment key={key}>
                      <tr className="bg-stone-100">
                        <td colSpan={5} className="px-6 py-2 font-bold text-stone-700">Tháng {Number(month)}/{year}</td>
                      </tr>
                      {monthReadings.map((reading) => {
                        const room = rooms.find(r => r.id === reading.roomId);
                        return (
                          <tr key={reading.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-stone-900">Phòng {room?.name}</td>
                            <td className="px-6 py-4 text-stone-600">{reading.month}/{reading.year}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-amber-600">
                                <Zap className="w-4 h-4" />
                                <span className="text-sm font-bold">{reading.electricityEnd - reading.electricityStart}</span>
                                <span className="text-[10px] text-stone-400">({reading.electricityStart} → {reading.electricityEnd})</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-blue-600">
                                {reading.occupantCount && reading.waterEnd === reading.waterStart ? (
                                  <>
                                    <Users className="w-4 h-4" />
                                    <span className="text-sm font-bold">{reading.occupantCount} người</span>
                                  </>
                                ) : (
                                  <>
                                    <Droplets className="w-4 h-4" />
                                    <span className="text-sm font-bold">{reading.waterEnd - reading.waterStart}</span>
                                    <span className="text-[10px] text-stone-400">({reading.waterStart} → {reading.waterEnd})</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    const inv = firebaseService.subscribeInvoices(invoices => {
                                      const invoice = invoices.find(i => i.roomId === reading.roomId && i.month === reading.month && i.year === reading.year);
                                      if (invoice) copyToClipboard(invoice.textTemplate, reading.id!);
                                    });
                                  }}
                                  className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 relative"
                                  title="Copy mẫu tin nhắn"
                                >
                                  {copiedId === reading.id ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                  {copiedId === reading.id && (
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                      Đã copy!
                                    </span>
                                  )}
                                </button>
                                <button 
                                  onClick={() => {
                                    setConfirmConfig({
                                      isOpen: true,
                                      title: 'Xác nhận xóa',
                                      message: 'Bạn có chắc chắn muốn xóa chốt số này?',
                                      onConfirm: async () => {
                                        await firebaseService.deleteUtilityReading(reading.id!);
                                      }
                                    });
                                  }}
                                  className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-stone-100">
          {Object.entries(readings.reduce((acc, reading) => {
            const key = `${reading.year}-${String(reading.month).padStart(2, '0')}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(reading);
            return acc;
          }, {} as Record<string, UtilityReading[]>))
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([key, monthReadings]) => {
              const [year, month] = key.split('-');
              return (
                <div key={key}>
                  <div className="bg-stone-100 px-4 py-2 font-bold text-stone-700">Tháng {Number(month)}/{year}</div>
                  {monthReadings.map((reading) => {
                    const room = rooms.find(r => r.id === reading.roomId);
                    return (
                      <div key={reading.id} className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-stone-900 text-lg">Phòng {room?.name}</p>
                            <p className="text-xs text-stone-500">Tháng {reading.month}/{reading.year}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                const inv = firebaseService.subscribeInvoices(invoices => {
                                  const invoice = invoices.find(i => i.roomId === reading.roomId && i.month === reading.month && i.year === reading.year);
                                  if (invoice) copyToClipboard(invoice.textTemplate, reading.id!);
                                });
                              }}
                              className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 relative"
                            >
                              {copiedId === reading.id ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                              {copiedId === reading.id && (
                                <span className="absolute -top-8 right-0 bg-stone-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                  Đã copy!
                                </span>
                              )}
                            </button>
                            <button 
                              onClick={() => {
                                setConfirmConfig({
                                  isOpen: true,
                                  title: 'Xác nhận xóa',
                                  message: 'Bạn có chắc chắn muốn xóa chốt số này?',
                                  onConfirm: async () => {
                                    await firebaseService.deleteUtilityReading(reading.id!);
                                  }
                                });
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                            <div className="flex items-center gap-2 text-amber-600 mb-1">
                              <Zap className="w-4 h-4" />
                              <span className="text-xs font-bold">Điện</span>
                            </div>
                            <p className="text-lg font-bold text-stone-900">{reading.electricityEnd - reading.electricityStart} <span className="text-xs font-normal text-stone-500">kWh</span></p>
                            <p className="text-[10px] text-stone-400">{reading.electricityStart} → {reading.electricityEnd}</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2 text-blue-600 mb-1">
                              {reading.occupantCount && reading.waterEnd === reading.waterStart ? <Users className="w-4 h-4" /> : <Droplets className="w-4 h-4" />}
                              <span className="text-xs font-bold">Nước</span>
                            </div>
                            {reading.occupantCount && reading.waterEnd === reading.waterStart ? (
                              <p className="text-lg font-bold text-stone-900">{reading.occupantCount} <span className="text-xs font-normal text-stone-500">Người</span></p>
                            ) : (
                              <>
                                <p className="text-lg font-bold text-stone-900">{reading.waterEnd - reading.waterStart} <span className="text-xs font-normal text-stone-500">Khối</span></p>
                                <p className="text-[10px] text-stone-400">{reading.waterStart} → {reading.waterEnd}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          {readings.length === 0 && (
            <div className="p-8 text-center text-stone-400 text-sm">
              Chưa có dữ liệu chốt số
            </div>
          )}
        </div>
      </div>

      {/* Chốt số Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] pb-20"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-900">Chốt số & Xuất hóa đơn</h3>
                <button onClick={closeModal} className="p-2 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Tháng</label>
                    <input type="number" value={formData.month} onChange={(e) => setFormData({...formData, month: Number(e.target.value)})} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Năm</label>
                    <input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: Number(e.target.value)})} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Chọn phòng</label>
                  <select required value={formData.roomId} onChange={(e) => handleRoomChange(e.target.value)} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">-- Chọn phòng --</option>
                    {rooms
                      .filter(r => r.status === 'Rented')
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(room => (
                        <option key={room.id} value={room.id}>{room.name}</option>
                      ))}
                  </select>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-3">
                  <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2"><Zap className="w-4 h-4" /> Chỉ số điện (kWh)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-600 uppercase">Số cũ</label>
                      <FormattedNumericInput value={formData.electricityStart} onChange={(val) => setFormData({...formData, electricityStart: val})} className="w-full px-3 py-1.5 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-600 uppercase">Số mới</label>
                      <FormattedNumericInput value={formData.electricityEnd} onChange={(val) => setFormData({...formData, electricityEnd: val})} className="w-full px-3 py-1.5 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2"><Droplets className="w-4 h-4" /> Chỉ số nước</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="p-2 bg-white/50 rounded-lg border border-blue-100 text-xs text-blue-700">
                      Tính theo đầu người: {formatNumber(settings.waterRate)}đ/người
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-blue-600 uppercase">Số người ở</label>
                      <input 
                        type="number" 
                        value={formData.occupantCount} 
                        onChange={(e) => setFormData({...formData, occupantCount: Number(e.target.value)})} 
                        className="w-full px-4 py-2 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-stone-700">Dịch vụ sử dụng</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {services.map(s => (
                      <label key={s.id} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg border border-stone-100 cursor-pointer hover:bg-stone-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedServiceIds.includes(s.id!)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServiceIds([...selectedServiceIds, s.id!]);
                            } else {
                              setSelectedServiceIds(selectedServiceIds.filter(id => id !== s.id));
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span className="text-xs font-medium text-stone-700">{s.name} ({formatNumber(s.price)}đ)</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 py-2 px-4 border border-stone-200 text-stone-600 font-semibold rounded-xl hover:bg-stone-50 transition-colors">Hủy</button>
                  <button type="submit" className="flex-1 py-2 px-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">Tính tiền & Xuất hóa đơn</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Service Modal */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsServiceModalOpen(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-900">Quản lý dịch vụ</h3>
                <button onClick={() => setIsServiceModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  {services.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 group">
                      <div>
                        <p className="font-bold text-stone-900">{s.name}</p>
                        <p className="text-xs text-stone-500">{formatNumber(s.price)}đ / {s.unit === 'person' ? 'người' : 'phòng'}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Xác nhận xóa',
                            message: `Xóa dịch vụ ${s.name}?`,
                            onConfirm: async () => {
                              await firebaseService.deleteService(s.id!);
                            }
                          });
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddService} className="pt-4 border-t border-stone-100 space-y-4">
                  <h4 className="font-bold text-stone-900 text-sm">Thêm dịch vụ mới</h4>
                  <input required placeholder="Tên dịch vụ (Wifi, Rác...)" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormattedNumericInput placeholder="Giá tiền" value={newService.price} onChange={(val) => setNewService({...newService, price: val})} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                    <select value={newService.unit} onChange={(e) => setNewService({...newService, unit: e.target.value as any})} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="room">Theo phòng</option>
                      <option value="person">Theo người</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2 px-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors">Thêm</button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-stone-900">Cài đặt biểu giá</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Giá điện (đ/kWh)</label>
                  <FormattedNumericInput value={settings.electricityRate} onChange={(val) => setSettings({...settings, electricityRate: val})} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Giá nước (đ/Người)</label>
                  <FormattedNumericInput value={settings.waterRate} onChange={(val) => setSettings({...settings, waterRate: val})} className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Thông tin chuyển khoản
                  </label>
                  <div className="space-y-3 p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Tên ngân hàng</label>
                      <input 
                        type="text"
                        value={settings.bankName || ''}
                        onChange={(e) => setSettings({...settings, bankName: e.target.value})}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="VD: Vietcombank, MB Bank..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Số tài khoản</label>
                      <input 
                        type="text"
                        value={settings.bankAccountNumber || ''}
                        onChange={(e) => setSettings({...settings, bankAccountNumber: e.target.value})}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="Nhập số tài khoản..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Chủ tài khoản</label>
                      <input 
                        type="text"
                        value={settings.bankAccountName || ''}
                        onChange={(e) => setSettings({...settings, bankAccountName: e.target.value})}
                        className="w-full px-3 py-1.5 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="Tên người nhận..."
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    await firebaseService.updateSettings(settings);
                    setIsSettingsOpen(false);
                  }}
                  className="w-full py-2 px-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Lưu cài đặt
                </button>
              </div>
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

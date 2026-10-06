import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Room, UtilityReading, Service, AppSettings, formatNumber, naturalCompare } from '../types';
import { Plus, Zap, Droplets, Calculator, Settings, X, Trash2, CreditCard, RefreshCw, CheckCircle2, Wifi } from 'lucide-react';
import FormattedNumericInput from '../components/FormattedNumericInput';
import ConfirmModal from '../components/ConfirmModal';

export default function Utilities() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [globalServices, setGlobalServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    electricityRate: 3500, 
    waterRate: 20000,
    waterCalculationMethod: 'usage'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

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

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let readingsLoaded = false;
    const unsubRooms = firebaseService.subscribeRooms(setRooms);
    const unsubReadings = firebaseService.subscribeUtilityReadings((r) => {
      setReadings(r);
      if (!readingsLoaded) {
        readingsLoaded = true;
        setLoading(false);
      }
    });
    const unsubServices = firebaseService.subscribeServices(setGlobalServices);
    const unsubSettings = firebaseService.subscribeSettings((s) => {
      setSettings(s);
      setFormData(prev => ({ ...prev, waterCalculationMethod: s.waterCalculationMethod }));
    });
    return () => {
      unsubRooms();
      unsubReadings();
      unsubServices();
      unsubSettings();
    };
  }, []);

  const handleRoomChange = (roomId: string) => {
    const lastReading = readings.find(r => r.roomId === roomId);
    const room = rooms.find(r => r.id === roomId);
    const occupantCount = room?.occupantCount || 1;

    setFormData({
      ...formData,
      roomId,
      electricityStart: lastReading ? lastReading.electricityEnd : 0,
      waterStart: lastReading ? lastReading.waterEnd : 0,
      electricityEnd: lastReading ? lastReading.electricityEnd : 0,
      waterEnd: lastReading ? lastReading.waterEnd : 0,
      occupantCount,
      waterCalculationMethod: room?.waterCalculationMethod || settings.waterCalculationMethod || 'usage',
    });
  };

  const handleAddGlobalService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name.trim()) return;
    try {
      await firebaseService.addService(newService);
      setNewService({ name: '', price: 0, unit: 'room' });
      setSyncNotice('Đã thêm dịch vụ mẫu mới!');
      setTimeout(() => setSyncNotice(null), 3000);
    } catch (error) {
      console.error("Error adding service:", error);
    }
  };

  const handleSaveSettingsAndSync = async (syncAllRooms: boolean) => {
    await firebaseService.updateSettings(settings);
    if (syncAllRooms) {
      await firebaseService.syncGlobalToAllRooms(settings, globalServices);
      setSyncNotice('Đã lưu cài đặt & đồng bộ thành công sang tất cả các phòng!');
    } else {
      setSyncNotice('Đã lưu cài đặt mẫu!');
    }
    setIsSettingsOpen(false);
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find(r => r.id === formData.roomId);
    if (!room) return;

    // 1. Add reading
    await firebaseService.addUtilityReading(formData);

    // 2. Determine rates (Room-specific or Global default)
    const electricityRate = room.electricityRate ?? settings.electricityRate ?? 3500;
    const waterRate = room.waterRate ?? settings.waterRate ?? 20000;
    const waterCalcMethod = formData.waterCalculationMethod || room.waterCalculationMethod || settings.waterCalculationMethod || 'usage';

    // 3. Calculate electricity & water costs
    const electricityUsage = Math.max(0, formData.electricityEnd - formData.electricityStart);
    const waterUsage = Math.max(0, formData.waterEnd - formData.waterStart);
    const electricityCost = electricityUsage * electricityRate;
    
    let waterCost = 0;
    const occupantCount = formData.occupantCount || room.occupantCount || 1;
    if (waterCalcMethod === 'person') {
      waterCost = occupantCount * waterRate;
    } else {
      waterCost = waterUsage * waterRate;
    }

    // 4. Calculate service costs
    const activeServices = (room.services && room.services.length > 0) 
      ? room.services 
      : globalServices;

    const serviceCosts = activeServices.map(s => {
      let cost = s.price;
      if (s.unit === 'person') cost *= occupantCount;
      return { name: s.name, cost, unit: s.unit, price: s.price, occupantCount };
    });

    const totalServices = serviceCosts.reduce((acc, s) => acc + s.cost, 0);
    const totalAmount = room.price + electricityCost + waterCost + totalServices;

    // 5. Generate text template
    const waterDetail = waterCalcMethod === 'person' 
      ? `${occupantCount} người x ${formatNumber(waterRate)}đ = ${formatNumber(waterCost)}đ`
      : `${waterUsage} khối x ${formatNumber(waterRate)}đ = ${formatNumber(waterCost)}đ (Chỉ số: ${formData.waterStart} -> ${formData.waterEnd})`;

    const serviceDetails = serviceCosts.length > 0 
      ? serviceCosts.map(s => {
          if (s.unit === 'room') {
            return `   - ${s.name}: ${formatNumber(s.cost)}đ`;
          }
          return `   - ${s.name}: ${formatNumber(s.price)}đ x ${s.occupantCount} người = ${formatNumber(s.cost)}đ`;
        }).join('\n')
      : '   - Không có';

    const formattedBankNumber = settings.bankAccountNumber?.replace(/(\d{4})(\d{3})(\d+)/, '$1 $2 $3') || settings.bankAccountNumber;

    const bankInfo = settings.bankAccountNumber ? `----------------------------------
THÔNG TIN CHUYỂN KHOẢN:
- Ngân hàng: ${settings.bankName}
- Số TK: ${formattedBankNumber}
- Chủ tài khoản: ${settings.bankAccountName}
- Nội dung: Thanh toan phong ${room.name} thang ${formData.month}` : '';

    const tenantInfoText = room.tenantName ? ` (${room.tenantName})` : '';

    const textTemplate = `
HÓA ĐƠN TIỀN PHÒNG ${room.name}${tenantInfoText} - THÁNG ${formData.month}/${formData.year}
----------------------------------
1. Tiền phòng: ${formatNumber(room.price)}đ
2. Tiền điện: ${electricityUsage} kWh x ${formatNumber(electricityRate)}đ = ${formatNumber(electricityCost)}đ
   (Chỉ số: ${formData.electricityStart} -> ${formData.electricityEnd})
3. Tiền nước: ${waterDetail}
4. Dịch vụ khác:
${serviceDetails}
----------------------------------
TỔNG CỘNG: ${formatNumber(totalAmount)}đ
${bankInfo}
    `.trim();

    // 6. Create invoice
    await firebaseService.addInvoice({
      roomId: formData.roomId,
      tenantName: room.tenantName || 'Khách thuê',
      month: formData.month,
      year: formData.year,
      rentCost: room.price,
      electricityCost,
      waterCost,
      waterUsage: waterCalcMethod === 'usage' ? waterUsage : occupantCount,
      electricityUsage,
      waterCalculationMethod: waterCalcMethod,
      serviceCosts,
      totalAmount,
      status: 'Unpaid',
      textTemplate
    });

    closeModal();
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notice */}
      {syncNotice && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900">Chốt điện nước & Hóa đơn</h2>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl text-stone-800 flex items-center gap-2 text-xs sm:text-sm font-bold shadow-2xs transition-colors cursor-pointer"
            title="Cài đặt Biểu giá, Dịch vụ mẫu & Ngân hàng"
          >
            <Settings className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cài đặt biểu giá & Dịch vụ</span>
          </button>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-200 shrink-0 text-sm sm:text-base cursor-pointer"
        >
          <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Chốt số tháng này</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Phòng</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Tháng/Năm</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Điện (kWh)</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Nước</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider text-right">Thao tác</th>
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
                .map(([key, groupReadings]) => {
                  const [year, month] = key.split('-');
                  const sortedGroup = [...groupReadings].sort((a, b) => {
                    const roomA = rooms.find(r => r.id === a.roomId)?.name || '';
                    const roomB = rooms.find(r => r.id === b.roomId)?.name || '';
                    return naturalCompare(roomA, roomB);
                  });

                  return (
                    <React.Fragment key={key}>
                      <tr className="bg-stone-100/70 border-y border-stone-200/60">
                        <td colSpan={5} className="px-6 py-2.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
                          📅 Tháng {parseInt(month, 10)} / {year}
                        </td>
                      </tr>
                      {sortedGroup.map((reading) => {
                        const room = rooms.find(r => r.id === reading.roomId);
                        const elecUsage = reading.electricityEnd - reading.electricityStart;
                        const waterUsage = reading.waterEnd - reading.waterStart;

                        return (
                          <tr key={reading.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-bold text-stone-900">Phòng {room?.name || '...'}</span>
                              {room?.tenantName && (
                                <span className="block text-xs font-semibold text-stone-500">{room.tenantName}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-stone-700">
                              Tháng {reading.month}/{reading.year}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-stone-800">
                              <span className="font-bold text-amber-600">{elecUsage} kWh</span>
                              <span className="block text-[11px] text-stone-400 font-normal">{reading.electricityStart} → {reading.electricityEnd}</span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-stone-800">
                              {reading.occupantCount && reading.waterEnd === reading.waterStart ? (
                                <span className="font-bold text-blue-600">{reading.occupantCount} người</span>
                              ) : (
                                <>
                                  <span className="font-bold text-blue-600">{waterUsage} m³</span>
                                  <span className="block text-[11px] text-stone-400 font-normal">{reading.waterStart} → {reading.waterEnd}</span>
                                </>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => {
                                  setConfirmConfig({
                                    isOpen: true,
                                    title: 'Xác nhận xóa',
                                    message: 'Xóa bản ghi chốt số này?',
                                    onConfirm: async () => {
                                      await firebaseService.deleteUtilityReading(reading.id!);
                                    }
                                  });
                                }}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 cursor-pointer"
                                title="Xóa chỉ số"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-400 font-semibold animate-pulse">
                    Đang tải dữ liệu chốt số...
                  </td>
                </tr>
              )}

              {!loading && readings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-500 font-semibold">
                    Chưa có bản ghi chốt số nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-stone-100">
          {loading ? (
            <div className="p-6 text-center text-stone-400 font-semibold animate-pulse text-sm">
              Đang tải dữ liệu chốt số...
            </div>
          ) : readings.map((reading) => {
            const room = rooms.find(r => r.id === reading.roomId);
            const elecUsage = reading.electricityEnd - reading.electricityStart;
            const waterUsage = reading.waterEnd - reading.waterStart;

            return (
              <div key={reading.id} className="p-3.5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">
                      Phòng {room?.name || '...'} {room?.tenantName ? `(${room.tenantName})` : ''}
                    </h4>
                    <p className="text-xs text-stone-500 font-semibold">Tháng {reading.month}/{reading.year}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setConfirmConfig({
                        isOpen: true,
                        title: 'Xác nhận xóa',
                        message: 'Xóa bản ghi chốt số này?',
                        onConfirm: async () => {
                          await firebaseService.deleteUtilityReading(reading.id!);
                        }
                      });
                    }}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold pt-1">
                  <div className="bg-amber-50 p-2 rounded-xl text-amber-900 border border-amber-100/80">
                    ⚡ Điện: <strong className="font-extrabold">{elecUsage} kWh</strong>
                    <span className="block text-[10px] text-amber-700">{reading.electricityStart} → {reading.electricityEnd}</span>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-900 border border-blue-100/80">
                    💧 Nước: <strong className="font-extrabold">{waterUsage} m³</strong>
                    <span className="block text-[10px] text-blue-700">{reading.waterStart} → {reading.waterEnd}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {readings.length === 0 && (
            <div className="p-8 text-center text-stone-400 font-semibold text-sm">
              Chưa có bản ghi chốt số nào
            </div>
          )}
        </div>
      </div>

      {/* Chốt số Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[92vh] border border-stone-200">
            <div className="p-4 sm:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h3 className="text-lg sm:text-xl font-bold text-stone-900">Chốt số & Xuất hóa đơn</h3>
              <button onClick={closeModal} className="p-2 hover:bg-stone-200/60 rounded-xl"><X className="w-5 h-5 text-stone-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Tháng</label>
                  <input type="number" min={1} max={12} value={formData.month} onChange={(e) => setFormData({...formData, month: Number(e.target.value)})} className="w-full px-3.5 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Năm</label>
                  <input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: Number(e.target.value)})} className="w-full px-3.5 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Chọn phòng</label>
                <select 
                  required 
                  value={formData.roomId} 
                  onChange={(e) => handleRoomChange(e.target.value)} 
                  className="w-full px-3.5 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm"
                >
                  <option value="">-- Chọn phòng --</option>
                  {rooms
                    .filter(r => r.status === 'Rented')
                    .sort((a, b) => naturalCompare(a.name, b.name))
                    .map(room => (
                      <option key={room.id} value={room.id}>
                        Phòng {room.name} {room.tenantName ? `(${room.tenantName})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              
              {/* Electricity readings */}
              <div className="bg-amber-50 p-3.5 sm:p-4 rounded-xl border border-amber-200 space-y-3">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" /> 
                  Chỉ số điện (kWh)
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Số điện cũ</label>
                    <FormattedNumericInput value={formData.electricityStart} onChange={(val) => setFormData({...formData, electricityStart: val})} className="w-full px-3 py-1.5 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold text-stone-900 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Số điện mới</label>
                    <FormattedNumericInput value={formData.electricityEnd} onChange={(val) => setFormData({...formData, electricityEnd: val})} className="w-full px-3 py-1.5 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold text-stone-900 text-sm" />
                  </div>
                </div>
              </div>

              {/* Water readings */}
              <div className="bg-blue-50 p-3.5 sm:p-4 rounded-xl border border-blue-200 space-y-3">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-600" /> 
                  Chỉ số nước
                </h4>
                {formData.waterCalculationMethod === 'person' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Số người ở trong phòng</label>
                    <input 
                      type="number" 
                      min={1}
                      value={formData.occupantCount} 
                      onChange={(e) => setFormData({...formData, occupantCount: Number(e.target.value)})} 
                      className="w-full px-3.5 py-2 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-stone-900 text-sm" 
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Số nước cũ (m³)</label>
                      <FormattedNumericInput value={formData.waterStart} onChange={(val) => setFormData({...formData, waterStart: val})} className="w-full px-3 py-1.5 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-stone-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Số nước mới (m³)</label>
                      <FormattedNumericInput value={formData.waterEnd} onChange={(val) => setFormData({...formData, waterEnd: val})} className="w-full px-3 py-1.5 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-stone-900 text-sm" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 px-4 border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors text-sm">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200 text-sm">Xuất hóa đơn</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMBINED SINGLE SETTINGS MODAL (Biểu giá + Dịch vụ mẫu + Ngân hàng) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
          <div onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-200 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg sm:text-xl font-bold text-stone-900">Cài đặt biểu giá, Dịch vụ mẫu & Ngân hàng</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-stone-200/60 rounded-xl"><X className="w-5 h-5 text-stone-500" /></button>
            </div>

            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
              {/* SECTION 1: Biểu giá Điện & Nước */}
              <div className="space-y-3.5 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200/80 pb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  1. Biểu giá Điện & Nước mặc định
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Giá điện mặc định (đ/kWh)</label>
                    <FormattedNumericInput value={settings.electricityRate} onChange={(val) => setSettings({...settings, electricityRate: val})} className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Hình thức tính nước</label>
                    <select 
                      value={settings.waterCalculationMethod || 'usage'}
                      onChange={(e) => setSettings({...settings, waterCalculationMethod: e.target.value as any})}
                      className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900 text-sm"
                    >
                      <option value="usage">Tính theo khối (m³)</option>
                      <option value="person">Tính theo đầu người</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Giá nước mặc định ({settings.waterCalculationMethod === 'person' ? 'đ/người' : 'đ/m³'})
                    </label>
                    <FormattedNumericInput value={settings.waterRate} onChange={(val) => setSettings({...settings, waterRate: val})} className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm" />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Danh sách Dịch vụ mẫu */}
              <div className="space-y-3.5 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200/80 pb-2">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  2. Danh sách Dịch vụ mẫu chung (Wifi, Rác, Vệ sinh...)
                </h4>

                {/* Service List */}
                <div className="space-y-2">
                  {globalServices.length > 0 ? (
                    globalServices.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200">
                        <div>
                          <p className="font-bold text-stone-900 text-xs sm:text-sm">{s.name}</p>
                          <p className="text-xs font-semibold text-stone-500">{formatNumber(s.price)}đ / {s.unit === 'person' ? 'người' : 'phòng'}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Xác nhận xóa',
                              message: `Xóa dịch vụ mẫu ${s.name}?`,
                              onConfirm: async () => {
                                await firebaseService.deleteService(s.id!);
                              }
                            });
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-500 italic p-2">Chưa có dịch vụ mẫu nào.</p>
                  )}
                </div>

                {/* Add Service Inline Form */}
                <form onSubmit={handleAddGlobalService} className="pt-3 border-t border-stone-200/70 space-y-2">
                  <span className="text-xs font-bold text-stone-700 block">Thêm dịch vụ mẫu mới:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input 
                      required 
                      placeholder="Tên dịch vụ mẫu (Wifi, Rác...)" 
                      value={newService.name} 
                      onChange={(e) => setNewService({...newService, name: e.target.value})} 
                      className="sm:col-span-5 px-3 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900 text-xs sm:text-sm bg-white" 
                    />
                    <FormattedNumericInput 
                      placeholder="Giá tiền (đ)" 
                      value={newService.price} 
                      onChange={(val) => setNewService({...newService, price: val})} 
                      className="sm:col-span-3 px-3 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-xs sm:text-sm bg-white" 
                    />
                    <select 
                      value={newService.unit} 
                      onChange={(e) => setNewService({...newService, unit: e.target.value as any})} 
                      className="sm:col-span-2 px-2 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900 text-xs sm:text-sm bg-white cursor-pointer"
                    >
                      <option value="room">/ phòng</option>
                      <option value="person">/ người</option>
                    </select>
                    <button 
                      type="submit" 
                      className="sm:col-span-2 px-3 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all text-xs cursor-pointer flex items-center justify-center gap-1 shadow-2xs shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION 3: Thông tin Tài khoản Ngân hàng */}
              <div className="space-y-3.5 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200/80 pb-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  3. Thông tin Chuyển khoản Ngân hàng
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Tên ngân hàng</label>
                    <input 
                      type="text"
                      value={settings.bankName || ''}
                      onChange={(e) => setSettings({...settings, bankName: e.target.value})}
                      className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold text-stone-900"
                      placeholder="VD: Vietcombank, MB Bank..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Số tài khoản</label>
                      <input 
                        type="text"
                        value={settings.bankAccountNumber || ''}
                        onChange={(e) => setSettings({...settings, bankAccountNumber: e.target.value})}
                        className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-bold text-stone-900"
                        placeholder="Nhập số tài khoản..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Chủ tài khoản</label>
                      <input 
                        type="text"
                        value={settings.bankAccountName || ''}
                        onChange={(e) => setSettings({...settings, bankAccountName: e.target.value})}
                        className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-bold text-stone-900"
                        placeholder="Tên người nhận..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <button 
                  type="button"
                  onClick={() => handleSaveSettingsAndSync(true)}
                  className="w-full py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-200 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>Lưu & Đồng bộ sang TẤT CẢ các phòng</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleSaveSettingsAndSync(false)}
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors text-xs cursor-pointer"
                >
                  Chỉ lưu cài đặt mẫu
                </button>
              </div>
            </div>
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

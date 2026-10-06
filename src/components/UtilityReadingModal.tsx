import React, { useState, useEffect } from 'react';
import { Room, UtilityReading, AppSettings, Service, Invoice, formatNumber, naturalCompare } from '../types';
import { firebaseService } from '../firebaseService';
import { X, Zap, Droplets, Calculator } from 'lucide-react';
import FormattedNumericInput from './FormattedNumericInput';

interface UtilityReadingModalProps {
  isOpen: boolean;
  rooms: Room[];
  onClose: () => void;
  onSuccess?: () => void;
  onInvoiceCreated?: (invoice: Invoice) => void;
}

export default function UtilityReadingModal({
  isOpen,
  rooms,
  onClose,
  onSuccess,
  onInvoiceCreated
}: UtilityReadingModalProps) {
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [globalServices, setGlobalServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    electricityRate: 3500,
    waterRate: 20000,
    waterCalculationMethod: 'usage'
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
    if (!isOpen) return;
    const unsubReadings = firebaseService.subscribeUtilityReadings(setReadings);
    const unsubServices = firebaseService.subscribeServices(setGlobalServices);
    firebaseService.getSettings().then(s => {
      setSettings(s);
      setFormData(prev => ({ ...prev, waterCalculationMethod: s.waterCalculationMethod }));
    });
    return () => {
      unsubReadings();
      unsubServices();
    };
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find(r => r.id === formData.roomId);
    if (!room) return;

    // 1. Add reading
    await firebaseService.addUtilityReading(formData);

    // 2. Determine rates
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
    const activeServices = room.services || [];

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

    // User requested no "Nội dung" line in bank transfer section
    const bankInfo = settings.bankAccountNumber ? `----------------------------------
THÔNG TIN CHUYỂN KHOẢN:
- Ngân hàng: ${settings.bankName}
- Số TK: ${formattedBankNumber}
- Chủ tài khoản: ${settings.bankAccountName}` : '';

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
    const newInvoiceId = await firebaseService.addInvoice({
      roomId: formData.roomId,
      tenantName: room.tenantName || '',
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

    const createdInvoice: Invoice = {
      id: newInvoiceId,
      roomId: formData.roomId,
      tenantName: room.tenantName || '',
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
    };

    onClose();
    if (onInvoiceCreated) {
      onInvoiceCreated(createdInvoice);
    } else if (onSuccess) {
      onSuccess();
    }
  };

  const rentedRooms = rooms
    .filter(r => r.status === 'Rented')
    .sort((a, b) => naturalCompare(a.name, b.name));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] pb-6 border border-stone-200">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-stone-900">Chốt số tháng này & Xuất hóa đơn</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200/60 rounded-lg">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Tháng</label>
              <input 
                type="number" 
                min={1} 
                max={12} 
                value={formData.month} 
                onChange={(e) => setFormData({...formData, month: Number(e.target.value)})} 
                className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Năm</label>
              <input 
                type="number" 
                value={formData.year} 
                onChange={(e) => setFormData({...formData, year: Number(e.target.value)})} 
                className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Chọn phòng</label>
            <select 
              required 
              value={formData.roomId} 
              onChange={(e) => handleRoomChange(e.target.value)} 
              className="w-full px-4 py-2 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900"
            >
              <option value="">-- Chọn phòng --</option>
              {rentedRooms.map(room => (
                <option key={room.id} value={room.id}>
                  Phòng {room.name} {room.tenantName ? `(${room.tenantName})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          {/* Electricity readings */}
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" /> 
              Chỉ số điện (kWh)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Số điện cũ</label>
                <FormattedNumericInput value={formData.electricityStart} onChange={(val) => setFormData({...formData, electricityStart: val})} className="w-full px-3 py-1.5 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold text-stone-900" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Số điện mới</label>
                <FormattedNumericInput value={formData.electricityEnd} onChange={(val) => setFormData({...formData, electricityEnd: val})} className="w-full px-3 py-1.5 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold text-stone-900" />
              </div>
            </div>
          </div>

          {/* Water readings */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
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
                  className="w-full px-4 py-2 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-stone-900" 
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Số nước cũ (m³)</label>
                  <FormattedNumericInput value={formData.waterStart} onChange={(val) => setFormData({...formData, waterStart: val})} className="w-full px-3 py-1.5 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-stone-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Số nước mới (m³)</label>
                  <FormattedNumericInput value={formData.waterEnd} onChange={(val) => setFormData({...formData, waterEnd: val})} className="w-full px-3 py-1.5 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-stone-900" />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors">Hủy</button>
            <button type="submit" className="flex-1 py-2.5 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200">Lưu & Xuất hóa đơn</button>
          </div>
        </form>
      </div>
    </div>
  );
}

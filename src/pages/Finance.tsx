import React, { useState, useEffect } from 'react';
import { firebaseService } from '../firebaseService';
import { Invoice, Expense, formatNumber, Room, Tenant } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Plus, Calendar, X, Trash2, CheckCircle2, AlertTriangle, Home, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import FormattedNumericInput from '../components/FormattedNumericInput';
import ConfirmModal from '../components/ConfirmModal';
import InvoiceDetailModal from '../components/InvoiceDetailModal';

export default function Finance() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Unpaid' | 'Paid'>('Unpaid');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
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
  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id'>>({
    type: 'Sửa chữa',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    description: ''
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let invoicesLoaded = false;
    let expensesLoaded = false;

    const checkDone = () => {
      if (invoicesLoaded && expensesLoaded) {
        setLoading(false);
      }
    };

    const unsubInvoices = firebaseService.subscribeInvoices((invs) => {
      setInvoices(invs);
      setSelectedInvoice(prev => prev ? invs.find(i => i.id === prev.id) || null : null);
      invoicesLoaded = true;
      checkDone();
    });
    const unsubExpenses = firebaseService.subscribeExpenses((exps) => {
      setExpenses(exps);
      expensesLoaded = true;
      checkDone();
    });
    const unsubRooms = firebaseService.subscribeRooms(setRooms);
    const unsubTenants = firebaseService.subscribeTenants(setTenants);
    return () => {
      unsubInvoices();
      unsubExpenses();
      unsubRooms();
      unsubTenants();
    };
  }, []);

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + i.totalAmount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const pendingRevenue = invoices.filter(i => i.status === 'Unpaid').reduce((acc, i) => acc + i.totalAmount, 0);

  // Prepare chart data (last 6 months)
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    
    const monthRevenue = invoices
      .filter(inv => inv.month === month && inv.year === year && inv.status === 'Paid')
      .reduce((acc, inv) => acc + inv.totalAmount, 0);
      
    const monthExpenses = expenses
      .filter(exp => {
        const expDate = parseISO(exp.date);
        return expDate.getMonth() + 1 === month && expDate.getFullYear() === year;
      })
      .reduce((acc, exp) => acc + exp.amount, 0);

    return {
      name: `T${month}`,
      revenue: monthRevenue,
      expense: monthExpenses,
      profit: monthRevenue - monthExpenses
    };
  });

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await firebaseService.addExpense(newExpense);
    setIsModalOpen(false);
    setNewExpense({ type: 'Sửa chữa', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), description: '' });
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-8 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-stone-200 h-28 flex flex-col justify-between">
              <div className="w-8 h-8 bg-stone-200 rounded-xl" />
              <div className="w-24 h-6 bg-stone-300 rounded-md" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 h-72 p-6 space-y-4">
          <div className="w-48 h-5 bg-stone-200 rounded-md" />
          <div className="w-full h-48 bg-stone-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
            <div className="bg-emerald-100 p-1.5 sm:p-2 rounded-xl text-emerald-600 shrink-0"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            <h3 className="text-stone-600 text-xs sm:text-sm font-bold truncate">Doanh thu</h3>
          </div>
          <p className="text-lg sm:text-2xl font-black text-stone-900 truncate">{formatNumber(totalRevenue)}đ</p>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-1 font-semibold truncate">Tiền đã thu</p>
        </div>

        <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
            <div className="bg-red-100 p-1.5 sm:p-2 rounded-xl text-red-600 shrink-0"><TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            <h3 className="text-stone-600 text-xs sm:text-sm font-bold truncate">Tổng chi phí</h3>
          </div>
          <p className="text-lg sm:text-2xl font-black text-stone-900 truncate">{formatNumber(totalExpenses)}đ</p>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-1 font-semibold truncate">Sửa chữa & Vận hành</p>
        </div>

        <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
            <div className="bg-blue-100 p-1.5 sm:p-2 rounded-xl text-blue-600 shrink-0"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            <h3 className="text-stone-600 text-xs sm:text-sm font-bold truncate">Lợi nhuận</h3>
          </div>
          <p className="text-lg sm:text-2xl font-black text-stone-900 truncate">{formatNumber(totalProfit)}đ</p>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-1 font-semibold truncate">Thu - Chi</p>
        </div>

        <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
            <div className="bg-amber-100 p-1.5 sm:p-2 rounded-xl text-amber-600 shrink-0"><Calendar className="w-4 h-4 sm:w-5 sm:h-5" /></div>
            <h3 className="text-stone-600 text-xs sm:text-sm font-bold truncate">Chờ thu</h3>
          </div>
          <p className="text-lg sm:text-2xl font-black text-stone-900 truncate">{formatNumber(pendingRevenue)}đ</p>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-1 font-semibold truncate">Hóa đơn chưa thu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-stone-200 shadow-2xs">
          <h3 className="font-bold text-stone-900 mb-4 sm:mb-6 text-base sm:text-lg">Biểu đồ tài chính 6 tháng</h3>
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#78716c', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#78716c', fontWeight: 600}} tickFormatter={(v) => `${v/1000000}M`} />
                <Tooltip 
                  cursor={{fill: '#f5f5f4'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600}}
                  formatter={(v: number) => [`${formatNumber(v)}đ`]}
                />
                <Bar dataKey="revenue" name="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Chi phí" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base sm:text-lg">Chi phí phát sinh</h3>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[350px] sm:max-h-[400px] divide-y divide-stone-100">
            {expenses.length > 0 ? expenses.map((expense) => (
              <div key={expense.id} className="p-3.5 sm:p-4 hover:bg-stone-50 transition-colors group">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{expense.type}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-red-600 text-sm">-{formatNumber(expense.amount)}đ</span>
                    <button 
                      onClick={() => {
                        setConfirmConfig({
                          isOpen: true,
                          title: 'Xác nhận xóa',
                          message: 'Xóa chi phí này?',
                          onConfirm: async () => {
                            await firebaseService.deleteExpense(expense.id!);
                          }
                        });
                      }}
                      className="p-1 hover:bg-red-50 rounded text-red-600 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-stone-900 font-semibold">{expense.description}</p>
                <p className="text-[10px] text-stone-500 font-semibold mt-1">{format(parseISO(expense.date), 'dd/MM/yyyy')}</p>
              </div>
            )) : (
              <div className="p-8 text-center text-stone-400 text-sm font-semibold">Chưa có chi phí nào</div>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <h3 className="font-bold text-stone-900 text-base sm:text-lg">Quản lý hóa đơn</h3>
            <div className="flex bg-stone-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('Unpaid')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTab === 'Unpaid' ? 'bg-white text-amber-600 shadow-2xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                Chưa thu
              </button>
              <button 
                onClick={() => setActiveTab('Paid')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTab === 'Paid' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                Đã thu
              </button>
            </div>
          </div>
          {activeTab === 'Unpaid' ? (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider self-start">
              Cần thu: {formatNumber(pendingRevenue)}đ
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider self-start">
              Đã thu: {formatNumber(totalRevenue)}đ
            </span>
          )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Phòng</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Tháng/Năm</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider">Số tiền</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-600 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {invoices.filter(i => i.status === activeTab).map((invoice) => {
                const room = rooms.find(r => r.id === invoice.roomId);
                return (
                  <tr 
                    key={invoice.id} 
                    onClick={() => setSelectedInvoice(invoice)}
                    className="hover:bg-stone-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-stone-400 group-hover:text-emerald-600" />
                        <span className="font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">
                          Phòng {room?.name || '...'} {invoice.tenantName ? `(${invoice.tenantName})` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-stone-700">Tháng {invoice.month}/{invoice.year}</p>
                    </td>
                    <td className={`px-6 py-4 font-bold ${activeTab === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {formatNumber(invoice.totalAmount)}đ
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-xs font-bold"
                          title="Xem chi tiết hóa đơn"
                        >
                          <Eye className="w-4 h-4" />
                          Xem chi tiết
                        </button>
                        {activeTab === 'Unpaid' ? (
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
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-bold"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Đã thu
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setConfirmConfig({
                                isOpen: true,
                                title: 'Hoàn tác thanh toán',
                                message: 'Chuyển hóa đơn này về trạng thái chưa thanh toán?',
                                onConfirm: async () => {
                                  await firebaseService.updateInvoiceStatus(invoice.id!, 'Unpaid');
                                }
                              });
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors text-xs font-bold"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Chưa thu
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
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invoices.filter(i => i.status === activeTab).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-stone-500 font-semibold">
                    {activeTab === 'Unpaid' ? 'Tất cả hóa đơn đã được thanh toán!' : 'Chưa có hóa đơn nào đã thanh toán.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-stone-100">
          {invoices.filter(i => i.status === activeTab).map((invoice) => {
            const room = rooms.find(r => r.id === invoice.roomId);
            return (
              <div 
                key={invoice.id} 
                onClick={() => setSelectedInvoice(invoice)}
                className="p-3.5 space-y-2.5 cursor-pointer hover:bg-stone-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1 text-stone-500 mb-0.5">
                      <Home className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-bold uppercase truncate">
                        Phòng {room?.name || '...'} {invoice.tenantName ? `(${invoice.tenantName})` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 font-semibold">Tháng {invoice.month}/{invoice.year}</p>
                    <p className={`text-base font-black mt-0.5 ${activeTab === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {formatNumber(invoice.totalAmount)}đ
                    </p>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setSelectedInvoice(invoice)}
                      className="p-1.5 bg-stone-100 text-stone-700 rounded-lg"
                      title="Xem chi tiết hóa đơn"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {activeTab === 'Unpaid' ? (
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
                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Hoàn tác thanh toán',
                            message: 'Chuyển hóa đơn này về trạng thái chưa thanh toán?',
                            onConfirm: async () => {
                              await firebaseService.updateInvoiceStatus(invoice.id!, 'Unpaid');
                            }
                          });
                        }}
                        className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"
                      >
                        <AlertTriangle className="w-4 h-4" />
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
                      className="p-1.5 bg-red-50 text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {invoices.filter(i => i.status === activeTab).length === 0 && (
            <div className="p-8 text-center text-stone-400 text-sm font-semibold">
              {activeTab === 'Unpaid' ? 'Tất cả hóa đơn đã được thanh toán!' : 'Chưa có hóa đơn nào đã thanh toán.'}
            </div>
          )}
        </div>
      </div>

      {/* Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-200 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h3 className="text-lg sm:text-xl font-bold text-stone-900">Thêm chi phí mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-200/60 rounded-xl"><X className="w-5 h-5 text-stone-500" /></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Loại chi phí</label>
                <select value={newExpense.type} onChange={(e) => setNewExpense({...newExpense, type: e.target.value})} className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900 text-sm">
                  <option value="Sửa chữa">Sửa chữa</option>
                  <option value="Vệ sinh">Vệ sinh</option>
                  <option value="Thuế">Thuế</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Số tiền (đ)</label>
                <FormattedNumericInput value={newExpense.amount} onChange={(val) => setNewExpense({...newExpense, amount: val})} className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Ngày chi</label>
                <input required type="date" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-stone-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Mô tả</label>
                <textarea required value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none font-semibold text-stone-900 text-sm" placeholder="VD: Thay bóng đèn hành lang..."></textarea>
              </div>
              <button type="submit" className="w-full py-2.5 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md text-sm">Thêm chi phí</button>
            </form>
          </div>
        </div>
      )}

      <InvoiceDetailModal 
        invoice={selectedInvoice}
        rooms={rooms}
        tenants={tenants}
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

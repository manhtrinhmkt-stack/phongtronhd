export interface Room {
  id?: string;
  name: string;
  status: 'Empty' | 'Rented' | 'Repairing';
  price: number;
  note?: string;
  currentTenantId?: string;
  currentContractId?: string;
}

export interface Tenant {
  id?: string;
  name: string;
  phone: string;
  idNumber?: string;
  tempResidenceStatus?: string;
  members?: {
    name: string;
    idNumber?: string;
    relation: string;
  }[];
}

export interface Contract {
  id?: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  deposit: number;
  status: 'Active' | 'Expired' | 'Terminated';
}

export interface UtilityReading {
  id?: string;
  roomId: string;
  month: number;
  year: number;
  electricityStart: number;
  electricityEnd: number;
  waterStart: number;
  waterEnd: number;
  occupantCount?: number;
  waterCalculationMethod?: 'usage' | 'person';
  createdAt: string;
}

export interface Service {
  id?: string;
  name: string;
  price: number;
  unit: 'room' | 'person' | 'usage';
}

export interface Invoice {
  id?: string;
  roomId: string;
  tenantId: string;
  month: number;
  year: number;
  rentCost: number;
  electricityCost: number;
  waterCost: number;
  waterUsage?: number;
  electricityUsage?: number;
  waterCalculationMethod?: 'usage' | 'person';
  serviceCosts: { name: string; cost: number; unit?: string; price?: number; occupantCount?: number }[];
  totalAmount: number;
  status: 'Paid' | 'Unpaid';
  textTemplate: string;
}

export interface Expense {
  id?: string;
  type: string;
  amount: number;
  date: string;
  description: string;
}

export interface AppSettings {
  electricityRate: number;
  waterRate: number;
  waterCalculationMethod: 'usage' | 'person';
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export interface RoomServiceConfig {
  id?: string;
  name: string;
  price: number;
  unit: 'room' | 'person' | 'usage';
}

export interface Room {
  id?: string;
  name: string;
  status: 'Empty' | 'Rented' | 'Repairing';
  price: number;
  tenantName?: string;
  tenantPhone?: string;
  electricityRate?: number;
  waterRate?: number;
  waterCalculationMethod?: 'usage' | 'person';
  occupantCount?: number;
  services?: RoomServiceConfig[];
  note?: string;
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
  tenantId?: string;
  tenantName?: string;
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

export const naturalCompare = (aStr: string = '', bStr: string = ''): number => {
  const regex = /(\d+)/g;
  const aParts = aStr.split(regex);
  const bParts = bStr.split(regex);

  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const partA = aParts[i] || '';
    const partB = bParts[i] || '';

    const isNumA = /^\d+$/.test(partA);
    const isNumB = /^\d+$/.test(partB);

    if (isNumA && isNumB) {
      const diff = parseInt(partA, 10) - parseInt(partB, 10);
      if (diff !== 0) return diff;
    } else {
      const comp = partA.localeCompare(partB, 'vi', { sensitivity: 'base' });
      if (comp !== 0) return comp;
    }
  }

  return aStr.localeCompare(bStr, 'vi', { sensitivity: 'base' });
};

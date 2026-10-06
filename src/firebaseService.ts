import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  getDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Room, Tenant, Contract, UtilityReading, Service, Invoice, Expense, AppSettings, SyncOptions } from './types';

// Generic handle error function as per guidelines
const handleFirestoreError = (error: any, operation: string, path: string) => {
  console.error(`Firestore Error [${operation}] on [${path}]:`, error);
  throw error;
};

export const firebaseService = {
  // Rooms
  subscribeRooms: (callback: (rooms: Room[]) => void) => {
    return onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      callback(rooms);
    }, (err) => handleFirestoreError(err, 'subscribe', 'rooms'));
  },
  addRoom: async (room: Omit<Room, 'id'>) => {
    try {
      return await addDoc(collection(db, 'rooms'), room);
    } catch (err) { handleFirestoreError(err, 'add', 'rooms'); }
  },
  updateRoom: async (id: string, room: Partial<Room>) => {
    try {
      await updateDoc(doc(db, 'rooms', id), room);
    } catch (err) { handleFirestoreError(err, 'update', `rooms/${id}`); }
  },
  deleteRoom: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'rooms', id));
    } catch (err) { handleFirestoreError(err, 'delete', `rooms/${id}`); }
  },

  // Tenants
  subscribeTenants: (callback: (tenants: Tenant[]) => void) => {
    return onSnapshot(collection(db, 'tenants'), (snapshot) => {
      const tenants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
      callback(tenants);
    }, (err) => handleFirestoreError(err, 'subscribe', 'tenants'));
  },
  addTenant: async (tenant: Omit<Tenant, 'id'>) => {
    try {
      return await addDoc(collection(db, 'tenants'), tenant);
    } catch (err) { handleFirestoreError(err, 'add', 'tenants'); }
  },
  updateTenant: async (id: string, tenant: Partial<Tenant>) => {
    try {
      await updateDoc(doc(db, 'tenants', id), tenant);
    } catch (err) { handleFirestoreError(err, 'update', `tenants/${id}`); }
  },
  deleteTenant: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tenants', id));
    } catch (err) { handleFirestoreError(err, 'delete', `tenants/${id}`); }
  },

  // Contracts
  subscribeContracts: (callback: (contracts: Contract[]) => void) => {
    return onSnapshot(collection(db, 'contracts'), (snapshot) => {
      const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
      callback(contracts);
    }, (err) => handleFirestoreError(err, 'subscribe', 'contracts'));
  },
  addContract: async (contract: Omit<Contract, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'contracts'), contract);
      // Update room status
      await updateDoc(doc(db, 'rooms', contract.roomId), {
        status: 'Rented',
        currentTenantId: contract.tenantId,
        currentContractId: docRef.id
      });
      return docRef;
    } catch (err) { handleFirestoreError(err, 'add', 'contracts'); }
  },
  updateContract: async (id: string, contract: Partial<Contract>, previousRoomId?: string) => {
    try {
      await updateDoc(doc(db, 'contracts', id), contract);
      // If room changed
      if (contract.roomId && previousRoomId && contract.roomId !== previousRoomId) {
        await updateDoc(doc(db, 'rooms', previousRoomId), {
          status: 'Empty',
          currentTenantId: null,
          currentContractId: null
        });
        await updateDoc(doc(db, 'rooms', contract.roomId), {
          status: contract.status === 'Terminated' || contract.status === 'Expired' ? 'Empty' : 'Rented',
          currentTenantId: contract.status === 'Terminated' || contract.status === 'Expired' ? null : contract.tenantId,
          currentContractId: contract.status === 'Terminated' || contract.status === 'Expired' ? null : id
        });
      } else if (contract.roomId && contract.tenantId) {
        await updateDoc(doc(db, 'rooms', contract.roomId), {
          status: contract.status === 'Terminated' || contract.status === 'Expired' ? 'Empty' : 'Rented',
          currentTenantId: contract.status === 'Terminated' || contract.status === 'Expired' ? null : contract.tenantId,
          currentContractId: contract.status === 'Terminated' || contract.status === 'Expired' ? null : id
        });
      }
    } catch (err) { handleFirestoreError(err, 'update', `contracts/${id}`); }
  },
  deleteContract: async (id: string, roomId: string) => {
    try {
      await deleteDoc(doc(db, 'contracts', id));
      // Reset room status
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'Empty',
        currentTenantId: null,
        currentContractId: null
      });
    } catch (err) { handleFirestoreError(err, 'delete', `contracts/${id}`); }
  },

  // Utility Readings
  subscribeUtilityReadings: (callback: (readings: UtilityReading[]) => void) => {
    return onSnapshot(query(collection(db, 'utilityReadings'), orderBy('year', 'desc'), orderBy('month', 'desc')), (snapshot) => {
      const readings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UtilityReading));
      callback(readings);
    }, (err) => handleFirestoreError(err, 'subscribe', 'utilityReadings'));
  },
  addUtilityReading: async (reading: Omit<UtilityReading, 'id'>) => {
    try {
      return await addDoc(collection(db, 'utilityReadings'), reading);
    } catch (err) { handleFirestoreError(err, 'add', 'utilityReadings'); }
  },
  deleteUtilityReading: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'utilityReadings', id));
    } catch (err) { handleFirestoreError(err, 'delete', `utilityReadings/${id}`); }
  },

  // Services
  subscribeServices: (callback: (services: Service[]) => void) => {
    return onSnapshot(collection(db, 'services'), (snapshot) => {
      const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      callback(services);
    }, (err) => handleFirestoreError(err, 'subscribe', 'services'));
  },
  addService: async (service: Omit<Service, 'id'>) => {
    try {
      return await addDoc(collection(db, 'services'), service);
    } catch (err) { handleFirestoreError(err, 'add', 'services'); }
  },
  deleteService: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'services', id));
    } catch (err) { handleFirestoreError(err, 'delete', `services/${id}`); }
  },

  // Invoices
  subscribeInvoices: (callback: (invoices: Invoice[]) => void) => {
    return onSnapshot(query(collection(db, 'invoices'), orderBy('year', 'desc'), orderBy('month', 'desc')), (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      callback(invoices);
    }, (err) => handleFirestoreError(err, 'subscribe', 'invoices'));
  },
  addInvoice: async (invoice: Omit<Invoice, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'invoices'), invoice);
      return docRef.id;
    } catch (err) { handleFirestoreError(err, 'add', 'invoices'); }
  },
  deleteInvoice: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'invoices', id));
    } catch (err) { handleFirestoreError(err, 'delete', `invoices/${id}`); }
  },
  updateInvoiceStatus: async (id: string, status: 'Paid' | 'Unpaid') => {
    try {
      await updateDoc(doc(db, 'invoices', id), { status });
    } catch (err) { handleFirestoreError(err, 'update', `invoices/${id}`); }
  },

  // Expenses
  subscribeExpenses: (callback: (expenses: Expense[]) => void) => {
    return onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
      const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      callback(expenses);
    }, (err) => handleFirestoreError(err, 'subscribe', 'expenses'));
  },
  addExpense: async (expense: Omit<Expense, 'id'>) => {
    try {
      return await addDoc(collection(db, 'expenses'), expense);
    } catch (err) { handleFirestoreError(err, 'add', 'expenses'); }
  },
  deleteExpense: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) { handleFirestoreError(err, 'delete', `expenses/${id}`); }
  },

  // Settings
  subscribeSettings: (callback: (settings: AppSettings) => void) => {
    return onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AppSettings);
      } else {
        const defaultSettings: AppSettings = { 
          electricityRate: 3500, 
          waterRate: 20000,
          waterCalculationMethod: 'usage',
          bankName: '',
          bankAccountNumber: '',
          bankAccountName: ''
        };
        setDoc(doc(db, 'settings', 'global'), defaultSettings);
        callback(defaultSettings);
      }
    }, (err) => handleFirestoreError(err, 'subscribe', 'settings/global'));
  },
  getSettings: async (): Promise<AppSettings> => {
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as AppSettings;
      } else {
        const defaultSettings: AppSettings = { 
          electricityRate: 3500, 
          waterRate: 20000,
          waterCalculationMethod: 'usage',
          bankName: '',
          bankAccountNumber: '',
          bankAccountName: ''
        };
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
      }
    } catch (err) { 
      handleFirestoreError(err, 'get', 'settings/global');
      return { 
        electricityRate: 3500, 
        waterRate: 20000,
        waterCalculationMethod: 'usage'
      };
    }
  },
  updateSettings: async (settings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
    } catch (err) { handleFirestoreError(err, 'update', 'settings/global'); }
  },

  // Sync Global Settings to ALL Rooms (with selective options for electricity, water, services)
  syncGlobalToAllRooms: async (settings: AppSettings, servicesList: Service[], options?: SyncOptions) => {
    try {
      const roomDocs = await getDocs(collection(db, 'rooms'));
      const batch = writeBatch(db);

      const doElectricity = options ? options.syncElectricity ?? true : true;
      const doWater = options ? options.syncWater ?? true : true;
      const doServices = options ? options.syncServices ?? false : true;

      roomDocs.forEach((roomDoc) => {
        const roomData = roomDoc.data() as Room;
        const updatePayload: Record<string, any> = {};

        if (doElectricity) {
          updatePayload.electricityRate = settings.electricityRate ?? 3500;
        }

        if (doWater) {
          updatePayload.waterRate = settings.waterRate ?? 20000;
          updatePayload.waterCalculationMethod = settings.waterCalculationMethod || 'usage';
        }

        if (doServices) {
          let updatedServices = roomData.services || [];
          if (updatedServices.length > 0) {
            updatedServices = updatedServices.map(s => {
              const matchedTemplate = servicesList.find(ts => ts.name === s.name);
              if (matchedTemplate) {
                return {
                  name: s.name,
                  price: matchedTemplate.price,
                  unit: matchedTemplate.unit
                };
              }
              return s;
            });
          } else {
            // Apply global template services
            updatedServices = servicesList.map(s => ({
              name: s.name,
              price: s.price,
              unit: s.unit
            }));
          }
          updatePayload.services = updatedServices;
        }

        if (Object.keys(updatePayload).length > 0) {
          batch.update(roomDoc.ref, updatePayload);
        }
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'syncGlobalToAllRooms', 'rooms');
    }
  }
};

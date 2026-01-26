
/**
 * Advanced IndexedDB Wrapper with Cloud Sync capabilities
 */
import { createClient } from '@supabase/supabase-js';

const DB_NAME = 'ShujianDB';
const DB_VERSION = 3;

export const DB = {
  getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        const factTables = ['fact_shangzhi', 'fact_jingzhuntong', 'fact_customer_service'];
        factTables.forEach(tableName => {
          if (!db.objectStoreNames.contains(tableName)) {
            const store = db.createObjectStore(tableName, { keyPath: 'id', autoIncrement: true });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('sku_date', ['sku_code', 'date'], { unique: false });
          }
        });
        if (!db.objectStoreNames.contains('app_config')) {
          db.createObjectStore('app_config');
        }
      };
    });
  },

  async deleteRows(tableName: string, ids: any[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      ids.forEach(id => store.delete(id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  async bulkAdd(tableName: string, rows: any[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      rows.forEach(row => store.put(row));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  async getTableRows(tableName: string): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readonly');
      const store = transaction.objectStore(tableName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getRange(tableName: string, startDate: string, endDate: string): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readonly');
      const store = transaction.objectStore(tableName);
      const index = store.index('date');
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveConfig(key: string, data: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['app_config'], 'readwrite');
      const store = transaction.objectStore('app_config');
      store.put(data, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  async loadConfig<T>(key: string, defaultValue: T): Promise<T> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['app_config'], 'readonly');
      const store = transaction.objectStore('app_config');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result !== undefined ? request.result : defaultValue);
      request.onerror = () => resolve(defaultValue);
    });
  },

  async getAllConfigs(): Promise<Record<string, any>> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['app_config'], 'readonly');
      const store = transaction.objectStore('app_config');
      const items: any = {};
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor) {
              items[cursor.key] = cursor.value;
              cursor.continue();
          } else {
              resolve(items);
          }
      };
    });
  },

  async clearTable(tableName: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  async exportFullDatabase(): Promise<string> {
    const db = await this.getDB();
    const exportData: any = {
      version: DB_VERSION,
      timestamp: new Date().toISOString(),
      tables: {}
    };

    const tableNames = ['fact_shangzhi', 'fact_jingzhuntong', 'fact_customer_service', 'app_config'];
    
    for (const tableName of tableNames) {
      const transaction = db.transaction([tableName], 'readonly');
      const store = transaction.objectStore(tableName);
      
      if (tableName === 'app_config') {
          exportData.tables[tableName] = await new Promise((resolve) => {
              const items: any = {};
              const cursorReq = store.openCursor();
              cursorReq.onsuccess = (e: any) => {
                  const cursor = e.target.result;
                  if (cursor) {
                      items[cursor.key] = cursor.value;
                      cursor.continue();
                  } else {
                      resolve(items);
                  }
              };
          });
      } else {
          exportData.tables[tableName] = await new Promise((resolve) => {
              const request = store.getAll();
              request.onsuccess = () => resolve(request.result);
          });
      }
    }
    return JSON.stringify(exportData);
  },

  async importFullDatabase(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    const db = await this.getDB();
    const tableNames = Object.keys(data.tables);

    for (const tableName of tableNames) {
      const transaction = db.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      store.clear();
      
      if (tableName === 'app_config') {
          const configItems = data.tables[tableName];
          for (const key in configItems) {
              store.put(configItems[key], key);
          }
      } else {
          const rows = data.tables[tableName];
          rows.forEach((row: any) => store.put(row));
      }
    }
  }
};

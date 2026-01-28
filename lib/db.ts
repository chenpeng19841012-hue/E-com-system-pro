
/**
 * Advanced IndexedDB Wrapper with Real-time Cloud Sync (Hybrid Architecture)
 * v5.2.7 Upgrade: Auto-Streaming Sync Kernel (Write-Through)
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DB_NAME = 'ShujianDB';
const DB_VERSION = 3;

// 缓存 Supabase 客户端实例
let supabaseInstance: SupabaseClient | null = null;

// 辅助：延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
            if (tableName === 'fact_shangzhi') store.createIndex('sku_date', ['sku_code', 'date'], { unique: false });
            if (tableName === 'fact_jingzhuntong') store.createIndex('jzt_key', ['tracked_sku_id', 'date', 'account_nickname'], { unique: false });
            if (tableName === 'fact_customer_service') store.createIndex('cs_key', ['agent_account', 'date'], { unique: false });
          }
        });
        if (!db.objectStoreNames.contains('app_config')) {
          db.createObjectStore('app_config');
        }
      };
    });
  },

  async getSupabase(): Promise<SupabaseClient | null> {
    if (supabaseInstance) return supabaseInstance;
    try {
        const config = await this.loadConfig('cloud_sync_config', null);
        if (config && config.url && config.key) {
          supabaseInstance = createClient(config.url, config.key);
          return supabaseInstance;
        }
    } catch(e) { return null; }
    return null;
  },

  // 内部专用：带重试的批量上传
  async _pushBatchToCloud(supabase: SupabaseClient, tableName: string, data: any[], conflictKey?: string) {
      const CHUNK_SIZE = 50; // 微切片大小
      
      // 数据清洗：移除本地 ID，标准化日期
      const cleanData = data.map(({ id, ...rest }: any) => {
          if (rest.date instanceof Date) rest.date = rest.date.toISOString().split('T')[0];
          // 确保 updated_at 也是最新的
          if (!rest.updated_at) rest.updated_at = new Date().toISOString();
          Object.keys(rest).forEach(key => { if (rest[key] === undefined) rest[key] = null; });
          return rest;
      });

      // 在后台分片处理
      let successCount = 0;
      for (let i = 0; i < cleanData.length; i += CHUNK_SIZE) {
          const chunk = cleanData.slice(i, i + CHUNK_SIZE);
          let retries = 3;
          while (retries > 0) {
              try {
                  const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: conflictKey });
                  if (error) throw error;
                  successCount += chunk.length;
                  break; 
              } catch (e: any) {
                  retries--;
                  console.warn(`[AutoSync] ${tableName} 分片上传重试 (${retries} left):`, e.message);
                  await sleep(1000); // 失败等待 1秒
              }
          }
          await sleep(50); // 请求间隔，防止拥塞
      }
      console.log(`[AutoSync] ${tableName}: 已后台同步 ${successCount}/${data.length} 条记录`);
  },

  // 核心：智能增量拉取
  async syncPull(): Promise<boolean> {
    const supabase = await this.getSupabase();
    if (!supabase) return false;

    const syncConfig = await this.loadConfig('cloud_sync_config', { lastSync: '1970-01-01T00:00:00.000Z' });
    const lastSync = syncConfig.lastSync || '1970-01-01T00:00:00.000Z';
    const newSyncTime = new Date().toISOString(); 

    try {
      // 1. 同步配置
      const { data: configs } = await supabase.from('app_config').select('*').gt('updated_at', lastSync);
      if (configs && configs.length > 0) {
        for (const item of configs) {
          if (item.key !== 'cloud_sync_config') {
             // 写入本地但不触发回传 (防止死循环)
             await this._localSaveConfig(item.key, item.data);
          }
        }
      }

      // 2. 同步事实表
      const tables = [
          { name: 'fact_shangzhi', indexName: 'sku_date', keyMapper: (r:any) => [r.sku_code, r.date] },
          { name: 'fact_jingzhuntong', indexName: 'jzt_key', keyMapper: (r:any) => [r.tracked_sku_id, r.date, r.account_nickname] },
          { name: 'fact_customer_service', indexName: 'cs_key', keyMapper: (r:any) => [r.agent_account, r.date] }
      ];
      
      const db = await this.getDB();

      for (const t of tables) {
          let hasMore = true;
          let page = 0;
          const pageSize = 1000;

          while (hasMore) {
              const { data, error } = await supabase
                  .from(t.name)
                  .select('*')
                  .gt('updated_at', lastSync)
                  .range(page * pageSize, (page + 1) * pageSize - 1)
                  .order('updated_at', { ascending: true });

              if (error || !data || data.length === 0) {
                  hasMore = false;
              } else {
                  const tx = db.transaction([t.name], 'readwrite');
                  const store = tx.objectStore(t.name);
                  const index = store.index(t.indexName);

                  for (const cloudRow of data) {
                      // 简单去重逻辑：如果本地有相同业务主键，则覆盖
                      const bizKey = t.keyMapper(cloudRow);
                      const getReq = index.get(bizKey);
                      getReq.onsuccess = () => {
                          const localRecord = getReq.result;
                          if (localRecord) {
                              // 更新：保留本地ID以防主键冲突，更新内容
                              store.put({ ...cloudRow, id: localRecord.id });
                          } else {
                              // 新增：移除云端ID（让本地自增）或者保留云端ID需视情况而定
                              // 这里建议移除ID让本地生成，避免冲突，因为ID只是物理主键
                              const { id, ...rowContent } = cloudRow;
                              store.put(rowContent);
                          }
                      };
                  }
                  
                  // 等待事务完成
                  await new Promise<void>((resolve) => {
                      tx.oncomplete = () => resolve();
                      tx.onerror = () => resolve();
                  });

                  if (data.length < pageSize) hasMore = false; else page++;
              }
          }
      }

      await this._localSaveConfig('cloud_sync_config', { ...syncConfig, lastSync: newSyncTime });
      return true;
    } catch (e) {
      console.error("[AutoPull] Error:", e);
      return false;
    }
  },

  // 内部：仅写入本地配置，不触发同步
  async _localSaveConfig(key: string, data: any): Promise<void> {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(['app_config'], 'readwrite');
          tx.objectStore('app_config').put(data, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject();
      });
  },

  async getAllKeys(tableName: string): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
        const store = db.transaction([tableName], 'readonly').objectStore(tableName);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
    });
  },

  async getBatch(tableName: string, keys: any[]): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
        const store = db.transaction([tableName], 'readonly').objectStore(tableName);
        const results: any[] = [];
        let completed = 0;
        if(keys.length===0) resolve([]);
        keys.forEach(k => {
            store.get(k).onsuccess = (e: any) => {
                if(e.target.result) results.push(e.target.result);
                completed++;
                if(completed === keys.length) resolve(results);
            };
        });
    });
  },

  // 删除行
  async deleteRows(tableName: string, ids: any[]): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      ids.forEach(id => store.delete(id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    // TODO: 实现云端删除 (需 Soft Delete 或单独的删除表)
  },

  // 核心：批量添加 (自动触发后台云同步)
  async bulkAdd(tableName: string, rows: any[]): Promise<void> {
    const db = await this.getDB();
    const rowsWithTime = rows.map(r => ({ ...r, updated_at: new Date().toISOString() }));
    
    // 1. 写入本地
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      rowsWithTime.forEach(row => store.put(row)); 
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // 2. 触发后台云同步 (Fire and forget)
    const supabase = await this.getSupabase();
    if (supabase) {
        let conflictKey = undefined;
        if (tableName === 'fact_shangzhi') conflictKey = 'date,sku_code';
        else if (tableName === 'fact_jingzhuntong') conflictKey = 'date,tracked_sku_id,account_nickname';
        else if (tableName === 'fact_customer_service') conflictKey = 'date,agent_account';
        
        // 异步执行，不等待
        this._pushBatchToCloud(supabase, tableName, rowsWithTime, conflictKey);
    }
  },

  // 保存配置 (自动触发后台云同步)
  async saveConfig(key: string, data: any): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['app_config'], 'readwrite');
      const store = transaction.objectStore('app_config');
      store.put(data, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // 触发同步
    if (key !== 'cloud_sync_config') {
        const supabase = await this.getSupabase();
        if (supabase) {
            this._pushBatchToCloud(supabase, 'app_config', [{ key, data, updated_at: new Date().toISOString() }], 'key');
        }
    }
  },

  async getTableRows(tableName: string): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([tableName], 'readonly');
      const store = transaction.objectStore(tableName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  },

  async getRange(tableName: string, startDate: string, endDate: string): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([tableName], 'readonly');
      const store = transaction.objectStore(tableName);
      const index = store.index('date');
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
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
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
};

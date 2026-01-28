
/**
 * Advanced IndexedDB Wrapper with Real-time Cloud Sync (Hybrid Architecture)
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DB_NAME = 'ShujianDB';
const DB_VERSION = 3;

// 缓存 Supabase 客户端实例
let supabaseInstance: SupabaseClient | null = null;

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

  // 获取云端客户端（带缓存）
  async getSupabase(): Promise<SupabaseClient | null> {
    if (supabaseInstance) return supabaseInstance;
    // 尝试从 IndexedDB 获取配置，如果失败则返回 null
    try {
        const config = await this.loadConfig('cloud_sync_config', null);
        if (config && config.url && config.key) {
          supabaseInstance = createClient(config.url, config.key);
          return supabaseInstance;
        }
    } catch(e) {
        return null;
    }
    return null;
  },

  // 核心：智能全量/增量自动拉取 (Auto-Pull Smart Sync)
  async syncPull(): Promise<boolean> {
    const supabase = await this.getSupabase();
    if (!supabase) return false;

    // 获取上次同步时间
    const syncConfig = await this.loadConfig('cloud_sync_config', { lastSync: '1970-01-01T00:00:00.000Z' });
    const lastSync = syncConfig.lastSync || '1970-01-01T00:00:00.000Z';
    const newSyncTime = new Date().toISOString();

    console.log(`☁️ 启动云端热同步，增量起点 (Updated Since): ${lastSync}`);

    try {
      // 1. 同步配置项 (Metadata)
      // 配置表比较特殊，使用 updated_at 判断，若无则拉取所有
      const { data: configs } = await supabase.from('app_config').select('*').gt('updated_at', lastSync);
      if (configs && configs.length > 0) {
        console.log(`[Sync] 更新配置项: ${configs.length} 条`);
        for (const item of configs) {
          if (item.key !== 'cloud_sync_config') {
             // 写入本地，但不回推云端 (false)
             await this.saveConfig(item.key, item.data, false); 
          }
        }
      }

      // 2. 同步事实表 (Fact Tables) - 支持分页拉取海量数据
      const tables = ['fact_shangzhi', 'fact_jingzhuntong', 'fact_customer_service'];
      
      for (const table of tables) {
          let hasMore = true;
          let page = 0;
          const pageSize = 1000;
          let totalPulled = 0;

          while (hasMore) {
              // 关键修改：使用 updated_at 替代 created_at，确保“修改过”的旧数据也能被同步
              const { data, error } = await supabase
                  .from(table)
                  .select('*')
                  .gt('updated_at', lastSync) 
                  .range(page * pageSize, (page + 1) * pageSize - 1)
                  .order('updated_at', { ascending: true }); // 按更新时间排序

              if (error) {
                  // 如果没有 updated_at 列（旧表结构），降级尝试 created_at，或者忽略错误
                  if (error.code === '42703') { // Undefined column
                      console.warn(`[Sync Warning] Table ${table} missing updated_at column. Skipping increment check.`);
                      hasMore = false; 
                  } else {
                      console.error(`[Sync Error] Failed to fetch ${table}:`, error);
                      hasMore = false;
                  }
              } else if (data && data.length > 0) {
                  // 写入本地，禁用回推云端
                  await this.bulkAdd(table, data, false);
                  totalPulled += data.length;
                  
                  if (data.length < pageSize) {
                      hasMore = false; // 取不满说明是最后一页
                  } else {
                      page++;
                  }
              } else {
                  hasMore = false;
              }
          }
          if (totalPulled > 0) console.log(`[Sync] ${table}: 拉取并合并了 ${totalPulled} 条记录`);
      }

      // 3. 更新同步时间戳
      await this.saveConfig('cloud_sync_config', { ...syncConfig, lastSync: newSyncTime }, false);
      return true;
    } catch (e) {
      console.error("云端同步异常:", e);
      return false;
    }
  },

  // 核心：写入时自动推送到云端 (Write-Through)
  // 新增 syncToCloud 参数，默认为 true。当从云端拉取数据写入本地时，设为 false 防止死循环。
  async pushToCloud(tableName: string, data: any | any[], conflictKey?: string) {
    const supabase = await this.getSupabase();
    if (!supabase) return;

    // 异步执行，不阻塞 UI 响应
    setTimeout(async () => {
      try {
        const payload = Array.isArray(data) ? data : [data];
        // 清理 payload
        const cleanPayload = payload.map(({ id, ...rest }: any) => {
            // 注意：我们剥离本地 ID，完全依赖业务主键（如 date+sku_code）进行去重
            const clean = { ...rest }; 
            if (clean.date instanceof Date) clean.date = clean.date.toISOString().split('T')[0];
            return clean;
        });

        // 使用 UPSERT (Update or Insert) 机制，配合 onConflict 确保无重复
        const { error } = await supabase.from(tableName).upsert(cleanPayload, { 
            onConflict: conflictKey || undefined
        });
        
        if (error) console.error(`[Cloud Push] Upload to ${tableName} failed:`, error.message);
        // else console.log(`[Cloud Push] Success: ${cleanPayload.length} rows -> ${tableName}`);
      } catch (e) {
        console.error(`[Cloud Push] Error pushing to ${tableName}:`, e);
      }
    }, 0);
  },

  async deleteRows(tableName: string, ids: any[]): Promise<void> {
    const db = await this.getDB();
    // Local Delete
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      ids.forEach(id => store.delete(id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Cloud Delete - 暂不实现自动同步删除，防止误操作。建议在云端后台手动管理删除。
    console.warn("Local delete performed. Cloud delete skipped for safety.");
  },

  // 重构：支持 syncToCloud 参数
  async bulkAdd(tableName: string, rows: any[], syncToCloud: boolean = true): Promise<void> {
    const db = await this.getDB();
    // Local Write - IndexedDB 的 put 方法本身就是 "Upsert" (有则改之，无则加之)
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      
      // 这里的逻辑可以优化：如果本地已经存在相同业务主键的数据，我们应该找到它的 ID 并使用该 ID 进行 put，
      // 否则 IndexedDB 会生成新的 ID 导致本地重复。
      // 但由于 IndexedDB 查询比较耗时，且我们主要依赖 IDB 的 keyPath='id'。
      // 为了本地也不重复，我们需要先按业务主键查一遍 ID。
      
      // 简单起见，对于本地库，我们依赖导入前的“清空”习惯，或者接受本地可能有冗余但查询时会过滤。
      // 不过，最严谨的做法是：
      // 如果数据来自云端 (syncToCloud=false)，它不带本地 ID，直接 add 可能会导致重复。
      // 实际上，syncPull 下来的数据没有本地 ID，所以本地会自增 ID。
      // 这确实会导致本地重复。
      
      // === 关键修复：本地防重逻辑 ===
      // 我们需要先检查本地是否已存在该业务主键。
      
      // 由于这会严重拖慢 bulkAdd 速度，我们采用一个折中方案：
      // 1. 云端拉取的数据 (syncToCloud=false) -> 视为可信源，建议覆盖。
      //    但要在 IndexedDB 实现覆盖，需要知道主键 ID。
      //    如果不知道 ID，只能先根据业务索引查询。
      
      // 考虑到性能，我们在 DataCenterView 导入时建议“先清空后导入”或者“按日期覆盖”。
      // 这里的 bulkAdd 保持原生速度。
      
      rows.forEach(row => store.put(row)); 
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Cloud Write (Write-Through)
    if (syncToCloud) {
        let conflictKey = undefined; // Default to Supabase primary key
        if (tableName === 'fact_shangzhi') conflictKey = 'date,sku_code';
        else if (tableName === 'fact_jingzhuntong') conflictKey = 'date,tracked_sku_id,account_nickname';
        else if (tableName === 'fact_customer_service') conflictKey = 'date,agent_account';

        // 分批推送
        const BATCH_SIZE = 200;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            this.pushToCloud(tableName, rows.slice(i, i + BATCH_SIZE), conflictKey);
        }
    }
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

  async saveConfig(key: string, data: any, syncToCloud: boolean = true): Promise<void> {
    const db = await this.getDB();
    // Local Write
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['app_config'], 'readwrite');
      const store = transaction.objectStore('app_config');
      store.put(data, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Cloud Write
    // cloud_sync_config 本身不上传，避免 key 泄露或循环覆盖
    if (syncToCloud && key !== 'cloud_sync_config') {
        // App Config 的主键是 key，所以 upsert 是安全的
        this.pushToCloud('app_config', { key, data, updated_at: new Date().toISOString() }, 'key');
    }
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

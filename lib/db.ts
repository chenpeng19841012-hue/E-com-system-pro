
/**
 * Cloud-Native Database Adapter
 * v5.3.0 Upgrade: Direct Supabase Connection (No IndexedDB)
 * 
 * 1. 移除 IndexedDB，所有数据直接读写 Supabase。
 * 2. 使用 localStorage 存储连接配置 (Bootstrap Config)。
 * 3. 批量写入采用分片同步等待模式，确保上传成功。
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 辅助：延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 获取客户端 (从 localStorage 读取配置)
const getClient = (): SupabaseClient | null => {
    try {
        // 从 localStorage 读取启动配置
        const raw = localStorage.getItem('yunzhou_cloud_config');
        if (!raw) return null;
        const config = JSON.parse(raw);
        if (!config.url || !config.key) return null;
        return createClient(config.url, config.key);
    } catch (e) {
        return null;
    }
};

export const DB = {
  // 兼容旧接口：初始化 (在云原生模式下不需要做太多事)
  getDB(): Promise<any> {
    return Promise.resolve(true); 
  },

  // 获取云端客户端
  async getSupabase(): Promise<SupabaseClient | null> {
    return getClient();
  },

  // 已废弃：同步拉取 (直连模式下不需要)
  async syncPull(): Promise<boolean> {
    return true; 
  },

  // 核心：批量上传 (直接写入 Supabase) - 支持进度回调
  async bulkAdd(tableName: string, rows: any[], onProgress?: (percent: number) => void): Promise<void> {
    const supabase = getClient();
    if (!supabase) throw new Error("未配置云端连接，无法写入数据。请先在[云端同步]页面配置。");

    // 1. 确定冲突主键 (用于去重)
    let conflictKey = undefined;
    if (tableName === 'fact_shangzhi') conflictKey = 'date,sku_code';
    else if (tableName === 'fact_jingzhuntong') conflictKey = 'date,tracked_sku_id,account_nickname';
    else if (tableName === 'fact_customer_service') conflictKey = 'date,agent_account';
    else if (tableName === 'app_config') conflictKey = 'key';
    else if (tableName === 'dim_skus') conflictKey = 'id'; // 维度表通常用 ID 或 特定业务键

    // 2. 数据清洗 (移除本地临时字段，标准化日期)
    const cleanData = rows.map(({ id, ...rest }: any) => {
        // 如果是 fact 表，不要带 id 进去，让数据库自增 (除非是更新指定行)
        // 如果是 dim 表 (如 dim_skus)，可能需要保留 id
        const clean = { ...rest };
        
        // 只有非 fact 表才保留 id (用于覆盖更新)
        if (tableName.startsWith('fact_')) {
            delete clean.id; 
        }

        if (clean.date instanceof Date) clean.date = clean.date.toISOString().split('T')[0];
        // 确保 date 格式正确
        if (typeof clean.date === 'string' && clean.date.includes('T')) {
             clean.date = clean.date.split('T')[0];
        }
        
        clean.updated_at = new Date().toISOString(); 
        
        // 清理 undefined
        Object.keys(clean).forEach(key => { if (clean[key] === undefined) clean[key] = null; });
        return clean;
    });

    // 3. 分片上传 (Batch Upload) - 1000条/次
    const BATCH_SIZE = 1000;
    const total = cleanData.length;
    
    console.log(`[Cloud] 开始上传 ${tableName}, 共 ${total} 条...`);

    for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = cleanData.slice(i, i + BATCH_SIZE);
        
        // 坚决的重试机制
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
            try {
                const { error } = await supabase.from(tableName).upsert(chunk, { 
                    onConflict: conflictKey,
                    ignoreDuplicates: false // false = 遇到冲突执行更新 (Upsert)
                });
                
                if (error) throw error;
                success = true;
            } catch (e: any) {
                console.error(`[Cloud] 上传失败，重试中... (${retries})`, e.message);
                retries--;
                await sleep(1000); // 失败等待 1秒
                if (retries === 0) throw new Error(`云端写入失败: ${e.message}`);
            }
        }

        // 汇报进度
        if (onProgress) {
            const percent = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
            onProgress(percent);
        }
    }
  },

  // 读取配置
  async loadConfig<T>(key: string, defaultValue: T): Promise<T> {
    // 特殊：云连接配置直接读 localStorage
    if (key === 'cloud_sync_config') {
        const raw = localStorage.getItem('yunzhou_cloud_config');
        return raw ? JSON.parse(raw) : defaultValue;
    }

    const supabase = getClient();
    if (!supabase) return defaultValue;

    try {
        const { data, error } = await supabase.from('app_config').select('data').eq('key', key).single();
        if (error || !data) return defaultValue;
        return data.data as T;
    } catch (e) {
        return defaultValue;
    }
  },

  // 保存配置
  async saveConfig(key: string, data: any): Promise<void> {
    // 特殊：云连接配置写 localStorage
    if (key === 'cloud_sync_config') {
        localStorage.setItem('yunzhou_cloud_config', JSON.stringify(data));
        return;
    }

    const supabase = getClient();
    if (!supabase) return; // 如果没连接，无法保存业务配置

    const payload = {
        key,
        data,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('app_config').upsert(payload, { onConflict: 'key' });
    if (error) console.error("Config Save Error:", error);
  },

  // 获取全量数据 (用于计算) - 注意：大数据量可能会慢，后期需改为服务器端计算
  async getTableRows(tableName: string): Promise<any[]> {
    const supabase = getClient();
    if (!supabase) return [];

    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    // 简单分页拉取
    while (hasMore) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) {
            console.error("Fetch Error:", error);
            hasMore = false;
        } else if (data && data.length > 0) {
            allRows = allRows.concat(data);
            if (data.length < pageSize) hasMore = false;
            page++;
        } else {
            hasMore = false;
        }
    }
    return allRows;
  },

  // 获取时间范围数据
  async getRange(tableName: string, startDate: string, endDate: string): Promise<any[]> {
    const supabase = getClient();
    if (!supabase) return [];

    // 对于大表，为了防止前端崩塌，限制最大行数或使用分页
    // 这里为了演示完整性，做自动分页拉取
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 2000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error("Range Fetch Error:", error);
            hasMore = false; 
        } else if (data && data.length > 0) {
            allRows = allRows.concat(data);
            if (data.length < pageSize) hasMore = false;
            page++;
        } else {
            hasMore = false;
        }
    }
    return allRows;
  },

  // 删除数据
  async deleteRows(tableName: string, ids: any[]): Promise<void> {
    const supabase = getClient();
    if (!supabase) return;
    
    if (ids.length === 0) return;

    // 批量删除
    const { error } = await supabase.from(tableName).delete().in('id', ids);
    if (error) throw error;
  },

  // 清空表
  async clearTable(tableName: string): Promise<void> {
    const supabase = getClient();
    if (!supabase) return;
    // Supabase 不允许不带条件的 delete all，需要 hack 一下或用 Rpc
    // 这里使用 id > 0 
    const { error } = await supabase.from(tableName).delete().gt('id', 0);
    if (error) throw error;
  },
  
  // 辅助：获取所有 ID
  async getAllKeys(tableName: string): Promise<any[]> {
      // 云模式下不建议前端获取所有ID，返回空或仅用于特定逻辑
      return []; 
  },
  
  async getBatch(tableName: string, keys: any[]): Promise<any[]> {
      return [];
  }
};

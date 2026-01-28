
/**
 * Cloud-Native Database Adapter
 * v5.3.1 Upgrade: Enhanced Connection Stability & Singleton Pattern
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 辅助：延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 单例缓存，避免重复创建 Client
let supabaseInstance: SupabaseClient | null = null;

// 获取客户端 (从 localStorage 读取配置)
const getClient = (): SupabaseClient | null => {
    if (supabaseInstance) return supabaseInstance;

    try {
        // 从 localStorage 读取启动配置
        const raw = localStorage.getItem('yunzhou_cloud_config');
        if (!raw) {
            console.warn("[Yunzhou DB] No cloud config found in localStorage.");
            return null;
        }
        
        const config = JSON.parse(raw);
        // 增加 trim() 处理，防止复制粘贴时的首尾空格导致连接失败
        const url = config.url?.trim();
        const key = config.key?.trim();

        if (!url || !key) {
            console.warn("[Yunzhou DB] Incomplete cloud config.");
            return null;
        }

        supabaseInstance = createClient(url, key);
        return supabaseInstance;
    } catch (e: any) {
        console.error("[Yunzhou DB] Client Init Failed:", e);
        return null;
    }
};

export const DB = {
  // 强制重置连接（用于配置更新后）
  resetClient() {
      supabaseInstance = null;
  },

  // 兼容旧接口：初始化
  getDB(): Promise<any> {
    return Promise.resolve(true); 
  },

  // 获取云端客户端
  async getSupabase(): Promise<SupabaseClient | null> {
    return getClient();
  },

  // 已废弃：同步拉取
  async syncPull(): Promise<boolean> {
    return true; 
  },

  // 核心：批量上传 (直接写入 Supabase) - 支持进度回调
  async bulkAdd(tableName: string, rows: any[], onProgress?: (percent: number) => void): Promise<void> {
    const supabase = getClient();
    
    // 如果获取不到实例，尝试从 console 输出调试信息
    if (!supabase) {
        const raw = localStorage.getItem('yunzhou_cloud_config');
        const debugInfo = raw ? "Config exists but invalid" : "No config in localStorage";
        throw new Error(`未配置云端连接 (${debugInfo})。请前往[云端同步]页面重新保存配置。`);
    }

    // 1. 确定冲突主键 (用于去重)
    let conflictKey = undefined;
    if (tableName === 'fact_shangzhi') conflictKey = 'date,sku_code';
    else if (tableName === 'fact_jingzhuntong') conflictKey = 'date,tracked_sku_id,account_nickname';
    else if (tableName === 'fact_customer_service') conflictKey = 'date,agent_account';
    else if (tableName === 'app_config') conflictKey = 'key';
    else if (tableName === 'dim_skus') conflictKey = 'id';

    // 2. 数据清洗
    const cleanData = rows.map(({ id, ...rest }: any) => {
        const clean = { ...rest };
        if (tableName.startsWith('fact_')) {
            delete clean.id; 
        }
        if (clean.date instanceof Date) clean.date = clean.date.toISOString().split('T')[0];
        if (typeof clean.date === 'string' && clean.date.includes('T')) {
             clean.date = clean.date.split('T')[0];
        }
        clean.updated_at = new Date().toISOString(); 
        Object.keys(clean).forEach(key => { if (clean[key] === undefined) clean[key] = null; });
        return clean;
    });

    // 3. 分片上传 (Batch Upload) - 1000条/次
    const BATCH_SIZE = 1000;
    const total = cleanData.length;
    
    console.log(`[Cloud] 开始上传 ${tableName}, 共 ${total} 条...`);
    
    if (onProgress) onProgress(0);

    for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = cleanData.slice(i, i + BATCH_SIZE);
        
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
            try {
                const { error } = await supabase.from(tableName).upsert(chunk, { 
                    onConflict: conflictKey,
                    ignoreDuplicates: false 
                });
                
                if (error) throw error;
                success = true;
            } catch (e: any) {
                console.error(`[Cloud] 上传失败，重试中... (${retries})`, e.message);
                retries--;
                await sleep(1500); // 增加失败等待时间
                if (retries === 0) throw new Error(`云端写入失败: ${e.message}`);
            }
        }

        if (onProgress) {
            const percent = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
            onProgress(percent);
        }
    }
  },

  // 读取配置
  async loadConfig<T>(key: string, defaultValue: T): Promise<T> {
    if (key === 'cloud_sync_config') {
        try {
            const raw = localStorage.getItem('yunzhou_cloud_config');
            return raw ? JSON.parse(raw) : defaultValue;
        } catch {
            return defaultValue;
        }
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
    if (key === 'cloud_sync_config') {
        localStorage.setItem('yunzhou_cloud_config', JSON.stringify(data));
        // 重置单例，确保下次 getClient 使用新配置
        supabaseInstance = null;
        return;
    }

    const supabase = getClient();
    if (!supabase) return; 

    const payload = {
        key,
        data,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('app_config').upsert(payload, { onConflict: 'key' });
    if (error) console.error("Config Save Error:", error);
  },

  // 获取全量数据 (用于计算)
  async getTableRows(tableName: string): Promise<any[]> {
    const supabase = getClient();
    if (!supabase) return [];

    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

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
    const { error } = await supabase.from(tableName).delete().in('id', ids);
    if (error) throw error;
  },

  // 清空表
  async clearTable(tableName: string): Promise<void> {
    const supabase = getClient();
    if (!supabase) return;
    const { error } = await supabase.from(tableName).delete().gt('id', 0);
    if (error) throw error;
  },
  
  async getAllKeys(tableName: string): Promise<any[]> { return []; },
  async getBatch(tableName: string, keys: any[]): Promise<any[]> { return []; }
};

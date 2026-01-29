
/**
 * Cloud-Native Database Adapter
 * v5.5.0 Upgrade: Real-time Speed Calculation & Anti-Freeze Logic
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 默认演示配置 (兜底策略)
const DEFAULT_FALLBACK_URL = "https://stycaaqvjbjnactxcvyh.supabase.co";
const DEFAULT_FALLBACK_KEY = "sb_publishable_m4yyJRlDY107a3Nkx6Pybw_6Mdvxazn";

// 辅助：延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 单例缓存
let supabaseInstance: SupabaseClient | null = null;
let memoryCloudConfig: { url: string; key: string } | null = null;

const getClient = (): SupabaseClient | null => {
    if (supabaseInstance) return supabaseInstance;

    let config = memoryCloudConfig;

    // 1. 优先检查 Vercel 环境变量
    if (!config && process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        config = { 
            url: process.env.SUPABASE_URL.replace(/"/g, '').trim(), 
            key: process.env.SUPABASE_KEY.replace(/"/g, '').trim() 
        };
        memoryCloudConfig = config;
    }

    // 2. 检查 LocalStorage
    if (!config) {
        try {
            const raw = localStorage.getItem('yunzhou_cloud_config');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.url && parsed.key) {
                    config = { url: parsed.url.trim(), key: parsed.key.trim() };
                    memoryCloudConfig = config;
                }
            }
        } catch (e) {
            console.error("[Yunzhou DB] LocalStorage Config Load Error:", e);
        }
    }

    // 3. 兜底
    if (!config) {
        config = { url: DEFAULT_FALLBACK_URL, key: DEFAULT_FALLBACK_KEY };
        memoryCloudConfig = config;
    }

    if (!config || !config.url || !config.key) return null;

    try {
        supabaseInstance = createClient(config.url, config.key, {
            auth: { persistSession: false },
            db: { schema: 'public' },
            global: { headers: { 'x-application-name': 'yunzhou-ecom' } }
        });
        return supabaseInstance;
    } catch (e: any) {
        console.error("[Yunzhou DB] Client Create Failed:", e);
        return null;
    }
};

export const DB = {
  resetClient() {
      supabaseInstance = null;
      memoryCloudConfig = null;
  },

  getDB(): Promise<any> { return Promise.resolve(true); },

  async getSupabase(): Promise<SupabaseClient | null> {
    return getClient();
  },

  // [新增] 轻量级获取表统计信息 (行数 + 最新日期)
  async getTableSummary(tableName: string): Promise<{ count: number, latestDate: string }> {
      const supabase = getClient();
      if (!supabase) return { count: 0, latestDate: 'N/A' };

      try {
          // 1. 获取总行数 (使用 count: 'exact', head: true 不下载数据)
          const { count, error: countError } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
          
          if (countError) throw countError;

          // 2. 获取最新日期 (只取 1 行)
          const { data: dateData, error: dateError } = await supabase.from(tableName)
              .select('date')
              .order('date', { ascending: false })
              .limit(1);

          let latest = 'N/A';
          if (!dateError && dateData && dateData.length > 0) {
              latest = dateData[0].date;
          }

          return { count: count || 0, latestDate: latest };
      } catch (e) {
          console.error(`[DB] Failed to get summary for ${tableName}`, e);
          return { count: 0, latestDate: 'N/A' };
      }
  },

  // [升级] 支持复杂筛选的云端查询
  async queryData(tableName: string, filters: { 
      startDate?: string, 
      endDate?: string, 
      sku?: string, // 支持模糊搜索
      shopName?: string 
  }, limit = 100): Promise<any[]> {
      const supabase = getClient();
      if (!supabase) return [];

      let query = supabase.from(tableName).select('*');

      if (filters.startDate) query = query.gte('date', filters.startDate);
      if (filters.endDate) query = query.lte('date', filters.endDate);
      
      if (filters.shopName && filters.shopName !== 'all') {
          query = query.eq('shop_name', filters.shopName);
      }

      // SKU 模糊搜索 (对 fact 表可能需要关联或直接搜字段)
      if (filters.sku) {
          // 简单实现：尝试在 sku_code / tracked_sku_id / product_id 中搜索
          // 注意：Supabase 的 or 语法需要特定格式
          if (tableName === 'fact_shangzhi') {
              query = query.or(`sku_code.ilike.%${filters.sku}%,product_name.ilike.%${filters.sku}%`);
          } else if (tableName === 'fact_jingzhuntong') {
              query = query.or(`tracked_sku_id.ilike.%${filters.sku}%`);
          }
      }

      const { data, error } = await query.order('date', { ascending: false }).limit(limit);
      
      if (error) {
          console.error("[DB] Query Error:", error);
          return [];
      }
      return data || [];
  },

  // 核心上传逻辑：支持详细进度回调 (current, total)
  async bulkAdd(tableName: string, rows: any[], onProgress?: (current: number, total: number) => void): Promise<void> {
    const supabase = getClient();
    if (!supabase) throw new Error(`云端连接初始化失败 (Supabase Client is null)。请检查配置。`);

    let conflictKey = undefined;
    if (tableName === 'fact_shangzhi') conflictKey = 'date,sku_code';
    // [Updated] Jingzhuntong now uses quadruple key: date + account + sku + cost
    else if (tableName === 'fact_jingzhuntong') conflictKey = 'date,account_nickname,tracked_sku_id,cost';
    else if (tableName === 'fact_customer_service') conflictKey = 'date,agent_account';
    else if (tableName === 'app_config') conflictKey = 'key';
    else if (tableName === 'dim_skus') conflictKey = 'id';

    // 数据清洗 (Secondary Safety Net)
    const cleanData = rows.map(({ id, ...rest }: any) => {
        const clean = { ...rest };
        if (tableName.startsWith('fact_')) { delete clean.id; }
        // 强制转换日期格式，防止 Supabase 报错
        if (clean.date instanceof Date) clean.date = clean.date.toISOString().split('T')[0];
        if (typeof clean.date === 'string' && clean.date.includes('T')) { clean.date = clean.date.split('T')[0]; }
        
        clean.updated_at = new Date().toISOString(); 
        // 移除 undefined，转换 null
        Object.keys(clean).forEach(key => { 
            if (clean[key] === undefined) clean[key] = null; 
            // 确保 account_nickname 存在，否则联合主键会失败
            if (key === 'account_nickname' && !clean[key]) clean[key] = 'default';
        });
        return clean;
    });

    const total = cleanData.length;
    let processed = 0;
    
    // 初始批量大小
    let currentBatchSize = 100; 

    if (onProgress) onProgress(0, total);

    while (processed < total) {
        // 动态切片
        const chunk = cleanData.slice(processed, processed + currentBatchSize);
        if (chunk.length === 0) break;

        let retries = 3;
        let success = false;
        let lastError: any = null;
        
        while (retries > 0 && !success) {
            try {
                // ignoreDuplicates: false 确保 upsert 生效（更新旧数据）
                const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: conflictKey, ignoreDuplicates: false });
                
                if (error) {
                    // 如果是 413 (Payload Too Large) 或 5xx 错误，尝试减小 Batch Size
                    if (error.code === '413' || error.message.includes('Payload') || parseInt(error.code) >= 500) {
                        throw { isSizeIssue: true, originalError: error };
                    }
                    throw error;
                }
                
                success = true;
                processed += chunk.length;
                
                // 如果成功且批量很小，尝试慢慢恢复
                if (currentBatchSize < 200) currentBatchSize = Math.min(200, currentBatchSize * 2);

            } catch (e: any) {
                lastError = e;
                
                // 遇到容量/超时问题，立即降级
                if (e.isSizeIssue || e.message?.includes('timeout') || e.message?.includes('fetch')) {
                    console.warn(`[Cloud] Batch too large or timeout. Reducing size from ${currentBatchSize} to ${Math.max(10, Math.floor(currentBatchSize / 2))}`);
                    currentBatchSize = Math.max(10, Math.floor(currentBatchSize / 2));
                    // 不扣减 retries，直接用新 size 重试当前 processed 游标
                    break; 
                }

                console.error(`[Cloud Upload] Retry ${retries} failed:`, e);
                retries--;
                await sleep(1000 + Math.random() * 1000);
            }
        }

        if (!success && lastError && !lastError.isSizeIssue) {
            // 如果不是因为 Size 问题导致的失败，那就是硬伤（权限、格式），直接抛出
            const msg = lastError?.message || JSON.stringify(lastError);
            const hint = lastError?.hint || '';
            const details = lastError?.details || '';
            
            if (lastError?.code === '42501') {
                throw new Error(`权限不足 (RLS Policy Violation)。请在 Supabase 执行 SQL 脚本授予匿名写入权限。`);
            }
            
            throw new Error(`写入中断 (Row ${processed + 1}): ${msg} ${hint} ${details}`);
        }

        if (onProgress) {
            onProgress(processed, total);
        }

        // [关键] 释放主线程，防止浏览器在百万行处理时假死
        await new Promise(r => setTimeout(r, 5));
    }
  },

  async loadConfig<T>(key: string, defaultValue: T): Promise<T> {
    // 强制刷新 Config 逻辑，确保能读到环境变量
    if (key === 'cloud_sync_config') {
        const envUrl = process.env.SUPABASE_URL;
        const envKey = process.env.SUPABASE_KEY;
        
        if (envUrl && envKey) {
            return { 
                url: envUrl.replace(/"/g, '').trim(), 
                key: envKey.replace(/"/g, '').trim(), 
                isEnv: true 
            } as unknown as T;
        }
        
        if (memoryCloudConfig) return memoryCloudConfig as unknown as T;
        try {
            const raw = localStorage.getItem('yunzhou_cloud_config');
            return raw ? JSON.parse(raw) : defaultValue;
        } catch { return defaultValue; }
    }

    const supabase = getClient();
    if (!supabase) return defaultValue;

    try {
        const { data, error } = await supabase.from('app_config').select('data').eq('key', key).single();
        if (error || !data) return defaultValue;
        return data.data as T;
    } catch (e) { return defaultValue; }
  },

  async saveConfig(key: string, data: any): Promise<void> {
    if (key === 'cloud_sync_config') {
        memoryCloudConfig = data; 
        localStorage.setItem('yunzhou_cloud_config', JSON.stringify(data));
        supabaseInstance = null; // 重置实例
        return;
    }

    const supabase = getClient();
    if (!supabase) return; 

    const payload = { key, data, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('app_config').upsert(payload, { onConflict: 'key' });
    if (error) console.error("Config Save Error:", error);
  },

  // 深度诊断：真实写入测试
  async diagnoseConnection(): Promise<{ step: string, status: 'ok'|'fail'|'warn', msg: string }[]> {
      const results = [];
      
      // 1. Client Init
      const supabase = getClient();
      if (!supabase) {
          return [{ step: '客户端初始化', status: 'fail', msg: '无法创建 Supabase 客户端，URL/Key 为空' }];
      }
      results.push({ step: '客户端初始化', status: 'ok', msg: 'Supabase JS Client 已就绪' });

      // 2. Read Test
      const t1 = Date.now();
      const { data, error: readError } = await supabase.from('app_config').select('key').limit(1);
      if (readError) {
          // 如果表不存在
          if (readError.code === '42P01') {
              return [...results, { step: '读取测试', status: 'fail', msg: '连接成功，但数据库表未初始化 (Table not found)。请运行 SQL 脚本。' }];
          }
          return [...results, { step: '读取测试', status: 'fail', msg: `读取失败 [${readError.code}]: ${readError.message}` }];
      }
      results.push({ step: '读取测试', status: 'ok', msg: `读取成功 (延迟 ${Date.now() - t1}ms)` });

      // 3. Write Test (Crucial)
      const t2 = Date.now();
      const testPayload = { key: 'sys_write_test', data: { ts: t2, browser: navigator.userAgent }, updated_at: new Date().toISOString() };
      const { error: writeError } = await supabase.from('app_config').upsert(testPayload);
      
      if (writeError) {
          if (writeError.code === '42501') {
               results.push({ step: '写入测试 (RLS)', status: 'fail', msg: '权限拒绝！RLS 策略禁止了写入。请在 Supabase SQL Editor 执行提供的修复脚本。' });
          } else {
               results.push({ step: '写入测试', status: 'fail', msg: `写入失败 [${writeError.code}]: ${writeError.message}` });
          }
      } else {
          results.push({ step: '写入测试', status: 'ok', msg: `写入成功 (延迟 ${Date.now() - t2}ms)` });
          
          // Cleanup
          await supabase.from('app_config').delete().eq('key', 'sys_write_test');
      }

      return results;
  },

  async getRange(tableName: string, startDate: string, endDate: string): Promise<any[]> {
    const supabase = getClient();
    if (!supabase) return [];
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 2000;
    let hasMore = true;
    while (hasMore) {
        const { data, error } = await supabase.from(tableName).select('*').gte('date', startDate).lte('date', endDate).range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) { hasMore = false; } 
        else if (data && data.length > 0) {
            allRows = allRows.concat(data);
            if (data.length < pageSize) hasMore = false;
            page++;
        } else { hasMore = false; }
    }
    return allRows;
  },

  async deleteRows(tableName: string, ids: any[]): Promise<void> {
    const supabase = getClient();
    if (!supabase) return;
    if (ids.length === 0) return;
    const { error } = await supabase.from(tableName).delete().in('id', ids);
    if (error) throw error;
  },

  async clearTable(tableName: string): Promise<void> {
    const supabase = getClient();
    if (!supabase) return;
    const { error } = await supabase.from(tableName).delete().gt('id', 0);
    if (error) throw error;
  }
};

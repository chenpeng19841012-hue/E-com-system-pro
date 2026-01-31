/**
 * Cloud-Native Database Adapter
 * v5.7.0 Upgrade: Robust Network Handling & Retry Logic
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

  async getTableSummary(tableName: string): Promise<{ count: number, latestDate: string }> {
      const supabase = getClient();
      if (!supabase) return { count: 0, latestDate: 'N/A' };

      try {
          const { count, error: countError } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
          if (countError) throw countError;

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

  async queryData(tableName: string, filters: { 
      startDate?: string, 
      endDate?: string, 
      sku?: string, 
      shopName?: string,
      qualityFilter?: 'date_issue' | 'duplicates' | 'all'
  }, limit = 100): Promise<any[]> {
      const supabase = getClient();
      if (!supabase) return [];

      let query = supabase.from(tableName).select('*');

      // 质量筛选：时间异常
      if (filters.qualityFilter === 'date_issue') {
          // 查找 date 为 NULL 或 空字符串的情况
          // 注意：Supabase/Postgrest 并没有直接的 isNaN 检查，主要检查 NULL 和空值
          // 真正的格式错误通常在插入时已被 Schema 拦截，或者存储为非法 Date
          query = query.or('date.is.null,date.eq.""');
      } 
      // 质量筛选：重复数据 (此处不处理，由 getDuplicatePreview 处理)
      else {
          if (filters.startDate) query = query.gte('date', filters.startDate);
          if (filters.endDate) query = query.lte('date', filters.endDate);
          
          if (filters.shopName && filters.shopName !== 'all') {
              query = query.eq('shop_name', filters.shopName);
          }

          if (filters.sku) {
              if (tableName === 'fact_shangzhi') {
                  query = query.or(`sku_code.ilike.%${filters.sku}%,product_name.ilike.%${filters.sku}%`);
              } else if (tableName === 'fact_jingzhuntong') {
                  query = query.or(`tracked_sku_id.ilike.%${filters.sku}%`);
              }
          }
      }

      const { data, error } = await query.order('date', { ascending: false }).limit(limit);
      
      if (error) {
          console.error("[DB] Query Error:", error);
          return [];
      }
      return data || [];
  },

  // 获取重复数据预览 (最近 2000 条内检测)
  async getDuplicatePreview(tableName: string): Promise<any[]> {
      const supabase = getClient();
      if (!supabase) return [];
      
      // 获取最近的一批数据进行检测
      const { data, error } = await supabase.from(tableName).select('*').order('date', { ascending: false }).limit(2000);
      if (error || !data) return [];

      const seen = new Set<string>();
      const duplicates: any[] = [];

      data.forEach(row => {
          // 构建唯一指纹 (排除 id, created_at, updated_at)
          const { id, created_at, updated_at, ...rest } = row;
          // 对 keys 排序以确保稳定性
          const signature = JSON.stringify(rest, Object.keys(rest).sort());
          
          if (seen.has(signature)) {
              duplicates.push(row);
          } else {
              seen.add(signature);
          }
      });

      return duplicates;
  },

  // 执行全表去重
  async deduplicateTable(tableName: string, onProgress?: (processed: number, deleted: number) => void): Promise<number> {
      const supabase = getClient();
      if (!supabase) throw new Error("No connection");

      // 1. 分页拉取全量数据
      let allRows: any[] = [];
      let page = 0;
      const pageSize = 2000;
      let hasMore = true;
      let totalFetched = 0;

      while(hasMore) {
          const { data, error } = await supabase.from(tableName).select('*').range(page * pageSize, (page + 1) * pageSize - 1);
          if (error || !data || data.length === 0) { hasMore = false; break; }
          
          allRows = allRows.concat(data);
          totalFetched += data.length;
          
          if (data.length < pageSize) hasMore = false;
          page++;
          
          if (onProgress) onProgress(totalFetched, 0);
          await sleep(20); // 避免主线程卡顿
      }

      // 2. 内存中识别重复项
      const map = new Map<string, number>(); // Signature -> ID (keep the largest/latest ID)
      const idsToDelete: number[] = [];

      allRows.forEach(r => {
          const { id, created_at, updated_at, ...rest } = r;
          const signature = JSON.stringify(rest, Object.keys(rest).sort());

          if (map.has(signature)) {
              // 已存在，比较 ID
              const existingId = map.get(signature)!;
              if (r.id > existingId) {
                  // 当前 ID 更大（通常意味着更新），保留当前，删除旧的
                  idsToDelete.push(existingId);
                  map.set(signature, r.id);
              } else {
                  // 当前 ID 较小，删除当前
                  idsToDelete.push(r.id);
              }
          } else {
              map.set(signature, r.id);
          }
      });

      // 3. 批量删除
      if (idsToDelete.length > 0) {
          const CHUNK_SIZE = 500;
          for (let i = 0; i < idsToDelete.length; i += CHUNK_SIZE) {
              const chunk = idsToDelete.slice(i, i + CHUNK_SIZE);
              await supabase.from(tableName).delete().in('id', chunk);
              if (onProgress) onProgress(totalFetched, Math.min(i + CHUNK_SIZE, idsToDelete.length));
              await sleep(50);
          }
      }

      return idsToDelete.length;
  },

  // 核心上传逻辑：重构为稳健的光标循环模式
  async bulkAdd(tableName: string, rows: any[], onProgress?: (current: number, total: number) => void): Promise<void> {
    const supabase = getClient();
    if (!supabase) throw new Error(`云端连接初始化失败 (Supabase Client is null)。请检查配置。`);

    let conflictKey = undefined;
    if (tableName === 'fact_shangzhi') conflictKey = 'date,sku_code';
    else if (tableName === 'fact_jingzhuntong') conflictKey = 'date,account_nickname,tracked_sku_id,cost';
    else if (tableName === 'fact_customer_service') conflictKey = 'date,agent_account';
    else if (tableName === 'app_config') conflictKey = 'key';
    else if (tableName === 'dim_skus') conflictKey = 'id';

    // 数据清洗
    const cleanData = rows.map(({ id, ...rest }: any) => {
        const clean = { ...rest };
        if (tableName.startsWith('fact_')) { delete clean.id; }
        
        if (clean.date instanceof Date) clean.date = clean.date.toISOString().split('T')[0];
        if (typeof clean.date === 'string' && clean.date.includes('T')) { clean.date = clean.date.split('T')[0]; }
        
        clean.updated_at = new Date().toISOString(); 
        
        Object.keys(clean).forEach(key => { 
            const val = clean[key];
            if (val === undefined) {
                clean[key] = null; 
            } else if (typeof val === 'number') {
                if (!isFinite(val) || isNaN(val)) clean[key] = 0;
            }
            if (key === 'account_nickname' && !clean[key]) clean[key] = 'default';
        });
        return clean;
    });

    const total = cleanData.length;
    let processed = 0;
    
    // 初始保守批次大小，遇到错误自动减半
    let currentBatchSize = 20; 

    if (onProgress) onProgress(0, total);

    while (processed < total) {
        // 动态切片：每次循环重新计算 slice，确保 currentBatchSize 变化即时生效
        const chunk = cleanData.slice(processed, processed + currentBatchSize);
        if (chunk.length === 0) break;

        try {
            // 每次写入前短暂休眠，防止浏览器主线程或网络拥塞
            await sleep(50);

            const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: conflictKey, ignoreDuplicates: false });
            
            if (error) {
                // 将 API 错误包装抛出，以便 catch 统一处理降级逻辑
                throw error;
            }
            
            // 成功：推进光标
            processed += chunk.length;
            if (onProgress) onProgress(processed, total);
            
            // 慢启动策略：成功后尝试缓慢增加批次，上限 100
            if (currentBatchSize < 100) {
                currentBatchSize = Math.min(100, Math.ceil(currentBatchSize * 1.1));
            }

        } catch (e: any) {
            // 捕获所有错误（包括 NetworkError, FetchError, 413 Payload Too Large 等）
            console.warn(`[Cloud Sync] Batch failed (Size: ${currentBatchSize}, Row: ${processed}). Error:`, e);

            // 检查是否为网络/容量相关错误
            const isNetworkOrSizeIssue = 
                e.code === '413' || // Payload Too Large
                e.message?.includes('Payload') || 
                e.message?.includes('NetworkError') || 
                e.message?.includes('fetch') ||
                e.message?.includes('Failed to fetch') ||
                e.name === 'TypeError'; // fetch 失败通常是 TypeError

            if (isNetworkOrSizeIssue && currentBatchSize > 1) {
                // 策略：降级重试
                // 不推进 processed 光标，只减小 batch size，下一次循环会处理相同数据但更小的块
                currentBatchSize = Math.max(1, Math.floor(currentBatchSize / 2));
                console.log(`[Cloud Sync] Downgrading batch size to ${currentBatchSize} and retrying...`);
                
                // 避让等待
                await sleep(1000);
                continue; // 重新开始循环
            } else {
                // 无法降级或非网络错误（如权限不足、字段缺失），抛出致命错误中断流程
                const msg = e?.message || JSON.stringify(e);
                let userMsg = `写入中断 (Row ${processed + 1}): ${msg}`;
                
                if (e?.code === '42501') {
                    userMsg = `权限不足 (RLS Policy Violation)。请在 Supabase 执行 SQL 脚本授予匿名写入权限。`;
                } else if (e?.code === 'PGRST204') {
                    userMsg = `列名匹配失败: 数据库中缺少字段。${e.details || e.hint || ''}`;
                }
                
                throw new Error(userMsg);
            }
        }
    }
  },

  async loadConfig<T>(key: string, defaultValue: T): Promise<T> {
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
        supabaseInstance = null; 
        return;
    }

    const supabase = getClient();
    if (!supabase) return; 

    const payload = { key, data, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('app_config').upsert(payload, { onConflict: 'key' });
    if (error) console.error("Config Save Error:", error);
  },

  async diagnoseConnection(): Promise<{ step: string, status: 'ok'|'fail'|'warn', msg: string }[]> {
      const results = [];
      const supabase = getClient();
      if (!supabase) {
          return [{ step: '客户端初始化', status: 'fail', msg: '无法创建 Supabase 客户端，URL/Key 为空' }];
      }
      results.push({ step: '客户端初始化', status: 'ok', msg: 'Supabase JS Client 已就绪' });

      const t1 = Date.now();
      const { data, error: readError } = await supabase.from('app_config').select('key').limit(1);
      if (readError) {
          if (readError.code === '42P01') {
              return [...results, { step: '读取测试', status: 'fail', msg: '连接成功，但数据库表未初始化 (Table not found)。请运行 SQL 脚本。' }];
          }
          return [...results, { step: '读取测试', status: 'fail', msg: `读取失败 [${readError.code}]: ${readError.message}` }];
      }
      results.push({ step: '读取测试', status: 'ok', msg: `读取成功 (延迟 ${Date.now() - t1}ms)` });

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
          await supabase.from('app_config').delete().eq('key', 'sys_write_test');
      }
      return results;
  },

  async getRange(tableName: string, startDate: string, endDate: string, skuCodes?: string[]): Promise<any[]> {
    const supabase = getClient();
    if (!supabase) return [];
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 2000;
    let hasMore = true;
    while (hasMore) {
        let query = supabase.from(tableName).select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (skuCodes && skuCodes.length > 0) {
            if (tableName === 'fact_shangzhi') {
                const quotedSkuCodes = skuCodes.map(c => `"${c}"`).join(',');
                const orFilter = `sku_code.in.(${quotedSkuCodes}),product_id.in.(${quotedSkuCodes})`;
                query = query.or(orFilter);
            } else if (tableName === 'fact_jingzhuntong') {
                query = query.in('tracked_sku_id', skuCodes);
            }
        }
        
        const { data, error } = await query;
        if (error) { 
            console.error(`[DB getRange Error]`, error);
            hasMore = false; 
        } 
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
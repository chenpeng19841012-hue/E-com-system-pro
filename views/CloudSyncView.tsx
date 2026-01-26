
import React, { useState, useEffect } from 'react';
import { CloudSync, Download, UploadCloud, ShieldCheck, AlertCircle, RefreshCw, Database, Settings2, Code2, Copy, CheckCircle2, Activity, Terminal, Loader2 } from 'lucide-react';
import { DB } from '../lib/db';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = "https://stycaaqvjbjnactxcvyh.supabase.co";
const DEFAULT_KEY = "sb_publishable_m4yyJRlDY107a3Nkx6Pybw_6Mdvxazn";

export const CloudSyncView = ({ addToast }: any) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [autoSync, setAutoSync] = useState(false);
    const [showSql, setShowSql] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    // 进度追踪状态
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncStatus, setSyncStatus] = useState('');

    useEffect(() => {
        const loadSettings = async () => {
            const config = await DB.loadConfig('cloud_sync_config', { 
                url: DEFAULT_URL, 
                key: DEFAULT_KEY, 
                lastSync: null,
                autoSync: true 
            });
            setSupabaseUrl(config.url);
            setSupabaseKey(config.key);
            setLastSync(config.lastSync);
            setAutoSync(config.autoSync);
        };
        loadSettings();
    }, []);

    const saveSettings = async () => {
        await DB.saveConfig('cloud_sync_config', { 
            url: supabaseUrl, 
            key: supabaseKey, 
            lastSync,
            autoSync 
        });
        addToast('success', '配置已保存', '同步引擎参数已更新。');
        setConnectionStatus('idle');
    };

    const testConnection = async () => {
        if (!supabaseUrl || !supabaseKey) return;
        setConnectionStatus('testing');
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error } = await supabase.from('app_config').select('key').limit(1);
            if (error) {
                if (error.code === '42P01') throw new Error("云端数据库尚未初始化表。请执行下方的完整初始化脚本。");
                throw error;
            }
            setConnectionStatus('success');
            addToast('success', '连接测试成功', '云端数据库响应正常。');
        } catch (e: any) {
            setConnectionStatus('error');
            addToast('error', '连接失败', e.message);
        }
    };

    const handleCloudPush = async () => {
        if (!supabaseUrl || !supabaseKey) {
            addToast('error', '同步失败', '请先配置 Supabase 参数。');
            return;
        }
        
        setIsProcessing(true);
        setSyncProgress(0);
        setSyncStatus('正在扫描本地物理记录...');
        
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const tablesToSync = [
                { local: 'fact_shangzhi', remote: 'fact_shangzhi', conflict: 'date,sku_code', label: '商智销售表' },
                { local: 'fact_jingzhuntong', remote: 'fact_jingzhuntong', conflict: 'date,tracked_sku_id,account_nickname', label: '广告投放表' },
                { local: 'fact_customer_service', remote: 'fact_customer_service', conflict: 'date,agent_account', label: '客服接待表' }
            ];
            
            // 1. 先统计总行数用于百分比计算
            let totalRowsToSync = 0;
            const tableDataMap: Record<string, any[]> = {};
            for (const table of tablesToSync) {
                const data = await DB.getTableRows(table.local);
                tableDataMap[table.local] = data;
                totalRowsToSync += data.length;
            }

            if (totalRowsToSync === 0) {
                setSyncStatus('未检测到本地数据，同步终止。');
                setIsProcessing(false);
                return;
            }

            let processedRows = 0;

            // 2. 开始逐表同步
            for (const table of tablesToSync) {
                const localData = tableDataMap[table.local];
                if (localData.length === 0) continue;

                const cleanData = localData.map(({ id, ...rest }: any) => {
                    if (rest.date instanceof Date) rest.date = rest.date.toISOString().split('T')[0];
                    Object.keys(rest).forEach(key => {
                        if (rest[key] === undefined) rest[key] = null;
                    });
                    return rest;
                });

                const CHUNK_SIZE = 500; 
                for (let i = 0; i < cleanData.length; i += CHUNK_SIZE) {
                    const chunk = cleanData.slice(i, i + CHUNK_SIZE);
                    
                    setSyncStatus(`正在同步 ${table.label}: ${i} / ${localData.length} 行`);
                    
                    const { error } = await supabase
                        .from(table.remote)
                        .upsert(chunk, { onConflict: table.conflict });

                    if (error) {
                        if (error.message.includes("column") && error.message.includes("not found")) {
                            throw new Error(`云端表 [${table.remote}] 结构不兼容，缺少字段。请重新执行 SQL 脚本。`);
                        }
                        throw new Error(`[${table.remote}] 写入失败: ${error.message}`);
                    }
                    
                    processedRows += chunk.length;
                    setSyncProgress(Math.floor((processedRows / totalRowsToSync) * 100));
                }
            }

            // 3. 同步配置
            setSyncStatus('正在备份系统配置信息...');
            const configData = await DB.getAllConfigs();
            const configPayload = Object.entries(configData).map(([key, data]) => ({ key, data }));
            if (configPayload.length > 0) {
                await supabase.from('app_config').upsert(configPayload, { onConflict: 'key' });
            }

            const now = new Date().toLocaleString();
            setLastSync(now);
            setSyncProgress(100);
            setSyncStatus('同步任务圆满完成');
            await DB.saveConfig('cloud_sync_config', { url: supabaseUrl, key: supabaseKey, lastSync: now, autoSync });
            addToast('success', '同步成功', `已向云端同步 ${totalRowsToSync} 条完整业务记录。`);
        } catch (e: any) {
            console.error(e);
            setSyncStatus(`同步中断: ${e.message}`);
            addToast('error', '物理推送失败', e.message);
        } finally {
            setTimeout(() => {
                setIsProcessing(false);
                setSyncProgress(0);
                setSyncStatus('');
            }, 2000);
        }
    };

    const handleCloudPull = async () => {
        setIsProcessing(true);
        setSyncStatus('正在从云端拉取数据镜像...');
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const tables = ['fact_shangzhi', 'fact_jingzhuntong', 'fact_customer_service'];
            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*');
                if (error) throw error;
                if (data && data.length > 0) await DB.bulkAdd(table, data);
            }
            addToast('success', '拉取成功', '已从云端同步最新数据镜像。');
        } catch (e: any) {
            addToast('error', '拉取失败', e.message);
        } finally {
            setIsProcessing(false);
            setSyncStatus('');
        }
    };

    const sqlScript = `-- 运行前建议清空旧结构：
-- DROP TABLE IF EXISTS fact_shangzhi, fact_jingzhuntong, fact_customer_service, app_config;

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fact_shangzhi (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  sku_code TEXT NOT NULL,
  product_name TEXT,
  brand TEXT,
  category_l1 TEXT,
  category_l2 TEXT,
  category_l3 TEXT,
  shop_name TEXT,
  business_mode TEXT,
  pv INTEGER,
  uv INTEGER,
  pv_per_uv NUMERIC,
  avg_stay_duration NUMERIC,
  paid_users INTEGER,
  paid_conversion_rate NUMERIC,
  paid_orders INTEGER,
  paid_items INTEGER,
  paid_amount NUMERIC,
  paid_aov NUMERIC,
  add_to_cart_users INTEGER,
  add_to_cart_conversion_rate NUMERIC,
  add_to_cart_items INTEGER,
  product_id TEXT,
  item_number TEXT,
  product_followers INTEGER,
  paid_customers INTEGER,
  uv_value NUMERIC,
  last_listed_at TIMESTAMP WITH TIME ZONE,
  pdp_bounce_rate NUMERIC,
  search_impressions INTEGER,
  search_clicks INTEGER,
  search_ctr NUMERIC,
  predicted_sales_7d INTEGER,
  ordering_customers INTEGER,
  ordering_items INTEGER,
  order_amount NUMERIC,
  order_to_paid_conversion_rate NUMERIC,
  order_conversion_rate NUMERIC,
  pv_stock_rate NUMERIC,
  aov NUMERIC,
  price_per_item NUMERIC,
  refund_amount NUMERIC,
  refund_items INTEGER,
  refund_orders INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, sku_code)
);

CREATE TABLE IF NOT EXISTS fact_jingzhuntong (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  account_nickname TEXT,
  tracked_sku_id TEXT NOT NULL,
  tracked_sku_name TEXT,
  cost NUMERIC,
  clicks INTEGER,
  impressions INTEGER,
  ctr NUMERIC,
  cpm NUMERIC,
  cpc NUMERIC,
  direct_orders INTEGER,
  direct_order_amount NUMERIC,
  indirect_orders INTEGER,
  indirect_order_amount NUMERIC,
  total_orders INTEGER,
  total_order_amount NUMERIC,
  direct_add_to_cart INTEGER,
  indirect_add_to_cart INTEGER,
  total_add_to_cart INTEGER,
  conversion_rate NUMERIC,
  cost_per_order NUMERIC,
  roi NUMERIC,
  presale_orders INTEGER,
  presale_order_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, tracked_sku_id, account_nickname)
);

CREATE TABLE IF NOT EXISTS fact_customer_service (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  agent_account TEXT NOT NULL,
  inquiries INTEGER,
  chats INTEGER,
  no_response_count INTEGER,
  response_rate NUMERIC,
  response_rate_30s NUMERIC,
  satisfaction_rate NUMERIC,
  review_invitation_rate NUMERIC,
  avg_messages_per_chat NUMERIC,
  avg_chat_duration NUMERIC,
  avg_first_response_time NUMERIC,
  avg_response_time NUMERIC,
  message_assigned_count INTEGER,
  message_handled_count INTEGER,
  message_response_rate NUMERIC,
  resolution_rate NUMERIC,
  presale_chats_users INTEGER,
  converted_order_users INTEGER,
  converted_shipped_users INTEGER,
  converted_orders INTEGER,
  converted_shipped_orders INTEGER,
  converted_order_items INTEGER,
  converted_shipped_items INTEGER,
  converted_order_amount NUMERIC,
  converted_shipped_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, agent_account)
);

ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE fact_shangzhi DISABLE ROW LEVEL SECURITY;
ALTER TABLE fact_jingzhuntong DISABLE ROW LEVEL SECURITY;
ALTER TABLE fact_customer_service DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';`;

    return (
        <div className="p-8 max-w-[1400px] mx-auto animate-fadeIn space-y-8 pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">物理云同步</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase italic">Infrastructure Connectivity & Persistence</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                        connectionStatus === 'success' ? 'bg-green-50 border-green-200 text-green-600' :
                        connectionStatus === 'error' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                        <Activity size={12} className={connectionStatus === 'testing' ? 'animate-pulse' : ''} />
                        云端状态: {
                            connectionStatus === 'testing' ? '测试中...' :
                            connectionStatus === 'success' ? '正常连接' :
                            connectionStatus === 'error' ? '结构待更新' : '待测试'
                        }
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Settings2 size={20} className="text-[#70AD47]" />
                            同步参数配置
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Supabase API URL</label>
                                <input type="text" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} placeholder="https://xxx.supabase.co" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Service Role / Anon Key</label>
                                <input type="password" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47]" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={saveSettings} className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-black text-xs hover:bg-slate-700 transition-all">保存配置</button>
                                <button onClick={testConnection} className="px-6 py-3 rounded-xl border-2 border-slate-800 text-slate-800 font-black text-xs hover:bg-slate-50 transition-all">连通性测试</button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-[#0F172A] rounded-[32px] text-white border border-brand/20">
                        <div className="flex items-center gap-2 mb-4 text-[#70AD47]">
                            <Terminal size={18} />
                            <h4 className="text-sm font-black uppercase tracking-wider">更新 SQL 结构</h4>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-6">
                            若同步报错 "Column not found"，请在 Supabase SQL Editor 运行此脚本补全字段。
                        </p>
                        <button 
                            onClick={() => setShowSql(!showSql)}
                            className="w-full py-3 bg-[#70AD47] rounded-xl text-[11px] font-black text-white hover:bg-[#5da035] transition-all shadow-lg shadow-[#70AD47]/20"
                        >
                            {showSql ? '隐藏 SQL 脚本' : '查看 SQL 脚本'}
                        </button>
                        
                        {showSql && (
                            <div className="mt-4 bg-slate-800 rounded-2xl p-4 relative group">
                                <pre className="text-[9px] text-slate-300 font-mono overflow-x-auto max-h-[300px] leading-relaxed">
                                    {sqlScript}
                                </pre>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(sqlScript); addToast('success', '已复制', '请在 Supabase 中运行。'); }}
                                    className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
                                >
                                    <Copy size={14} className="text-white"/>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#70AD47]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-10">
                            <div className="flex-1 space-y-6">
                                <h3 className="text-4xl font-black text-slate-900">同步任务中心</h3>
                                <p className="text-slate-500 text-sm font-bold leading-relaxed max-w-xl">
                                    将本地 IndexedDB 存储的所有业务明细推送至云端 PostgreSQL。这允许您实现跨设备协作或使用外部 BI 工具。
                                </p>
                                
                                {isProcessing && (
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 animate-fadeIn space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">当前状态</p>
                                                <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                                    <Loader2 size={12} className="animate-spin text-[#70AD47]" />
                                                    {syncStatus}
                                                </p>
                                            </div>
                                            <p className="text-xl font-black text-[#70AD47]">{syncProgress}%</p>
                                        </div>
                                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#70AD47] transition-all duration-500 ease-out shadow-[0_0_12px_rgba(112,173,71,0.4)]"
                                                style={{ width: `${syncProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-4 pt-4">
                                    <button 
                                        onClick={handleCloudPush}
                                        disabled={isProcessing}
                                        className="px-10 py-5 rounded-[20px] bg-[#70AD47] text-white font-black text-sm flex items-center gap-3 hover:bg-[#5da035] shadow-2xl shadow-[#70AD47]/30 active:scale-95 disabled:bg-slate-200 disabled:shadow-none transition-all"
                                    >
                                        {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                                        执行全量推送
                                    </button>
                                    <button 
                                        onClick={handleCloudPull}
                                        disabled={isProcessing}
                                        className="px-10 py-5 rounded-[20px] bg-white text-slate-600 border border-slate-200 font-black text-sm flex items-center gap-3 hover:bg-slate-50 transition-all"
                                    >
                                        从云端拉取
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                            <Activity size={24} className="text-[#70AD47] mb-6" />
                            <h4 className="text-lg font-black text-slate-800">上次同步记录</h4>
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400">时间:</span>
                                    <span className="text-slate-700">{lastSync || '无数据'}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400">引擎状态:</span>
                                    <span className="text-green-600">双向对齐就绪</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-blue-600 rounded-[32px] text-white shadow-xl shadow-blue-100">
                             <ShieldCheck size={24} className="mb-6 opacity-80" />
                             <h4 className="text-lg font-black">安全性声明</h4>
                             <p className="mt-4 text-blue-50 text-[11px] font-bold leading-relaxed">
                                云同步使用标准 HTTPS 加密。您的本地数据在同步过程中仅通过安全通道写入您私有的 Supabase 实例。
                             </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

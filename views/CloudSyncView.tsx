
import React, { useState, useEffect } from 'react';
import { Settings2, ShieldCheck, Activity, Copy, Zap, Database, Server } from 'lucide-react';
import { DB } from '../lib/db';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = "https://stycaaqvjbjnactxcvyh.supabase.co";
const DEFAULT_KEY = "sb_publishable_m4yyJRlDY107a3Nkx6Pybw_6Mdvxazn";

export const CloudSyncView = ({ addToast }: any) => {
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [showSql, setShowSql] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            // 直接读取配置
            const config = await DB.loadConfig('cloud_sync_config', { 
                url: DEFAULT_URL, 
                key: DEFAULT_KEY, 
            });
            setSupabaseUrl(config.url || '');
            setSupabaseKey(config.key || '');
            if (config.url && config.key) {
                testConnection(config.url, config.key, true);
            }
        };
        loadSettings();
    }, []);

    const saveSettings = async () => {
        // 保存前去除首尾空格
        const trimmedUrl = supabaseUrl.trim();
        const trimmedKey = supabaseKey.trim();
        
        setSupabaseUrl(trimmedUrl);
        setSupabaseKey(trimmedKey);

        // 保存到 localStorage (Bootstrap config)
        await DB.saveConfig('cloud_sync_config', { url: trimmedUrl, key: trimmedKey });
        addToast('success', '配置已更新', '系统已重置数据库连接池。');
        testConnection(trimmedUrl, trimmedKey);
    };

    const testConnection = async (url: string, key: string, silent = false) => {
        if (!url || !key) return;
        setConnectionStatus('testing');
        try {
            const supabase = createClient(url, key);
            // 尝试读取配置表，如果表不存在代码是 42P01
            const { error } = await supabase.from('app_config').select('key').limit(1);
            
            if (error) {
                if (error.code === '42P01') throw new Error("连接成功，但数据库表未初始化。请执行下方的 SQL 脚本。");
                // P.S. 如果 RLS 没开，可能读不到数据但没有 error，也算成功
                throw error;
            }
            setConnectionStatus('success');
            if (!silent) addToast('success', '云端握手成功', '数据库连接正常，读写通道已建立。');
        } catch (e: any) {
            setConnectionStatus('error');
            if (!silent) addToast('error', '连接失败', e.message);
        }
    };

    // 毁灭性重置脚本
    const cleanSqlScript = `-- 云舟 (Yunzhou) 数据库初始化脚本 v5.3.0
-- ⚠️ 注意：这会清空并重建所有表，请谨慎执行！

-- 1. 重置表结构
DROP TABLE IF EXISTS fact_shangzhi CASCADE;
DROP TABLE IF EXISTS fact_jingzhuntong CASCADE;
DROP TABLE IF EXISTS fact_customer_service CASCADE;
DROP TABLE IF EXISTS dim_viki_kb CASCADE;
DROP TABLE IF EXISTS dim_quoting_library CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;

-- 2. 核心事实表 (Fact Tables)
-- 商智: 使用 (date + sku_code) 联合唯一索引实现去重
CREATE TABLE fact_shangzhi (
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
  paid_amount NUMERIC,
  paid_items INTEGER,
  paid_users INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, sku_code)
);

-- 广告: 使用 (date + tracked_sku_id + account_nickname) 联合唯一
CREATE TABLE fact_jingzhuntong (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  account_nickname TEXT,
  tracked_sku_id TEXT NOT NULL,
  cost NUMERIC,
  clicks INTEGER,
  impressions INTEGER,
  total_order_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, tracked_sku_id, account_nickname)
);

-- 客服: 使用 (date + agent_account) 联合唯一
CREATE TABLE fact_customer_service (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  agent_account TEXT NOT NULL,
  chats INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, agent_account)
);

-- 3. 配置与维度表 (Config & Dimensions)
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_viki_kb (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_quoting_library (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  model TEXT NOT NULL,
  price NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 权限设置 (允许匿名读写，方便快速部署)
ALTER TABLE fact_shangzhi ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_jingzhuntong ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_customer_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_viki_kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_quoting_library ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略 (生产环境建议修改)
CREATE POLICY "Public Access" ON fact_shangzhi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON fact_jingzhuntong FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON fact_customer_service FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON app_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON dim_viki_kb FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON dim_quoting_library FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
`;

    return (
        <div className="p-8 md:p-10 w-full animate-fadeIn space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">Cloud-Native Mode Active</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">数据库连接配置</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 italic">Direct Cloud Connection - No Local Caching</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                    connectionStatus === 'success' ? 'bg-green-50 border-green-200 text-green-600' :
                    connectionStatus === 'error' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                    'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                    <Activity size={12} className={connectionStatus === 'testing' ? 'animate-pulse' : ''} />
                    状态: {
                        connectionStatus === 'testing' ? '连接中...' :
                        connectionStatus === 'success' ? '已连接 (Connected)' :
                        connectionStatus === 'error' ? '连接断开' : '未配置'
                    }
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Settings2 size={20} className="text-[#70AD47]" />
                                Supabase 参数
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Supabase API URL</label>
                                <input type="text" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Service Role / Anon Key</label>
                                <input type="password" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47]" />
                            </div>
                            <button onClick={saveSettings} className="w-full py-3 rounded-xl bg-slate-800 text-white font-black text-xs hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                                <Zap size={14} /> 保存并连接
                            </button>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-200 text-slate-600">
                        <div className="flex items-center gap-2 mb-4 text-slate-800">
                            <Server size={20} />
                            <h4 className="text-sm font-black uppercase tracking-wider">架构变更说明</h4>
                        </div>
                        <p className="text-[11px] font-bold leading-relaxed opacity-80">
                            当前系统已切换至 <span className="text-brand">云原生 (Cloud-Native)</span> 模式。
                            <br/><br/>
                            数据不再存储于浏览器 IndexedDB，而是直接读写 Supabase 云数据库。
                            这意味着：
                            <br/>1. 彻底解决本地数据与云端不一致的问题。
                            <br/>2. 导入 Excel 时，系统会自动根据 SQL 唯一约束去重。
                            <br/>3. 网络延迟将直接影响页面加载速度。
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-[#0F172A] rounded-[32px] p-8 text-white border border-slate-700 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3 text-[#70AD47]">
                                <ShieldCheck size={20} />
                                <h4 className="text-sm font-black uppercase tracking-wider">数据库初始化脚本</h4>
                            </div>
                            <button onClick={() => setShowSql(!showSql)} className="px-4 py-2 bg-white/10 rounded-lg text-[10px] font-black hover:bg-white/20 transition-all">
                                {showSql ? '折叠' : '展开'}
                            </button>
                        </div>

                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-6 relative z-10">
                            如果您发现数据库表为空，或者数据异常，请复制下方 SQL 并在 Supabase SQL Editor 中执行以重置环境。
                        </p>

                        {showSql && (
                            <div className="relative z-10 animate-slideIn">
                                <div className="absolute top-4 right-4">
                                    <button onClick={() => { navigator.clipboard.writeText(cleanSqlScript); addToast('success', '复制成功', '请前往 Supabase SQL Editor 粘贴执行。'); }} className="p-2 bg-white/10 rounded-lg hover:bg-[#70AD47] transition-all text-white">
                                        <Copy size={14}/>
                                    </button>
                                </div>
                                <pre className="bg-black/50 p-6 rounded-2xl text-[10px] font-mono text-slate-300 overflow-x-auto max-h-[400px] leading-relaxed border border-white/5 custom-scrollbar">
                                    {cleanSqlScript}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

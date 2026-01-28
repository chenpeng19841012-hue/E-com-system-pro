
import React, { useState, useEffect } from 'react';
import { CloudSync, Settings2, ShieldCheck, Activity, Copy, KeyRound, UserCircle2, Zap } from 'lucide-react';
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
            const config = await DB.loadConfig('cloud_sync_config', { 
                url: DEFAULT_URL, 
                key: DEFAULT_KEY, 
            });
            setSupabaseUrl(config.url);
            setSupabaseKey(config.key);
        };
        loadSettings();
    }, []);

    const saveSettings = async () => {
        await DB.saveConfig('cloud_sync_config', { url: supabaseUrl, key: supabaseKey, lastSync: new Date().toISOString() });
        addToast('success', '配置已保存', '系统已切换至自动同步模式 (Auto-Sync Mode)。');
        testConnection();
    };

    const testConnection = async () => {
        if (!supabaseUrl || !supabaseKey) return;
        setConnectionStatus('testing');
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error } = await supabase.from('app_config').select('key').limit(1);
            if (error) {
                if (error.code === '42P01') throw new Error("云端数据库尚未初始化。请执行下方的重置 SQL 脚本。");
                throw error;
            }
            setConnectionStatus('success');
            addToast('success', '云端链路正常', '数据将实时自动同步。');
        } catch (e: any) {
            setConnectionStatus('error');
            addToast('error', '连接失败', e.message);
        }
    };

    // 毁灭性重置脚本
    const cleanSqlScript = `-- 云舟 (Yunzhou) 物理环境初始化脚本 (v5.2.7 DESTROY & REBUILD)
-- ⚠️ 警告：执行此脚本将清空所有现有数据！

-- 1. 彻底移除旧表 (Clean Slate)
DROP TABLE IF EXISTS fact_shangzhi CASCADE;
DROP TABLE IF EXISTS fact_jingzhuntong CASCADE;
DROP TABLE IF EXISTS fact_customer_service CASCADE;
DROP TABLE IF EXISTS dim_viki_kb CASCADE;
DROP TABLE IF EXISTS dim_quoting_library CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;

-- 2. 重建配置表
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID DEFAULT NULL
);

-- 3. 重建核心事实表
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
  user_id UUID DEFAULT NULL,
  UNIQUE(date, sku_code)
);

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
  user_id UUID DEFAULT NULL,
  UNIQUE(date, tracked_sku_id, account_nickname)
);

CREATE TABLE fact_customer_service (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  agent_account TEXT NOT NULL,
  chats INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID DEFAULT NULL,
  UNIQUE(date, agent_account)
);

-- 4. 重建维度表
CREATE TABLE dim_viki_kb (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID DEFAULT NULL
);

CREATE TABLE dim_quoting_library (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  model TEXT NOT NULL,
  price NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID DEFAULT NULL
);

-- 5. 开启 RLS 但允许匿名读写 (内部专用模式)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_shangzhi ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_jingzhuntong ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_customer_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_viki_kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_quoting_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access" ON app_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON fact_shangzhi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON fact_jingzhuntong FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON fact_customer_service FOR ALL USING (true) WITH CHECK (true);
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
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">全自动实时同步引擎 v5.2.7</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">异地同步中心</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 italic">Auto-Pilot Real-time Synchronization Hub</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                    connectionStatus === 'success' ? 'bg-green-50 border-green-200 text-green-600' :
                    connectionStatus === 'error' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                    'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                    <Activity size={12} className={connectionStatus === 'testing' ? 'animate-pulse' : ''} />
                    云端链路: {
                        connectionStatus === 'testing' ? '握手中...' :
                        connectionStatus === 'success' ? '实时在线 (Live)' :
                        connectionStatus === 'error' ? '断开' : '待机'
                    }
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Settings2 size={20} className="text-[#70AD47]" />
                                链路参数配置
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
                                <Zap size={14} /> 保存并激活自动同步
                            </button>
                        </div>
                    </div>

                    <div className="p-8 bg-blue-50 rounded-[32px] border border-blue-100 text-blue-900">
                        <div className="flex items-center gap-2 mb-4 text-blue-600">
                            <CloudSync size={20} />
                            <h4 className="text-sm font-black uppercase tracking-wider">实时同步机制说明</h4>
                        </div>
                        <ul className="text-[11px] font-bold space-y-3 opacity-80 leading-relaxed list-disc pl-4">
                            <li><span className="text-blue-700">Write-Through (写入即同步):</span> 任何在数据中心导入、SKU编辑或报价操作，都会即时触发后台静默上传。</li>
                            <li><span className="text-blue-700">Auto-Pull (心跳拉取):</span> 系统每 60 秒自动检查云端变更，确保多设备数据一致。</li>
                            <li><span className="text-blue-700">Micro-Batching (微切片):</span> 大文件导入时，系统会自动将数据切分为 50行/组 进行流式传输，永不阻塞界面。</li>
                        </ul>
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-[#0F172A] rounded-[32px] p-8 text-white border border-slate-700 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3 text-[#70AD47]">
                                <ShieldCheck size={20} />
                                <h4 className="text-sm font-black uppercase tracking-wider">数据库初始化 (SQL Console)</h4>
                            </div>
                            <button onClick={() => setShowSql(!showSql)} className="px-4 py-2 bg-white/10 rounded-lg text-[10px] font-black hover:bg-white/20 transition-all">
                                {showSql ? '折叠脚本' : '展开初始化脚本'}
                            </button>
                        </div>

                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-6 relative z-10">
                            请复制下方 SQL 脚本到 Supabase 的 SQL Editor 中执行。
                            <strong className="text-rose-400 block mt-1">注意：此脚本会先删除所有现有表，请谨慎操作！</strong>
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


import React, { useState, useEffect } from 'react';
import { Settings2, Activity, Copy, Zap, Lock, Stethoscope, CheckCircle, AlertTriangle, XCircle, Terminal, PlayCircle, RefreshCw } from 'lucide-react';
import { DB } from '../lib/db';

const DEFAULT_URL = "https://stycaaqvjbjnactxcvyh.supabase.co";
const DEFAULT_KEY = "sb_publishable_m4yyJRlDY107a3Nkx6Pybw_6Mdvxazn";

export const CloudSyncView = ({ addToast }: any) => {
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [isUsingEnv, setIsUsingEnv] = useState(false);
    
    // 诊断状态
    const [diagSteps, setDiagSteps] = useState<{ step: string; status: 'pending' | 'ok' | 'fail' | 'warn'; msg: string }[]>([]);
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [isReloadingCache, setIsReloadingCache] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const config: any = await DB.loadConfig('cloud_sync_config', { url: DEFAULT_URL, key: DEFAULT_KEY });
            if (config.isEnv) {
                setIsUsingEnv(true);
                setSupabaseUrl(config.url);
                setSupabaseKey('**********************'); 
                runDeepDiagnosis(); 
            } else {
                setSupabaseUrl(config.url || '');
                setSupabaseKey(config.key || '');
            }
        };
        loadSettings();
    }, []);

    const saveSettings = async () => {
        await DB.saveConfig('cloud_sync_config', { url: supabaseUrl.trim(), key: supabaseKey.trim() });
        addToast('success', '配置已更新', '连接池已重置。');
        runDeepDiagnosis();
    };

    const runDeepDiagnosis = async () => {
        setIsDiagnosing(true);
        setDiagSteps([{ step: '系统自检', status: 'pending', msg: '正在启动全链路诊断程序...' }]);
        
        try {
            // @ts-ignore
            const results = await DB.diagnoseConnection();
            setDiagSteps(results);
            
            const hasFail = results.some((r: any) => r.status === 'fail');
            if (hasFail) {
                addToast('error', '诊断发现异常', '请检查右侧 SQL 脚本或网络配置。');
            } else {
                addToast('success', '链路正常', '数据库读写通道畅通。');
            }
        } catch (e: any) {
            setDiagSteps([{ step: '致命错误', status: 'fail', msg: e.message }]);
        } finally {
            setIsDiagnosing(false);
        }
    };

    const handleForceReloadSchema = async () => {
        setIsReloadingCache(true);
        try {
            const supabase = await DB.getSupabase();
            if (!supabase) throw new Error("未连接云端");
            
            // 尝试调用 RPC
            const { error } = await supabase.rpc('reload_schema_cache');
            
            if (error) {
                // 如果 RPC 不存在，说明用户还没运行新脚本，回退到纯提示
                console.error("RPC Error:", error);
                throw new Error("请先执行右侧的 SQL 脚本以安装 'reload_schema_cache' 函数。");
            }
            
            addToast('success', '缓存刷新成功', 'API Schema Cache 已强制重载，请重试上传。');
        } catch (e: any) {
            addToast('error', '刷新失败', e.message);
        } finally {
            setIsReloadingCache(false);
        }
    };

    const cleanSqlScript = `-- 云舟 (Yunzhou) 数据库终极修复脚本 v5.7.0
-- ✅ 包含所有缺失列 (add_to_cart_conversion_rate 等)
-- ✅ 安装 RPC 函数以支持前端强制刷新缓存

-- 1. [关键] 安装缓存刷新函数 (RPC)
CREATE OR REPLACE FUNCTION reload_schema_cache()
RETURNS void AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql;

-- 2. 确保核心表存在
CREATE TABLE IF NOT EXISTS fact_shangzhi (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  sku_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, sku_code)
);

CREATE TABLE IF NOT EXISTS fact_jingzhuntong (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  tracked_sku_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, tracked_sku_id) 
);

CREATE TABLE IF NOT EXISTS fact_customer_service (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  agent_account TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, agent_account)
);

CREATE TABLE IF NOT EXISTS dim_quoting_library (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  model TEXT NOT NULL,
  price NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 全量字段补丁 (Fact Shangzhi - 重点修复 add_to_cart_conversion_rate)
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS category_l1 TEXT;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS category_l2 TEXT;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS category_l3 TEXT;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS business_mode TEXT;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS pv INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS uv INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS pv_per_uv NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS avg_stay_duration NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS paid_amount NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS paid_items INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS paid_users INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS paid_orders INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS paid_conversion_rate NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS paid_aov NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS add_to_cart_users INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS add_to_cart_conversion_rate NUMERIC; -- 关键修复
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS add_to_cart_items INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS item_number TEXT;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS product_followers INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS paid_customers INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS uv_value NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS last_listed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS pdp_bounce_rate NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS search_impressions INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS search_clicks INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS search_ctr NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS predicted_sales_7d INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS ordering_customers INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS ordering_items INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS order_amount NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS order_to_paid_conversion_rate NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS order_conversion_rate NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS pv_stock_rate NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS aov NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS price_per_item NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS refund_amount NUMERIC;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS refund_items INTEGER;
ALTER TABLE fact_shangzhi ADD COLUMN IF NOT EXISTS refund_orders INTEGER;

-- 4. 全量字段补丁 (Fact Jingzhuntong)
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS account_nickname TEXT;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS tracked_sku_name TEXT;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS cost NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS clicks INTEGER;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS impressions INTEGER;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS ctr NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS cpm NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS cpc NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS direct_orders INTEGER;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS direct_order_amount NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS indirect_orders INTEGER;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS indirect_order_amount NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS total_orders INTEGER;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS total_order_amount NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS direct_add_to_cart INTEGER;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS indirect_add_to_cart INTEGER;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS total_add_to_cart INTEGER;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS cost_per_order NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS roi NUMERIC;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS presale_orders INTEGER;
ALTER TABLE fact_jingzhuntong ADD COLUMN IF NOT EXISTS presale_order_amount NUMERIC;

-- 5. 全量字段补丁 (Fact Customer Service)
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS inquiries INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS chats INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS no_response_count INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS response_rate NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS response_rate_30s NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS satisfaction_rate NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS review_invitation_rate NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS avg_messages_per_chat NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS avg_chat_duration NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS avg_first_response_time NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS avg_response_time NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS message_assigned_count INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS message_handled_count INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS message_response_rate NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS resolution_rate NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS presale_chats_users INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS converted_order_users INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS converted_shipped_users INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS converted_orders INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS converted_shipped_orders INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS converted_order_items INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS converted_shipped_items INTEGER;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS converted_order_amount NUMERIC;
ALTER TABLE fact_customer_service ADD COLUMN IF NOT EXISTS converted_shipped_amount NUMERIC;

-- 6. 确保 RLS 和 权限
ALTER TABLE fact_shangzhi ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_jingzhuntong ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_customer_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_quoting_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access Shangzhi" ON fact_shangzhi;
DROP POLICY IF EXISTS "Public Access Jzt" ON fact_jingzhuntong;
DROP POLICY IF EXISTS "Public Access CS" ON fact_customer_service;
DROP POLICY IF EXISTS "Public Access Quotes" ON dim_quoting_library;
DROP POLICY IF EXISTS "Public Access Config" ON app_config;

CREATE POLICY "Public Access Shangzhi" ON fact_shangzhi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Jzt" ON fact_jingzhuntong FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access CS" ON fact_customer_service FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Quotes" ON dim_quoting_library FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Config" ON app_config FOR ALL USING (true) WITH CHECK (true);

-- 7. 授予匿名权限 (包含函数调用权限)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION reload_schema_cache TO anon;

-- 8. 立即刷新缓存
SELECT reload_schema_cache();
NOTIFY pgrst, 'reload schema';
`;

    return (
        <div className="p-8 md:p-10 w-full animate-fadeIn space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">Cloud-Native Mode Active</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">数据库连接与诊断</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 italic">Direct Cloud Connection & Health Check</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-6">
                    {/* Settings */}
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Settings2 size={20} className="text-[#70AD47]" />
                                连接参数
                            </h3>
                            {isUsingEnv && (
                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                                    <Lock size={10}/> 环境变量托管
                                </span>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Supabase API URL</label>
                                <input type="text" value={supabaseUrl} disabled={isUsingEnv} onChange={e => setSupabaseUrl(e.target.value)} className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47] ${isUsingEnv ? 'opacity-50 cursor-not-allowed' : ''}`} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Service Role / Anon Key</label>
                                <input type="password" value={supabaseKey} disabled={isUsingEnv} onChange={e => setSupabaseKey(e.target.value)} className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47] ${isUsingEnv ? 'opacity-50 cursor-not-allowed' : ''}`} />
                            </div>
                            {!isUsingEnv && (
                                <button onClick={saveSettings} className="w-full py-3 rounded-xl bg-slate-800 text-white font-black text-xs hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                                    <Zap size={14} /> 保存配置
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Diagnostics */}
                    <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-brand/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black flex items-center gap-2">
                                    <Stethoscope size={20} className="text-[#70AD47]" />
                                    写入通道压力测试
                                </h3>
                                <button onClick={runDeepDiagnosis} disabled={isDiagnosing} className="px-4 py-1.5 rounded-lg bg-brand hover:bg-[#5da035] text-[10px] font-bold transition-all disabled:opacity-50 flex items-center gap-2">
                                    <PlayCircle size={14} /> {isDiagnosing ? '测试中...' : '开始诊断'}
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {diagSteps.length === 0 ? (
                                    <div className="text-[10px] text-slate-500 font-mono p-4 border border-white/5 rounded-xl bg-black/20 text-center">
                                        点击上方按钮，系统将尝试写入测试数据以验证权限。
                                    </div>
                                ) : (
                                    diagSteps.map((res, idx) => (
                                        <div key={idx} className={`flex gap-3 items-start p-3 rounded-xl border ${res.status === 'fail' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/5 border-white/5'}`}>
                                            <div className="mt-0.5">
                                                {res.status === 'ok' ? <CheckCircle size={14} className="text-green-500"/> : 
                                                 res.status === 'fail' ? <XCircle size={14} className="text-rose-500"/> :
                                                 <Activity size={14} className="text-slate-400 animate-pulse"/>}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold ${res.status === 'fail' ? 'text-rose-400' : 'text-slate-200'}`}>{res.step}</p>
                                                <p className={`text-[10px] mt-1 font-mono leading-relaxed ${res.status === 'fail' ? 'text-rose-300' : 'text-slate-400'}`}>
                                                    {res.msg}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm relative overflow-hidden h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3 text-slate-800">
                                <Terminal size={20} className="text-slate-400" />
                                <h4 className="text-sm font-black uppercase tracking-wider">权限修复脚本 (RLS Fix)</h4>
                            </div>
                            <button 
                                onClick={handleForceReloadSchema}
                                disabled={isReloadingCache}
                                className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={isReloadingCache ? 'animate-spin' : ''} />
                                {isReloadingCache ? '正在重载...' : '强制刷新架构缓存'}
                            </button>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-6 flex gap-3">
                            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                                    如果左侧诊断出现 <span className="font-mono bg-white px-1 rounded mx-1">Column not found</span> 错误：
                                </p>
                                <ol className="list-decimal list-inside text-[10px] text-amber-600 font-medium ml-1 space-y-1">
                                    <li>复制下方新脚本并在 Supabase SQL Editor 执行。</li>
                                    <li>执行成功后，点击右上角的 <b>强制刷新架构缓存</b> 按钮。</li>
                                </ol>
                            </div>
                        </div>

                        <div className="relative z-10 flex-1 flex flex-col min-h-[400px]">
                            <div className="absolute top-4 right-4 z-20">
                                <button onClick={() => { navigator.clipboard.writeText(cleanSqlScript); addToast('success', '复制成功', '请前往 Supabase SQL Editor 粘贴执行。'); }} className="p-2 bg-slate-700 rounded-lg hover:bg-[#70AD47] transition-all text-white shadow-lg">
                                    <Copy size={14}/>
                                </button>
                            </div>
                            <pre className="bg-slate-900 p-6 rounded-2xl text-[10px] font-mono text-slate-300 overflow-x-auto h-full leading-relaxed border border-slate-800 custom-scrollbar flex-1">
                                {cleanSqlScript}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

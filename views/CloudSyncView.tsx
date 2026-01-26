
import React, { useState, useEffect } from 'react';
import { CloudSync, Download, UploadCloud, ShieldCheck, AlertCircle, RefreshCw, Smartphone, Monitor, Database, Settings2, Globe, Lock, CheckCircle2, Zap, Info, ExternalLink, Code2, Copy } from 'lucide-react';
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
    };

    const handleCloudPush = async () => {
        if (!supabaseUrl || !supabaseKey) {
            addToast('error', '同步失败', '请先配置 Supabase URL 和 Key。');
            return;
        }
        setIsProcessing(true);
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            // 导出本地所有事实表数据
            const tablesToSync = ['fact_shangzhi', 'fact_jingzhuntong', 'fact_customer_service'];
            
            for (const tableName of tablesToSync) {
                const localData = await DB.getTableRows(tableName);
                if (localData.length === 0) continue;

                // 清洗数据，移除本地自增 ID，让 Supabase 处理或根据业务唯一键更新
                const cleanData = localData.map(({ id, ...rest }: any) => rest);

                // 执行批量 UPSERT (PostgreSQL 级写入)
                const { error } = await supabase
                    .from(tableName)
                    .upsert(cleanData, { onConflict: 'date,sku_code' as any }); // 这里需要根据表结构定义唯一冲突键

                if (error) throw error;
            }

            // 同步配置信息 (app_config)
            const configData = await DB.getAllConfigs();
            const configPayload = Object.entries(configData).map(([key, data]) => ({ key, data }));
            await supabase.from('app_config').upsert(configPayload);

            const now = new Date().toLocaleString();
            setLastSync(now);
            await DB.saveConfig('cloud_sync_config', { url: supabaseUrl, key: supabaseKey, lastSync: now, autoSync });
            addToast('success', '数据库级同步完成', '本地数据已物理存入 Supabase PostgreSQL 实例。');
        } catch (e: any) {
            console.error(e);
            addToast('error', '物理同步失败', e.message || '请确保 Supabase 中已建立对应的数据表。');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloudPull = async () => {
        if (!supabaseUrl || !supabaseKey) {
            addToast('error', '拉取失败', '请先配置 Supabase URL 和 Key。');
            return;
        }
        setIsProcessing(true);
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            // 从物理表拉取
            const tables = ['fact_shangzhi', 'fact_jingzhuntong', 'fact_customer_service'];
            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*');
                if (error) throw error;
                if (data) await DB.bulkAdd(table, data);
            }

            // 拉取配置
            const { data: configs, error: confError } = await supabase.from('app_config').select('*');
            if (confError) throw confError;
            if (configs) {
                for (const conf of configs) {
                    await DB.saveConfig(conf.key, conf.data);
                }
            }
            
            addToast('success', '全量同步完成', '已从云端数据库恢复本地环境。');
            setTimeout(() => window.location.reload(), 1000);
        } catch (e: any) {
            addToast('error', '同步失败', '无法访问远程数据库表。');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto animate-fadeIn">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">物理云同步</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase italic">PostgreSQL Structure Sync</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">最后同步时间</p>
                    <p className="text-xs font-black text-[#70AD47]">{lastSync || '从未同步'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Supabase Config */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Settings2 size={20} className="text-[#70AD47]" />
                            数据库参数
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Supabase API URL</label>
                                <input type="text" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Service Role / Anon Key</label>
                                <input type="password" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47]" />
                            </div>
                            <button onClick={saveSettings} className="w-full py-3 rounded-xl bg-slate-800 text-white font-black text-xs hover:bg-slate-700 transition-all">
                                保存并激活引擎
                            </button>
                        </div>
                    </div>

                    <div className="p-8 bg-brand/5 rounded-[32px] border border-brand/20">
                        <div className="flex items-center gap-2 mb-4 text-[#70AD47]">
                            <Code2 size={18} />
                            <h4 className="text-sm font-black uppercase">初始化云数据库</h4>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed mb-4">
                            同步前需在 Supabase <span className="text-slate-800 underline">SQL Editor</span> 中执行初始化脚本。
                        </p>
                        <button 
                            onClick={() => setShowSql(!showSql)}
                            className="w-full py-2 bg-white border border-brand/30 rounded-xl text-[10px] font-black text-brand hover:bg-brand hover:text-white transition-all"
                        >
                            {showSql ? '隐藏初始化脚本' : '查看初始化 SQL'}
                        </button>
                        
                        {showSql && (
                            <div className="mt-4 bg-slate-900 rounded-xl p-4 relative group">
                                <pre className="text-[9px] text-slate-300 font-mono overflow-x-auto">
{`CREATE TABLE fact_shangzhi (
  id SERIAL PRIMARY KEY,
  date DATE,
  sku_code TEXT,
  shop_name TEXT,
  paid_amount NUMERIC,
  paid_items INTEGER,
  UNIQUE(date, sku_code)
);`}
                                </pre>
                                <button className="absolute top-2 right-2 p-1 bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Copy size={12} className="text-white"/>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Operations */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#0F172A] rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center gap-10 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#70AD47]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="flex-1 relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-[#70AD47] text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Real-time Persistence</span>
                            </div>
                            <h3 className="text-3xl font-black mb-4">PostgreSQL 云端持久化</h3>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                                本次升级后，您的数据将不再以“文件”形式备份，而是直接写入 Supabase 的关系型数据库表中。您可以在 Supabase 后台实时看到 Tables 中的数据行数。
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button 
                                    onClick={handleCloudPush}
                                    disabled={isProcessing}
                                    className="px-8 py-4 rounded-2xl bg-[#70AD47] text-white font-black text-sm flex items-center gap-2 hover:bg-[#5da035] shadow-xl shadow-[#70AD47]/20 active:scale-95 disabled:opacity-50 transition-all"
                                >
                                    {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                                    推送至结构化表 (Push)
                                </button>
                                <button 
                                    onClick={handleCloudPull}
                                    disabled={isProcessing}
                                    className="px-8 py-4 rounded-2xl bg-white/5 text-white border border-white/10 font-black text-sm flex items-center gap-2 hover:bg-white/10 active:scale-95 disabled:opacity-50 transition-all"
                                >
                                    {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                                    从物理表恢复 (Pull)
                                </button>
                            </div>
                        </div>
                        <div className="w-48 h-48 bg-white/5 rounded-full flex items-center justify-center shrink-0 border border-white/5">
                            <Database size={80} className="text-[#70AD47] opacity-40 animate-pulse" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm flex items-start gap-5">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                                <ExternalLink size={28} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-slate-800">对接外部工具</h4>
                                <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">
                                    存入 Tables 后，您可以使用 PowerBI 或 Grafana 直接连接 Supabase 数据库。
                                </p>
                            </div>
                        </div>
                        <div className="p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm flex items-start gap-5">
                            <div className="w-14 h-14 bg-[#70AD47]/10 rounded-2xl flex items-center justify-center text-[#70AD47]">
                                <CheckCircle2 size={28} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-slate-800">数据完整性校验</h4>
                                <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">
                                    利用 PostgreSQL 的约束机制，确保云端备份的数据不重复、不丢失。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

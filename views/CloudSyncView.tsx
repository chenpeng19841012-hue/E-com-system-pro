
import React, { useState, useEffect } from 'react';
import { CloudSync, Download, UploadCloud, ShieldCheck, AlertCircle, RefreshCw, Smartphone, Monitor, Database, Settings2, Globe, Lock, CheckCircle2, Zap } from 'lucide-react';
import { DB } from '../lib/db';
import { createClient } from '@supabase/supabase-js';

// 用户提供的默认配置
const DEFAULT_URL = "https://stycaaqvjbjnactxcvyh.supabase.co";
const DEFAULT_KEY = "sb_publishable_m4yyJRlDY107a3Nkx6Pybw_6Mdvxazn";

export const CloudSyncView = ({ addToast }: any) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [autoSync, setAutoSync] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const config = await DB.loadConfig('cloud_sync_config', { 
                url: DEFAULT_URL, 
                key: DEFAULT_KEY, 
                lastSync: null,
                autoSync: true // 默认开启自动同步
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
        addToast('success', '配置已保存', '云端同步参数及偏好已存储。');
    };

    const handleCloudPush = async () => {
        if (!supabaseUrl || !supabaseKey) {
            addToast('error', '同步失败', '请先配置 Supabase URL 和 Key。');
            return;
        }
        setIsProcessing(true);
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const dbData = await DB.exportFullDatabase();
            const fileName = 'main_database_mirror.json';
            
            const { error } = await supabase.storage
                .from('backups')
                .upload(fileName, new Blob([dbData], { type: 'application/json' }), {
                    upsert: true
                });

            if (error) throw error;

            const now = new Date().toLocaleString();
            setLastSync(now);
            await DB.saveConfig('cloud_sync_config', { 
                url: supabaseUrl, 
                key: supabaseKey, 
                lastSync: now,
                autoSync
            });
            addToast('success', '云端同步成功', '本地数据已镜像至云端存储中心。');
        } catch (e: any) {
            addToast('error', '云端同步失败', e.message || '请检查网络或 Bucket 权限。');
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
            const { data, error } = await supabase.storage
                .from('backups')
                .download('main_database_mirror.json');

            if (error) throw error;
            
            const text = await data.text();
            await DB.importFullDatabase(text);
            
            addToast('success', '同步完成', '已从云端拉取最新快照。页面即将刷新以应用变更。');
            setTimeout(() => window.location.reload(), 1500);
        } catch (e: any) {
            addToast('error', '拉取失败', '未在云端找到有效镜像文件。');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto animate-fadeIn">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">云端同步中心</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase italic">Secure Real-time Data Relay</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">最后一次云同步</p>
                    <p className="text-xs font-black text-[#70AD47]">{lastSync || '等待首次握手'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Supabase Config */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Settings2 size={20} className="text-[#70AD47]" />
                            同步配置
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Project URL</label>
                                <div className="relative">
                                    <Globe size={14} className="absolute left-3 top-3 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={supabaseUrl}
                                        onChange={e => setSupabaseUrl(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Anon Key</label>
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                                    <input 
                                        type="password" 
                                        value={supabaseKey}
                                        onChange={e => setSupabaseKey(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#70AD47]"
                                    />
                                </div>
                            </div>

                            {/* Auto Sync Toggle */}
                            <div className="flex items-center justify-between p-4 bg-[#70AD47]/5 rounded-2xl border border-[#70AD47]/10">
                                <div>
                                    <p className="text-xs font-black text-slate-700">自动同步模式</p>
                                    <p className="text-[10px] text-slate-400 font-bold">数据变更后自动推送</p>
                                </div>
                                <button 
                                    onClick={() => setAutoSync(!autoSync)}
                                    className={`w-12 h-6 rounded-full transition-all relative ${autoSync ? 'bg-[#70AD47]' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoSync ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            <button onClick={saveSettings} className="w-full py-3 rounded-xl bg-slate-800 text-white font-black text-xs hover:bg-slate-700 transition-all shadow-lg shadow-slate-200">
                                应用并保存设置
                            </button>
                        </div>
                    </div>

                    <div className="p-6 bg-amber-50 rounded-[28px] border border-amber-100">
                        <div className="flex gap-3">
                            <AlertCircle size={20} className="text-amber-500 shrink-0" />
                            <div>
                                <p className="text-xs text-amber-900 font-black">配置提示</p>
                                <p className="text-[10px] text-amber-700 font-bold leading-relaxed mt-1">
                                    我们已为您预填了 Supabase 节点。请确保在您的 Supabase 项目中创建了一个名为 <code className="bg-amber-200/50 px-1 rounded">backups</code> 的存储桶 (Bucket)，并将其设置为公开访问。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operations */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#0F172A] rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center gap-10 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#70AD47]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="flex-1 relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-[#70AD47] text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Enterprise Cloud</span>
                                {autoSync && <span className="flex items-center gap-1 text-[#70AD47] text-[9px] font-black"><Zap size={10} fill="#70AD47"/> 实时守护中</span>}
                            </div>
                            <h3 className="text-3xl font-black mb-4">多端业务瞬间握手</h3>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8 max-w-md">
                                在家处理的资产、在公司录入的表格，通过云端实时同步技术实现瞬间对接。无需 U 盘，无需手动传输。
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button 
                                    onClick={handleCloudPush}
                                    disabled={isProcessing}
                                    className="px-8 py-4 rounded-2xl bg-[#70AD47] text-white font-black text-sm flex items-center gap-2 hover:bg-[#5da035] shadow-xl shadow-[#70AD47]/20 active:scale-95 disabled:opacity-50 transition-all"
                                >
                                    {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                                    立即推送 (Push Master)
                                </button>
                                <button 
                                    onClick={handleCloudPull}
                                    disabled={isProcessing}
                                    className="px-8 py-4 rounded-2xl bg-white/5 text-white border border-white/10 font-black text-sm flex items-center gap-2 hover:bg-white/10 active:scale-95 disabled:opacity-50 transition-all"
                                >
                                    {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                                    从云端恢复 (Pull)
                                </button>
                            </div>
                        </div>
                        <div className="w-48 h-48 bg-white/5 rounded-full flex items-center justify-center shrink-0 border border-white/5">
                            <Database size={80} className="text-[#70AD47] opacity-40 animate-pulse" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm flex items-start gap-5 group hover:border-[#70AD47]/30 transition-all">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <Smartphone size={28} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-slate-800">异地同步 (Home/Office)</h4>
                                <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">
                                    无论身处何地，只要连接云端，您的经营环境就像随身携带。
                                </p>
                            </div>
                        </div>
                        <div className="p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm flex items-start gap-5 group hover:border-[#70AD47]/30 transition-all">
                            <div className="w-14 h-14 bg-[#70AD47]/10 rounded-2xl flex items-center justify-center text-[#70AD47] group-hover:scale-110 transition-transform">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-slate-800">多级数据容灾</h4>
                                <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">
                                    本地 IndexedDB + 云端 JSON 镜像，双重保险确保存档安全。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

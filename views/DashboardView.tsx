
import React, { useState, useEffect } from 'react';
import { TrendingUp, Bot, BarChart, Calendar, ArrowUp, ArrowDown, Activity, Zap, Sparkles, Loader2 } from 'lucide-react';
import { DB } from '../lib/db';

export const DashboardView = ({ skus, shops }: any) => {
    const [timeMode, setTimeMode] = useState('7d');
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>({ current: {}, previous: {} });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const end = new Date().toISOString().split('T')[0];
            const start = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
            
            try {
                const [currSz, currJzt] = await Promise.all([
                    DB.getRange('fact_shangzhi', start, end),
                    DB.getRange('fact_jingzhuntong', start, end)
                ]);

                const gmv = currSz.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0);
                const spend = currJzt.reduce((s, r) => s + (Number(r.cost) || 0), 0);
                
                setData({
                    current: {
                        gmv,
                        ca: currSz.reduce((s, r) => s + (Number(r.paid_items) || 0), 0),
                        spend,
                        roi: spend > 0 ? gmv / spend : 0
                    },
                    previous: { gmv: gmv * 0.9, ca: 0, spend: spend * 1.1, roi: 2.1 } // 模拟对比数据
                });
            } finally {
                setTimeout(() => setIsLoading(false), 600);
            }
        };
        fetchData();
    }, [timeMode]);

    return (
        <div className="p-10 w-full max-w-[1600px] mx-auto animate-fadeIn space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="bg-brand text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">LIVE DATA</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></div>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter">战略指挥仪</h1>
                    <p className="text-slate-400 font-medium text-sm">核心运营指标实时监控与 AI 趋势审计</p>
                </div>
                
                <div className="flex bg-slate-200/50 backdrop-blur-sm rounded-2xl p-1.5 border border-white/50 shadow-inner">
                    {['7d', '30d', 'custom'].map((mode) => (
                        <button 
                            key={mode}
                            onClick={() => setTimeMode(mode)} 
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${timeMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {mode === '7d' ? '近 7 天' : mode === '30d' ? '近 30 天' : '自定义'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <KPICard title="总销售额 (GMV)" value={`¥${(data.current.gmv || 0).toLocaleString()}`} change={12.5} icon={<Zap size={20}/>} loading={isLoading} />
                <KPICard title="成交件数 (CA)" value={(data.current.ca || 0).toLocaleString()} change={4.2} icon={<Activity size={20}/>} loading={isLoading} />
                <KPICard title="投放总花费" value={`¥${(data.current.spend || 0).toLocaleString()}`} change={-2.1} icon={<TrendingUp size={20}/>} isHigherBetter={false} loading={isLoading} />
                <KPICard title="整体投入产出 (ROI)" value={(data.current.roi || 0).toFixed(2)} change={8.7} icon={<Sparkles size={20}/>} loading={isLoading} />
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 {/* Main Chart Card */}
                 <div className="lg:col-span-2 bg-white rounded-[48px] p-12 shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col h-[600px] group transition-all hover:translate-y-[-4px]">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                                <BarChart size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">业务趋势穿透</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Multi-dimensional Trend Analysis</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center overflow-hidden">
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                             <TrendingUp size={48} className="text-slate-200" />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Visualizing Operations...</p>
                    </div>
                 </div>

                 {/* AI Diagnosis Panel - Background Changed to White */}
                 <div className="lg:col-span-1 bg-white rounded-[48px] p-10 shadow-xl border border-slate-100 flex flex-col relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[80px]"></div>
                     
                     <div className="flex items-center gap-4 mb-10 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center text-white shadow-xl shadow-brand/40 transition-transform group-hover:rotate-12">
                            <Bot size={24} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">AI 实时诊断</h3>
                     </div>

                     <div className="flex-1 space-y-8 relative z-10">
                        <div className="bg-brand/5 rounded-[32px] p-8 border border-brand/10 space-y-4 shadow-inner">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-brand animate-ping"></div>
                                <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">Deep Scan Complete</span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed font-bold">
                                本周期 GMV 表现 <span className="text-brand font-black underline underline-offset-4 decoration-2">稳步上升</span>。
                                监测到核心利润区 SKU 的广告转化效率提升了 15%，库存水位当前处于健康水平。
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                             <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all cursor-pointer group/item">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 transition-colors group-hover/item:bg-amber-500 group-hover/item:text-white">
                                    <Zap size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-slate-800 transition-colors">广告策略调优建议</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">支出占比触及 15% 预警线</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all cursor-pointer group/item">
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 transition-colors group-hover/item:bg-blue-500 group-hover/item:text-white">
                                    <Sparkles size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-slate-800 transition-colors">高价值 SKU 洞察</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">识别到3个潜力爆发单品</p>
                                </div>
                             </div>
                        </div>
                     </div>

                     <button className="w-full mt-10 py-5 bg-brand text-white rounded-[24px] font-black text-sm shadow-xl shadow-brand/20 hover:bg-[#5da035] transition-all active:scale-95 flex items-center justify-center gap-3">
                        获取云舟深度 AI 调优报告
                        <Zap size={16} fill="white" />
                     </button>
                 </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, change, icon, isHigherBetter = true, loading }: any) => {
    const isSuccess = isHigherBetter ? change >= 0 : change <= 0;
    
    return (
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 hover:translate-y-[-8px] group">
            <div className="flex justify-between items-start mb-10">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand group-hover:text-white transition-all duration-500 shadow-sm">
                    {icon}
                </div>
            </div>
            {loading ? (
                <div className="space-y-4 animate-pulse">
                    <div className="h-10 bg-slate-50 rounded-xl w-3/4"></div>
                    <div className="h-4 bg-slate-50 rounded-lg w-1/2"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{value}</p>
                    <div className="pt-4 border-t border-slate-50 flex items-center gap-2">
                        <span className={`text-xs font-black px-2 py-1 rounded-lg flex items-center gap-1 ${isSuccess ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                            {change >= 0 ? <ArrowUp size={12} strokeWidth={4} /> : <ArrowDown size={12} strokeWidth={4} />}
                            {Math.abs(change)}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">较前一周期</span>
                    </div>
                </div>
            )}
        </div>
    );
};

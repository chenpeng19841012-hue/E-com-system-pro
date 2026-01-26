
import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart, ShoppingBag, Activity, CreditCard, Target, ArrowUp, ArrowDown, Zap, Sparkles, Bot as BotIcon, ChevronRight } from 'lucide-react';
import { DB } from '../lib/db';

export const DashboardView = ({ addToast }: any) => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>({ current: { gmv: 0, ca: 0, spend: 0, roi: 0 } });

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
                    }
                });
            } catch (e) {
                console.error(e);
            } finally {
                setTimeout(() => setIsLoading(false), 500);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="p-6 md:p-10 w-full animate-fadeIn space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">物理链路实时监控中</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">战略指挥中心</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 italic">Intelligence Data Hub & Decision Engine</p>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    {['近 7 天', '近 30 天'].map((label, idx) => (
                        <button key={label} className={`px-4 py-1.5 rounded-lg text-xs font-black ${idx === 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard title="总销售额 (GMV)" value={`¥${data.current.gmv.toLocaleString()}`} change={+12} icon={<ShoppingBag size={20}/>} color="text-brand" bg="bg-brand/5" />
                <KPICard title="成交件数 (CA)" value={data.current.ca.toLocaleString()} change={+4} icon={<Activity size={20}/>} color="text-blue-600" bg="bg-blue-50" />
                <KPICard title="投放总花费" value={`¥${data.current.spend.toLocaleString()}`} change={-2} icon={<CreditCard size={20}/>} isHigherBetter={false} color="text-amber-600" bg="bg-amber-50" />
                <KPICard title="整体投产比 (ROI)" value={data.current.roi.toFixed(2)} change={+8} icon={<Target size={20}/>} color="text-purple-600" bg="bg-purple-50" />
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                 <div className="xl:col-span-8 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm min-h-[400px]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <BarChart size={20} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">业务趋势分析</h3>
                    </div>
                    
                    <div className="h-64 bg-slate-50/50 rounded-2xl border border-slate-200/60 border-dashed flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                             <BarChart size={24} className="text-slate-200" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">等待事实数据穿透</p>
                    </div>
                 </div>

                 <div className="xl:col-span-4 bg-navy rounded-3xl p-8 text-white shadow-xl flex flex-col">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                            <BotIcon size={20} />
                        </div>
                        <h3 className="text-lg font-black tracking-tight">AI 诊断结果</h3>
                     </div>

                     <div className="flex-1 space-y-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                系统监测到当前周期 <span className="text-brand font-black underline">GMV 增长强劲</span>。建议对高转化 SKU 增加 15% 预算。
                            </p>
                        </div>
                        <DiagnosisItem icon={<Zap size={14}/>} title="异常预警" desc="展现量异常剧减" type="warning" />
                        <DiagnosisItem icon={<Sparkles size={14}/>} title="爆品发现" desc="CTR 超过均值 2.1 倍" type="success" />
                     </div>

                     <button className="w-full mt-6 py-3 bg-brand text-white rounded-xl font-black text-xs hover:bg-[#5da035] transition-all flex items-center justify-center gap-2">
                        生成详情报告 <ChevronRight size={14} />
                     </button>
                 </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, change, icon, isHigherBetter = true, color, bg }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-4">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black ${((change > 0 && isHigherBetter) || (change < 0 && !isHigherBetter)) ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                {change >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {Math.abs(change)}%
            </div>
        </div>
        <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{title}</h3>
    </div>
);

const DiagnosisItem = ({ icon, title, desc, type }: any) => (
    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-brand/10 text-brand'}`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-[11px] font-black">{title}</p>
            <p className="text-[10px] text-slate-500 truncate">{desc}</p>
        </div>
    </div>
);

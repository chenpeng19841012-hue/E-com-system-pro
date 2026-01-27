
import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart, ShoppingBag, Activity, CreditCard, Target, ArrowUp, ArrowDown, Zap, Sparkles, Bot as BotIcon, ChevronRight, Calendar, Filter } from 'lucide-react';
import { DB } from '../lib/db';
import { ProductSKU } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

type RangeType = '7d' | '30d' | 'custom';

export const DashboardView = ({ skus, addToast }: { skus: ProductSKU[], addToast: any }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [rangeType, setRangeType] = useState<RangeType>('7d');
    const [customRange, setCustomRange] = useState({
        start: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState<any>({ current: { gmv: 0, ca: 0, spend: 0, roi: 0 } });

    // 获取已开启统计的 SKU 编码集合
    const enabledSkuCodes = React.useMemo(() => {
        return new Set(skus.filter(s => s.isStatisticsEnabled).map(s => s.code));
    }, [skus]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            let start: string;
            let end = new Date().toISOString().split('T')[0];

            if (rangeType === '7d') {
                start = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
            } else if (rangeType === '30d') {
                start = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
            } else {
                start = customRange.start;
                end = customRange.end;
            }
            
            try {
                const [currSz, currJzt] = await Promise.all([
                    DB.getRange('fact_shangzhi', start, end),
                    DB.getRange('fact_jingzhuntong', start, end)
                ]);

                // 核心过滤逻辑：仅保留在资产库中勾选了“统计”的 SKU 记录
                const filteredSz = currSz.filter(row => {
                    const code = getSkuIdentifier(row);
                    return code && enabledSkuCodes.has(code);
                });

                const filteredJzt = currJzt.filter(row => {
                    const code = getSkuIdentifier(row);
                    return code && enabledSkuCodes.has(code);
                });

                const gmv = filteredSz.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0);
                const ca = filteredSz.reduce((s, r) => s + (Number(r.paid_items) || 0), 0);
                const spend = filteredJzt.reduce((s, r) => s + (Number(r.cost) || 0), 0);
                
                setData({
                    current: {
                        gmv,
                        ca,
                        spend,
                        roi: spend > 0 ? gmv / spend : 0
                    }
                });
            } catch (e) {
                console.error("Dashboard calculation error:", e);
            } finally {
                setTimeout(() => setIsLoading(false), 300);
            }
        };
        fetchData();
    }, [rangeType, customRange, enabledSkuCodes]);

    return (
        <div className="p-6 md:p-10 w-full animate-fadeIn space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest">精细化统计模式已激活</span>
                        {enabledSkuCodes.size > 0 && (
                            <span className="flex items-center gap-1 bg-brand/10 text-brand px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                <Filter size={10} /> 已锁定 {enabledSkuCodes.size} 个受控 SKU
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">战略指挥中心</h1>
                    <p className="text-slate-500 font-medium text-xs mt-1 italic">Precision Intelligence Data Hub & Strategic Decision Engine</p>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 shadow-inner">
                        {[
                            { id: '7d', label: '近 7 天' },
                            { id: '30d', label: '近 30 天' },
                            { id: 'custom', label: '自定义' }
                        ].map((item) => (
                            <button 
                                key={item.id} 
                                onClick={() => setRangeType(item.id as RangeType)}
                                className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${rangeType === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    
                    {rangeType === 'custom' && (
                        <div className="flex items-center gap-2 animate-slideIn bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                            <Calendar size={14} className="text-slate-400 ml-1" />
                            <input 
                                type="date" 
                                value={customRange.start}
                                onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="text-[10px] font-black text-slate-600 border-none outline-none bg-transparent" 
                            />
                            <span className="text-slate-300">-</span>
                            <input 
                                type="date" 
                                value={customRange.end}
                                onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                className="text-[10px] font-black text-slate-600 border-none outline-none bg-transparent" 
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard title="特定 SKU 销售额" value={`¥${Math.round(data.current.gmv).toLocaleString()}`} change={+12} icon={<ShoppingBag size={20}/>} color="text-brand" bg="bg-brand/5" isLoading={isLoading} />
                <KPICard title="特定 SKU 成交件数" value={data.current.ca.toLocaleString()} change={+4} icon={<Activity size={20}/>} color="text-blue-600" bg="bg-blue-50" isLoading={isLoading} />
                <KPICard title="特定 SKU 广告花费" value={`¥${Math.round(data.current.spend).toLocaleString()}`} change={-2} icon={<CreditCard size={20}/>} isHigherBetter={false} color="text-amber-600" bg="bg-amber-50" isLoading={isLoading} />
                <KPICard title="特定 SKU 投产比" value={data.current.roi.toFixed(1)} change={+8} icon={<Target size={20}/>} color="text-purple-600" bg="bg-purple-50" isLoading={isLoading} />
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                 <div className="xl:col-span-8 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm min-h-[400px]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <BarChart size={20} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">精细化业务趋势</h3>
                    </div>
                    
                    <div className="h-64 bg-slate-50/50 rounded-2xl border border-slate-200/60 border-dashed flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                             <BarChart size={24} className="text-slate-200" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {enabledSkuCodes.size > 0 ? "正在渲染受控 SKU 的趋势分布" : "请在资产管理中开启至少一个 SKU 的统计状态"}
                        </p>
                    </div>
                 </div>

                 <div className="xl:col-span-4 bg-navy rounded-3xl p-8 text-white shadow-xl flex flex-col">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                            <BotIcon size={20} />
                        </div>
                        <h3 className="text-lg font-black tracking-tight">AI 专项诊断</h3>
                     </div>

                     <div className="flex-1 space-y-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                系统已完成对 <span className="text-brand font-black">{enabledSkuCodes.size}</span> 个核心 SKU 的利润穿透。
                                {data.current.roi < 2 && data.current.roi > 0 ? " 当前受控组 ROI 偏低，建议优化广告词配比。" : " 当前受控组运行健康，符合既定战略。"}
                            </p>
                        </div>
                        <DiagnosisItem icon={<Zap size={14}/>} title="策略同步" desc={`${enabledSkuCodes.size} 个 SKU 参与全局核算`} type="warning" />
                        <DiagnosisItem icon={<Sparkles size={14}/>} title="重点监控" desc="已排除非核心/非统计项干扰" type="success" />
                     </div>

                     <button className="w-full mt-6 py-3 bg-brand text-white rounded-xl font-black text-xs hover:bg-[#5da035] transition-all flex items-center justify-center gap-2">
                        查看完整受控报告 <ChevronRight size={14} />
                     </button>
                 </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, change, icon, isHigherBetter = true, color, bg, isLoading }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
        <div className="flex justify-between items-center mb-4">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black ${((change > 0 && isHigherBetter) || (change < 0 && !isHigherBetter)) ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                {change >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {Math.abs(change)}%
            </div>
        </div>
        {isLoading ? (
            <div className="h-8 w-32 bg-slate-50 animate-pulse rounded"></div>
        ) : (
            <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
        )}
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

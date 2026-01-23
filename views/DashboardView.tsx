
import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Bot, LoaderCircle, BarChart, Calendar, ChevronDown } from 'lucide-react';
import { DB } from '../lib/db';
import { getSkuIdentifier } from '../lib/helpers';

type TimeRangeMode = '7d' | '30d' | 'custom';

export const DashboardView = ({ skus, shops }: any) => {
    const [timeMode, setTimeMode] = useState<TimeRangeMode>('7d');
    
    // Default custom range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    
    const [customStart, setCustomStart] = useState(firstDay);
    const [customEnd, setCustomEnd] = useState(today);
    
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>({ current: {}, previous: {}, daily: [] });
    const [aiInsight, setAiInsight] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            let start: string, end: string;

            if (timeMode === '7d') {
                end = new Date().toISOString().split('T')[0];
                start = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
            } else if (timeMode === '30d') {
                end = new Date().toISOString().split('T')[0];
                start = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
            } else {
                start = customStart;
                end = customEnd;
            }

            // Calculate previous period for comparison (same duration)
            const startDateObj = new Date(start);
            const endDateObj = new Date(end);
            const durationMs = endDateObj.getTime() - startDateObj.getTime();
            
            const prevEndObj = new Date(startDateObj.getTime() - 86400000);
            const prevStartObj = new Date(prevEndObj.getTime() - durationMs);
            
            const prevStart = prevStartObj.toISOString().split('T')[0];
            const prevEnd = prevEndObj.toISOString().split('T')[0];

            try {
                // Optimized range queries to IndexedDB
                const [currSz, currJzt, prevSz, prevJzt] = await Promise.all([
                    DB.getRange('fact_shangzhi', start, end),
                    DB.getRange('fact_jingzhuntong', start, end),
                    DB.getRange('fact_shangzhi', prevStart, prevEnd),
                    DB.getRange('fact_jingzhuntong', prevStart, prevEnd)
                ]);

                const aggregate = (sz: any[], jzt: any[]) => ({
                    gmv: sz.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0),
                    ca: sz.reduce((s, r) => s + (Number(r.paid_items) || 0), 0),
                    spend: jzt.reduce((s, r) => s + (Number(r.cost) || 0), 0),
                });

                setData({
                    current: aggregate(currSz, currJzt),
                    previous: aggregate(prevSz, prevJzt),
                    daily: [] // Future: can aggregate daily results here for trend chart
                });
            } catch (err) {
                console.error("Dashboard data fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [timeMode, customStart, customEnd]);

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 驾驶舱</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">Dynamic Performance Intelligence</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                        <button 
                            onClick={() => setTimeMode('7d')} 
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeMode === '7d' ? 'bg-[#70AD47] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            7天
                        </button>
                        <button 
                            onClick={() => setTimeMode('30d')} 
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeMode === '30d' ? 'bg-[#70AD47] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            30天
                        </button>
                        <button 
                            onClick={() => setTimeMode('custom')} 
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeMode === 'custom' ? 'bg-[#70AD47] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            自定义
                        </button>
                    </div>

                    {timeMode === 'custom' && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm animate-fadeIn">
                            <Calendar size={14} className="text-slate-400" />
                            <input 
                                type="date" 
                                value={customStart} 
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="text-xs font-bold text-slate-600 outline-none bg-transparent"
                            />
                            <span className="text-slate-300">-</span>
                            <input 
                                type="date" 
                                value={customEnd} 
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="text-xs font-bold text-slate-600 outline-none bg-transparent"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KPICard 
                    title="总销售额 (GMV)" 
                    value={`¥${(data.current.gmv || 0).toLocaleString()}`} 
                    prevValue={data.previous.gmv}
                    loading={isLoading} 
                />
                <KPICard 
                    title="成交件数 (CA)" 
                    value={(data.current.ca || 0).toLocaleString()} 
                    prevValue={data.previous.ca}
                    loading={isLoading} 
                />
                <KPICard 
                    title="广告花费" 
                    value={`¥${(data.current.spend || 0).toLocaleString()}`} 
                    prevValue={data.previous.spend}
                    isCost={true}
                    loading={isLoading} 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-[450px] flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#70AD47]"/> 
                            业务趋势分析
                        </h3>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                            On-Demand Rendering
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-slate-300 italic font-bold border-2 border-dashed border-slate-50 rounded-2xl">
                        <div className="text-center">
                            <BarChart size={48} className="mx-auto mb-4 opacity-10" />
                            <p>趋势图组件正在对接 IndexedDB 序列化数据...</p>
                            <p className="text-[10px] mt-2 not-italic text-slate-400">当前范围: {timeMode === 'custom' ? `${customStart} 至 ${customEnd}` : timeMode}</p>
                        </div>
                    </div>
                 </div>
                 
                 <div className="lg:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <Bot size={18} className="text-[#70AD47]"/> 
                        AI 实时诊断
                     </h3>
                     <div className="flex-1 space-y-6">
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                系统正在扫描 <span className="text-slate-800 font-bold">{timeMode === 'custom' ? '选定周期' : timeMode}</span> 的全量业务记录。
                                <br/><br/>
                                经初步计算，当前周期的 GMV 相比上一周期{data.current.gmv >= data.previous.gmv ? '上升' : '下降'}了 
                                <span className={data.current.gmv >= data.previous.gmv ? 'text-green-600 font-bold' : 'text-rose-600 font-bold'}>
                                    {data.previous.gmv > 0 ? (Math.abs((data.current.gmv - data.previous.gmv) / data.previous.gmv * 100).toFixed(2)) : '0.00'}%
                                </span>。
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                <p className="text-xs font-bold text-slate-600">广告支出占比偏高，建议优化 ROI</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                <p className="text-xs font-bold text-slate-600">核心 SKU 转化率保持稳定</p>
                            </div>
                        </div>
                     </div>
                     <button className="w-full mt-8 py-3 bg-[#70AD47] text-white rounded-xl font-black text-xs shadow-lg shadow-[#70AD47]/20 hover:bg-[#5da035] transition-all active:scale-95">
                         获取深度 AI 运营建议
                     </button>
                 </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, prevValue, loading, isCost = false }: any) => {
    const change = prevValue > 0 ? ((parseFloat(value.replace(/[¥,]/g, '')) - prevValue) / prevValue) * 100 : 0;
    const isPositive = isCost ? change < 0 : change > 0;

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 group hover:border-[#70AD47]/30 transition-all duration-300">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{title}</h3>
            {loading ? (
                <div className="space-y-3">
                    <div className="h-10 bg-slate-50 animate-pulse rounded-lg w-3/4"></div>
                    <div className="h-4 bg-slate-50 animate-pulse rounded-lg w-1/2"></div>
                </div>
            ) : (
                <>
                    <p className="text-4xl font-black text-slate-800 group-hover:text-[#70AD47] transition-colors">{value}</p>
                    <div className="flex items-center gap-2 mt-4">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            change === 0 ? 'bg-slate-100 text-slate-400' :
                            isPositive ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">较上一周期</span>
                    </div>
                </>
            )}
        </div>
    );
};

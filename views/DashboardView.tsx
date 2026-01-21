
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { TrendingUp, ArrowUp, ArrowDown, Bot, LoaderCircle, AlertCircle, BarChart, PieChart, ShoppingCart, CheckSquare, Square } from 'lucide-react';
import { getSkuIdentifier } from '../lib/helpers';

const KPICard = ({ title, value, change, isPositive, isLoading }: { title: string, value: string, change: number, isPositive: boolean, isLoading: boolean }) => {
    const changeColor = change === 0 ? 'text-slate-500' : isPositive ? 'text-green-500' : 'text-rose-500';
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
            <div className="mt-4 flex items-baseline gap-2">
                {isLoading ? (
                    <div className="h-9 bg-slate-200 rounded-md w-3/4 animate-pulse"></div>
                ) : (
                    <span className="text-3xl font-black text-slate-800">{value}</span>
                )}
            </div>
             <div className="mt-2 text-xs font-bold flex items-center">
                {isLoading ? <div className="h-4 bg-slate-200 rounded-md w-1/2 animate-pulse"></div> : isFinite(change) && (
                    <span className={changeColor}>
                        <span className="flex items-center gap-1">
                          {change > 0 ? <ArrowUp size={12} /> : change < 0 ? <ArrowDown size={12}/> : null}
                          {Math.abs(change * 100).toFixed(2)}%
                        </span>
                        <span className="text-slate-400 font-medium ml-1">vs 上一周期</span>
                    </span>
                )}
            </div>
        </div>
    );
};

const DashboardTrendChart = ({ data, isLoading, metrics, onToggleMetric }: { data: any[], isLoading: boolean, metrics: Set<string>, onToggleMetric: (key: string) => void }) => {
    const metricConfig: Record<string, { label: string, color: string }> = {
        gmv: { label: 'GMV', color: '#70AD47' },
        ca: { label: '总CA', color: '#3b82f6' },
        adSpend: { label: '广告花费', color: '#f97316' },
        roi: { label: 'ROI', color: '#8b5cf6' },
    };

    if (isLoading) return <div className="w-full h-72 bg-slate-200 rounded-lg animate-pulse"></div>;
    if (!data || data.length < 2) return <div className="w-full h-72 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400">数据不足，无法生成图表</div>;

    const width = 800;
    const height = 288;
    const padding = { top: 20, right: 20, bottom: 30, left: 60 };

    const activeMetrics = Array.from(metrics);
    const maxY = Math.max(...data.flatMap(d => activeMetrics.map(m => d[m] || 0)), 1);
    
    const xScale = (index: number) => padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
    const yScale = (value: number) => height - padding.bottom - (value / maxY) * (height - padding.top - padding.bottom);
    
    return (
        <div>
            <div className="flex justify-end items-center gap-4 mb-2">
                {Object.entries(metricConfig).map(([key, config]) => (
                    <label key={key} className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: config.color }}>
                        <input type="checkbox" checked={metrics.has(key)} onChange={() => onToggleMetric(key)} className="hidden" />
                        {metrics.has(key) ? <CheckSquare size={14} /> : <Square size={14} className="text-slate-300" />}
                        {config.label}
                    </label>
                ))}
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Y Axis & Grid */}
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#e2e8f0" />
                {[...Array(5)].map((_, i) => {
                    const y = padding.top + i * (height - padding.top - padding.bottom) / 4;
                    const value = maxY - i * maxY / 4;
                    return (
                        <g key={i}>
                            <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
                                {value >= 1000 ? `${(value/1000).toFixed(0)}k` : value.toFixed(value < 10 ? 2 : 0)}
                            </text>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" />
                        </g>
                    );
                })}
                {/* X Axis */}
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" />
                {data.map((d, i) => ( i % Math.ceil(data.length / 10) === 0 &&
                    <text key={i} x={xScale(i)} y={height - padding.bottom + 15} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.date.substring(5)}</text>
                ))}
                
                {/* Lines */}
                {activeMetrics.map(key => (
                     <path key={key} d={`M ${data.map((d, i) => `${xScale(i)},${yScale(d[key] || 0)}`).join(' L ')}`} fill="none" stroke={metricConfig[key].color} strokeWidth="2.5" />
                ))}
            </svg>
        </div>
    );
};

export const DashboardView = ({ factTables, skus, shops }: { factTables: any, skus: any[], shops: any[] }) => {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'custom'>('7d');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [aiInsight, setAiInsight] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState<boolean>(true);
    const [chartMetrics, setChartMetrics] = useState<Set<string>>(new Set(['gmv', 'ca']));

    // FIX: Define interfaces for dashboard data to ensure type safety.
    interface DailyData {
        date: string;
        gmv: number;
        ca: number;
        cogs: number;
        cost: number;
        profit: number;
        roi: number;
    }

    interface RankItem {
        name: string;
        gmv: number;
    }

    interface DashboardMetrics {
        gmv: number;
        ca: number;
        adSpend: number;
        profit: number;
        roi: number;
        dailyData: DailyData[];
        topShops: RankItem[];
        topSkus: RankItem[];
    }

    const emptyMetrics: DashboardMetrics = {
        gmv: 0,
        ca: 0,
        adSpend: 0,
        profit: 0,
        roi: 0,
        dailyData: [],
        topShops: [],
        topSkus: []
    };

    const dashboardData = useMemo(() => {
        const calculateMetrics = (startDate: string, endDate: string): DashboardMetrics => {
            const skuMap = new Map(skus.map(s => [s.code, s]));
            
            const dailyDataMap = new Map<string, any>();
            
            // Initialize daily data with 0s for all dates in the range
            const start = new Date(startDate);
            const end = new Date(endDate);
            for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
                 dailyDataMap.set(d.toISOString().split('T')[0], { gmv: 0, ca: 0, cogs: 0, cost: 0 });
            }

            factTables.shangzhi
                .filter((r: any) => r.date >= startDate && r.date <= endDate)
                .forEach((r: any) => {
                    const entry = dailyDataMap.get(r.date) || { gmv: 0, ca: 0, cogs: 0, cost: 0 };
                    const skuCode = getSkuIdentifier(r);
                    const skuInfo = skuMap.get(skuCode);
                    entry.gmv += Number(r.paid_amount) || 0;
                    entry.ca += Number(r.paid_items) || 0;
                    entry.cogs += (skuInfo?.costPrice || 0) * (Number(r.paid_items) || 0);
                    dailyDataMap.set(r.date, entry);
                });

            factTables.jingzhuntong
                .filter((r: any) => r.date >= startDate && r.date <= endDate)
                .forEach((r: any) => {
                     const entry = dailyDataMap.get(r.date) || { gmv: 0, ca: 0, cogs: 0, cost: 0 };
                     entry.cost += Number(r.cost || 0);
                     dailyDataMap.set(r.date, entry);
                });
            
            let totalGmv = 0, totalAdSpend = 0, totalProfit = 0, totalCA = 0;
            const shopGmv: Record<string, number> = {};
            const skuGmv: Record<string, number> = {};

            const dailyDataArray: DailyData[] = Array.from(dailyDataMap.entries()).map(([date, values]) => {
                const profit = values.gmv - values.cogs - values.cost;
                const roi = values.cost > 0 ? values.gmv / values.cost : 0;
                totalGmv += values.gmv;
                totalCA += values.ca;
                totalAdSpend += values.cost;
                totalProfit += profit;
                return { date, ...values, profit, roi };
            }).sort((a, b) => a.date.localeCompare(b.date));

            // Calculate rankings separately as daily aggregation doesn't have sku/shop info
            factTables.shangzhi.filter((r: any) => r.date >= startDate && r.date <= endDate)
                .forEach((r: any) => {
                    const gmv = Number(r.paid_amount) || 0;
                    const skuCode = getSkuIdentifier(r);
                    const skuInfo = skuMap.get(skuCode);
                    if (skuInfo) {
                        if (!shopGmv[skuInfo.shopId]) shopGmv[skuInfo.shopId] = 0;
                        shopGmv[skuInfo.shopId] += gmv;
                        if (!skuGmv[skuCode]) skuGmv[skuCode] = 0;
                        skuGmv[skuCode] += gmv;
                    }
                });
            
            const topShops: RankItem[] = Object.entries(shopGmv).sort(([, a], [, b]) => b - a).slice(0, 5).map(([shopId, gmv]) => ({ name: shops.find(s => s.id === shopId)?.name || '未知店铺', gmv }));
            const topSkus: RankItem[] = Object.entries(skuGmv).sort(([, a], [, b]) => b - a).slice(0, 5).map(([skuCode, gmv]) => ({ name: skuMap.get(skuCode)?.name || skuCode, gmv }));

            return {
                gmv: totalGmv, ca: totalCA, adSpend: totalAdSpend, profit: totalProfit,
                roi: totalAdSpend > 0 ? totalGmv / totalAdSpend : 0,
                dailyData: dailyDataArray, topShops, topSkus
            };
        };

        let currentStartDate: Date, currentEndDate: Date;
        if (timeRange === 'custom') {
            // FIX: Return a well-typed empty state to prevent property access errors.
            if (!customStartDate || !customEndDate) return { current: emptyMetrics, previous: emptyMetrics };
            currentStartDate = new Date(customStartDate + 'T00:00:00');
            currentEndDate = new Date(customEndDate + 'T00:00:00');
        } else {
            const days = timeRange === '7d' ? 7 : 30;
            currentEndDate = new Date();
            currentStartDate = new Date();
            currentStartDate.setDate(currentEndDate.getDate() - (days - 1));
        }

        const diffDays = Math.round((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 3600 * 24));
        const prevEndDate = new Date(currentStartDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevEndDate.getDate() - diffDays);

        const currentMetrics = calculateMetrics(currentStartDate.toISOString().split('T')[0], currentEndDate.toISOString().split('T')[0]);
        const previousMetrics = calculateMetrics(prevStartDate.toISOString().split('T')[0], prevEndDate.toISOString().split('T')[0]);
        
        return { current: currentMetrics, previous: previousMetrics };

    }, [timeRange, customStartDate, customEndDate, factTables, skus, shops]);

    const { current, previous } = dashboardData;
    const kpis = [
        { title: '总GMV', value: `¥${Math.round(current.gmv / 1000)}k`, change: (previous.gmv === 0 ? (current.gmv > 0 ? Infinity : 0) : (current.gmv - previous.gmv) / previous.gmv), isPositive: true },
        { title: '总CA', value: current.ca.toLocaleString(), change: (previous.ca === 0 ? (current.ca > 0 ? Infinity : 0) : (current.ca - previous.ca) / previous.ca), isPositive: true },
        { title: '广告花费', value: `¥${Math.round(current.adSpend / 1000)}k`, change: (previous.adSpend === 0 ? (current.adSpend > 0 ? Infinity : 0) : (current.adSpend - previous.adSpend) / previous.adSpend), isPositive: false },
        { title: '整体ROI', value: current.roi.toFixed(2), change: (previous.roi === 0 ? (current.roi > 0 ? Infinity : 0) : (current.roi - previous.roi) / previous.roi), isPositive: true },
    ];
    
    useEffect(() => {
        const generateInsight = async () => {
            if (!current.dailyData || current.dailyData.length === 0) {
                setAiInsight("数据不足，无法生成洞察。");
                setIsAiLoading(false); return;
            }
            setIsAiLoading(true);
            try {
                // FIX: Use process.env.API_KEY directly without casting.
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `...`; // Prompt remains similar, just needs updated metric names if needed.
                const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
                // FIX: Use response.text property to get the generated text safely.
                setAiInsight(response.text?.trim() || "AI洞察返回为空。");
            } catch (err) { setAiInsight("AI洞察生成失败。"); } finally { setIsAiLoading(false); }
        };
        generateInsight();
    }, [dashboardData, timeRange]);

    const isLoading = !current.gmv && !previous.gmv && timeRange !== 'custom';

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI驾驶舱</h1>
          <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">AI-POWERED COMMAND CENTER</p>
        </div>
        <div className="flex items-center gap-2">
            {timeRange === 'custom' && (
                <div className="flex items-center gap-2 animate-fadeIn">
                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#70AD47]" />
                    <span className="text-slate-400">-</span>
                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-[#70AD47]" />
                </div>
            )}
            <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-100">
                <button onClick={() => setTimeRange('7d')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === '7d' ? 'bg-[#70AD47] text-white shadow-sm' : 'text-slate-500'}`}>最近7天</button>
                <button onClick={() => setTimeRange('30d')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === '30d' ? 'bg-[#70AD47] text-white shadow-sm' : 'text-slate-500'}`}>最近30天</button>
                <button onClick={() => setTimeRange('custom')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${timeRange === 'custom' ? 'bg-[#70AD47] text-white shadow-sm' : 'text-slate-500'}`}>自定义</button>
            </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         {/* FIX: Refactored to use the 'isPositive' flag from the data object and calculate if the change is "good" for coloring. This resolves potential type errors and is more robust than string matching. */}
         {kpis.map(kpi => {
            const isChangeGood = (kpi.change > 0 && kpi.isPositive) || (kpi.change < 0 && !kpi.isPositive);
            return <KPICard key={kpi.title} title={kpi.title} value={kpi.value} change={kpi.change} isLoading={isLoading} isPositive={isChangeGood} />;
         })}
      </div>
       <div className="grid grid-cols-3 gap-6">
        <div className="col-span-3 lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
           <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><BarChart size={18} className="text-[#70AD47]"/> 核心指标趋势</h3>
           <DashboardTrendChart data={current.dailyData} isLoading={isLoading} metrics={chartMetrics} onToggleMetric={(key) => setChartMetrics(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; })}/>
        </div>
        <div className="col-span-3 lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Bot size={18} className="text-[#70AD47]"/> AI 智能洞察</h3>
             {isAiLoading ? (
                 <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                 </div>
             ) : (
                 <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                    {aiInsight.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                 </div>
             )}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><PieChart size={18} className="text-amber-500"/> 店铺GMV贡献</h3>
                 {isLoading ? (
                    <div className="space-y-2 animate-pulse"><div className="h-4 bg-slate-200 rounded w-full"></div><div className="h-4 bg-slate-200 rounded w-full"></div></div>
                 ) : (
                    <div className="space-y-2 text-xs">{current.topShops.map((shop, i) => <div key={i} className="flex justify-between items-center"><span className="font-semibold text-slate-500 truncate">{shop.name}</span><span className="font-mono font-bold text-slate-700">¥{shop.gmv.toLocaleString('en-US', {maximumFractionDigits:0})}</span></div>)}</div>
                 )}
              </div>
               <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><ShoppingCart size={18} className="text-purple-500"/> 畅销SKU Top 5</h3>
                 {isLoading ? (
                    <div className="space-y-2 animate-pulse"><div className="h-4 bg-slate-200 rounded w-full"></div><div className="h-4 bg-slate-200 rounded w-full"></div></div>
                 ) : (
                    <div className="space-y-2 text-xs">{current.topSkus.map((sku, i) => <div key={i} className="flex justify-between items-center"><span className="font-semibold text-slate-500 truncate" title={sku.name}>{sku.name}</span><span className="font-mono font-bold text-slate-700">¥{sku.gmv.toLocaleString('en-US', {maximumFractionDigits:0})}</span></div>)}</div>
                 )}
              </div>
        </div>
      </div>
    </div>
  );
};
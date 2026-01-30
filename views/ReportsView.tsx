import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Bot, FileText, Printer, Download, LoaderCircle, ChevronDown, Activity, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Sparkles, DatabaseZap, Search, Filter, Store, CreditCard, ShoppingBag, MousePointer2, Target } from 'lucide-react';
import { callQwen } from '../lib/ai';
import { ProductSKU, Shop } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';
import { DB } from '../lib/db';

interface MetricPoint { current: number; previous: number; }
interface ReportMetrics {
    gmv: MetricPoint;
    ca: MetricPoint;
    uv: MetricPoint;
    cvr: MetricPoint;
    spend: MetricPoint;
    roi: MetricPoint;
    cpc: MetricPoint;
    orders: MetricPoint;
}

export const ReportsView = ({ factTables, skus, shops, addToast }: any) => {
    const [startDate, setStartDate] = useState(new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedShopId, setSelectedShopId] = useState('all');
    
    const [reportMetrics, setReportMetrics] = useState<ReportMetrics | null>(null);
    const [aiCommentary, setAiCommentary] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    // 计算指标核心逻辑 (云端穿透版)
    const calculateMetrics = async () => {
        setIsCalculating(true);
        setAiCommentary('');
        
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diff = Math.ceil(Math.abs(end.getTime() - start.getTime()) / 86400000) + 1;
            
            const prevEnd = new Date(start.getTime() - 86400000);
            const prevStart = new Date(prevEnd.getTime() - (diff - 1) * 86400000);
            
            const ps = prevStart.toISOString().split('T')[0];
            const pe = prevEnd.toISOString().split('T')[0];

            // 1. 并行抓取当前周期与环比周期的数据 (On-Demand Fetching)
            const [currSz, currJzt, prevSz, prevJzt] = await Promise.all([
                DB.getRange('fact_shangzhi', startDate, endDate),
                DB.getRange('fact_jingzhuntong', startDate, endDate),
                DB.getRange('fact_shangzhi', ps, pe),
                DB.getRange('fact_jingzhuntong', ps, pe)
            ]);

            const skuMap = new Map(skus.map((s: ProductSKU) => [s.code, s]));

            const process = (dataSz: any[], dataJzt: any[]) => {
                const res = { gmv: 0, ca: 0, uv: 0, spend: 0, orders: 0, clicks: 0, paidUsers: 0 };
                
                dataSz.forEach(r => {
                    const skuCode = getSkuIdentifier(r);
                    if (!skuCode) return;

                    if (selectedShopId !== 'all') {
                        // FIX: Explicitly cast the result from the map to ensure type safety.
                        const skuAsset = skuMap.get(skuCode) as ProductSKU | undefined;
                        if (!skuAsset || skuAsset.shopId !== selectedShopId) {
                            return; // Skip if shop doesn't match
                        }
                    }
                    
                    res.gmv += Number(r.paid_amount) || 0;
                    res.ca += Number(r.paid_items) || 0;
                    res.uv += Number(r.uv) || 0;
                    res.orders += Number(r.paid_orders) || 0;
                    res.paidUsers += Number(r.paid_users) || 0;
                });

                dataJzt.forEach(r => {
                    const skuCode = getSkuIdentifier(r);
                    if (!skuCode) return;

                    if (selectedShopId !== 'all') {
                        // FIX: Explicitly cast the result from the map to ensure type safety.
                        const skuAsset = skuMap.get(skuCode) as ProductSKU | undefined;
                        if (!skuAsset || skuAsset.shopId !== selectedShopId) {
                            return; // Skip if shop doesn't match
                        }
                    }
                    
                    res.spend += Number(r.cost) || 0;
                    res.clicks += Number(r.clicks) || 0;
                });
                
                return res;
            };

            const curr = process(currSz, currJzt);
            const prev = process(prevSz, prevJzt);

            const finalMetrics: ReportMetrics = {
                gmv: { current: curr.gmv, previous: prev.gmv },
                ca: { current: curr.ca, previous: prev.ca },
                uv: { current: curr.uv, previous: prev.uv },
                cvr: { current: curr.uv ? curr.paidUsers / curr.uv : 0, previous: prev.uv ? prev.paidUsers / prev.uv : 0 },
                spend: { current: curr.spend, previous: prev.spend },
                roi: { current: curr.spend ? curr.gmv / curr.spend : 0, previous: prev.spend ? prev.gmv / prev.spend : 0 },
                cpc: { current: curr.clicks ? curr.spend / curr.clicks : 0, previous: prev.clicks ? prev.spend / prev.clicks : 0 },
                orders: { current: curr.orders, previous: prev.orders }
            };

            setReportMetrics(finalMetrics);
            handleAiAudit(finalMetrics);
        } catch (e) {
            addToast('error', '计算失败', '云端数据链路连接超时。');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleAiAudit = async (metrics: ReportMetrics) => {
        setIsAiLoading(true);
        try {
            const prompt = `
                你是运营总监，请对以下周期运营数据进行诊断建议：
                【销售】GMV: ¥${metrics.gmv.current.toLocaleString()}, 环比: ${getChange(metrics.gmv.current, metrics.gmv.previous)}%
                【流量】UV: ${metrics.uv.current.toLocaleString()}, 转化率: ${(metrics.cvr.current * 100).toFixed(2)}%
                【投放】消耗: ¥${metrics.spend.current.toLocaleString()}, ROI: ${metrics.roi.current.toFixed(2)}
                
                请给出3条具体的战术改进建议，保持专业、精炼，200字以内。不要提及AI模型名称。
            `;
            const result = await callQwen(prompt);
            setAiCommentary(result || "审计意见生成失败。");
        } catch (e) {
            setAiCommentary("无法连接审计引擎。");
        } finally {
            setIsAiLoading(false);
        }
    };

    const getChange = (c: number, p: number) => {
        if (p === 0) return c > 0 ? 100 : 0;
        return ((c - p) / p) * 100;
    };

    return (
        <div className="p-8 md:p-12 w-full animate-fadeIn space-y-10 min-h-screen bg-[#F8FAFC]">
            {/* Header - Standardized 3-line format */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-widest leading-none">全链路数据审计中</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">运营报表</h1>
                    <p className="text-slate-400 font-bold text-sm tracking-wide">Strategic Performance Audit & Comprehensive Reports</p>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 flex flex-wrap gap-8 items-end relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">审计店铺范围</label>
                    <div className="relative">
                        <select 
                            value={selectedShopId} 
                            onChange={e => setSelectedShopId(e.target.value)}
                            className="min-w-[220px] bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-700 outline-none focus:border-brand appearance-none shadow-inner"
                        >
                            <option value="all">全域资产审计</option>
                            {shops.map((s: Shop) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">审计周期 (支持任意历史)</label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-inner">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 px-3 py-2 outline-none" />
                        <span className="text-slate-300 font-black">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 px-3 py-2 outline-none" />
                    </div>
                </div>

                <button 
                    onClick={calculateMetrics} 
                    disabled={isCalculating}
                    className="bg-brand text-white px-12 py-4 rounded-[22px] font-black text-sm shadow-2xl shadow-brand/20 hover:bg-[#5da035] transition-all flex items-center gap-3 uppercase tracking-widest active:scale-95 disabled:opacity-50"
                >
                    {isCalculating ? <LoaderCircle size={18} className="animate-spin" /> : <DatabaseZap size={18} />}
                    生成云端审计报表
                </button>
            </div>

            {reportMetrics && (
                <div className="space-y-10 animate-fadeIn">
                    {/* Metrics Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                        <ReportStatCard title="GMV 成交总额" metric={reportMetrics.gmv} prefix="¥" icon={<ShoppingBag size={22}/>} color="text-brand" bg="bg-brand/5" />
                        <ReportStatCard title="成交件数 (CA)" metric={reportMetrics.ca} icon={<Activity size={22}/>} color="text-blue-600" bg="bg-blue-50" />
                        <ReportStatCard title="全站访客 (UV)" metric={reportMetrics.uv} icon={<MousePointer2 size={22}/>} color="text-cyan-600" bg="bg-cyan-50" />
                        <ReportStatCard title="全站转化率" metric={reportMetrics.cvr} isPercent icon={<TrendingUp size={22}/>} color="text-rose-600" bg="bg-rose-50" />
                        <ReportStatCard title="广告总消耗" metric={reportMetrics.spend} prefix="¥" icon={<CreditCard size={22}/>} color="text-amber-600" bg="bg-amber-50" isHigherBetter={false} />
                        <ReportStatCard title="全站 ROI" metric={reportMetrics.roi} isFloat icon={<Target size={22}/>} color="text-purple-600" bg="bg-purple-50" />
                        <ReportStatCard title="平均点击成本" metric={reportMetrics.cpc} prefix="¥" isFloat icon={<Activity size={22}/>} color="text-slate-600" bg="bg-slate-50" isHigherBetter={false} />
                        <ReportStatCard title="成交订单量" metric={reportMetrics.orders} icon={<FileText size={22}/>} color="text-indigo-600" bg="bg-indigo-50" />
                    </div>

                    {/* AI Diagnostic Opinion */}
                    <div className="bg-white rounded-[48px] p-12 shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
                        <div className="flex items-center gap-5 mb-10 relative z-10">
                            <div className="w-16 h-16 rounded-[24px] bg-brand flex items-center justify-center shadow-2xl shadow-brand/30 border border-white/20">
                                <Bot size={32} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">战略诊断意见</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Strategic Audit commentary</p>
                            </div>
                        </div>

                        <div className="bg-slate-50/50 rounded-[32px] p-10 border border-slate-100 relative z-10 min-h-[150px]">
                            {isAiLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-4 text-slate-300">
                                    <LoaderCircle className="animate-spin" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">正在穿透物理层数据进行深度审计...</p>
                                </div>
                            ) : (
                                <div className="text-base text-slate-600 leading-loose font-medium whitespace-pre-wrap">
                                    {aiCommentary || "等待报表生成后执行 AI 诊断..."}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!reportMetrics && !isCalculating && (
                <div className="py-48 text-center opacity-30 italic font-black uppercase tracking-[0.5em] text-slate-300">
                    Awaiting Audit Parameters
                </div>
            )}
        </div>
    );
};

const ReportStatCard = ({ title, metric, prefix = "", isFloat = false, isPercent = false, icon, color, bg, isHigherBetter = true }: any) => {
    const chg = getChange(metric.current, metric.previous);
    const isGood = (chg >= 0 && isHigherBetter) || (chg < 0 && !isHigherBetter);

    function getChange(c: number, p: number) {
        if (p === 0) return 0;
        return ((c - p) / p) * 100;
    }

    const formatVal = (v: number) => {
        if (isPercent) return `${(v * 100).toFixed(2)}%`;
        if (isFloat) return v.toFixed(2);
        return Math.round(v).toLocaleString();
    };

    return (
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
                <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center ${color} shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                    {icon}
                </div>
                <div className="text-right">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</h4>
                    <div className={`px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 text-[10px] font-black tabular-nums ${isGood ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                        {chg >= 0 ? <ArrowUp size={10} strokeWidth={4}/> : <ArrowDown size={10} strokeWidth={4}/>}
                        {Math.abs(chg).toFixed(1)}%
                    </div>
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">
                    {prefix}{formatVal(metric.current)}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                    <span className="opacity-50">前一周期:</span>
                    <span className="font-mono text-slate-500">{prefix}{formatVal(metric.previous)}</span>
                </p>
            </div>
        </div>
    );
};

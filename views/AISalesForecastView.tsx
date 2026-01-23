
import React, { useState, useEffect } from 'react';
import { TrendingUp, Bot, ChevronDown, Sparkles, LoaderCircle, AlertCircle, CalendarDays, BarChartHorizontalBig } from 'lucide-react';
import { DB } from '../lib/db';
import { ProductSKU } from '../lib/types';
import { getSkuIdentifier } from '../lib/helpers';

interface Forecast {
    date: string;
    predicted_sales: number;
}

interface ForecastResult {
    summary: string;
    analysis: string;
    forecast: Forecast[];
}

export const AISalesForecastView = ({ skus }: { skus: ProductSKU[] }) => {
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [forecastDays, setForecastDays] = useState<number>(7);
    const [influencingFactors, setInfluencingFactors] = useState('');
    const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!selectedSkuId) {
            setError('请先选择一个SKU。');
            return;
        }
        setIsLoading(true);
        setError('');
        setForecastResult(null);

        try {
            const sku = skus.find(s => s.id === selectedSkuId);
            if (!sku) throw new Error("未找到指定的SKU信息。");
            
            // Fetch 90 days of history from DB
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const startDateStr = ninetyDaysAgo.toISOString().split('T')[0];
            const todayStr = new Date().toISOString().split('T')[0];

            const allRows = await DB.getRange('fact_shangzhi', startDateStr, todayStr);
            const historicalData = allRows
                .filter(row => getSkuIdentifier(row) === sku.code)
                .map(row => ({ date: row.date, sales: Number(row.paid_items) || 0 }))
                .sort((a, b) => a.date.localeCompare(b.date));
            
            if (historicalData.length < 3) {
                 throw new Error("用于预测的历史销售样本过少（至少需要3天以上的数据）。请前往数据中心补充同步。");
            }

            const historicalDataCsv = "Date,Sales\n" + historicalData.map(d => `${d.date},${d.sales}`).join('\n');
            
            const prompt = `你是一名顶级电商算法专家。请根据以下[${sku.name}]的历史销量：
            \`\`\`csv
            ${historicalDataCsv}
            \`\`\`
            营销变量：${influencingFactors || '无特殊营销活动'}
            
            任务：预测未来${forecastDays}天的销量。考虑：
            1. 历史趋势的惯性；
            2. 周期性特征；
            3. 营销变量对斜率的修正。
            
            必须严格按JSON返回：
            {
              "summary": "一句预测总结",
              "analysis": "预测逻辑简析",
              "forecast": [{ "date": "YYYY-MM-DD", "predicted_sales": 数字 }]
            }`;
            
            const apiResponse = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                }),
            });

            if (!apiResponse.ok) throw new Error('API request failed');
            const responseData = await apiResponse.json();
            const resultJson = JSON.parse(responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}") as ForecastResult;
            setForecastResult(resultJson);
        } catch (err: any) {
            setError(err.message || 'AI预测引擎响应异常');
        } finally {
            setIsLoading(false);
        }
    };
    
    const totalPredictedSales = forecastResult?.forecast.reduce((sum, item) => sum + item.predicted_sales, 0) || 0;

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 销售预测</h1>
                <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">PREDICTIVE SALES INTELLIGENCE</p>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6 self-start">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. 预测对象</label>
                        <div className="relative">
                           <select 
                                value={selectedSkuId} 
                                onChange={e => setSelectedSkuId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#70AD47] appearance-none"
                            >
                                <option value="">请选择 SKU...</option>
                                {skus.map(sku => <option key={sku.id} value={sku.id}>{sku.name} ({sku.code})</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">2. 预测跨度</label>
                        <div className="flex gap-2">
                            {[7, 14, 30].map(days => (
                                <button key={days} onClick={() => setForecastDays(days)} className={`flex-1 py-2 text-xs font-black rounded-xl border-2 transition-all ${forecastDays === days ? 'bg-[#70AD47] border-[#70AD47] text-white' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-[#70AD47]'}`}>{`${days}D`}</button>
                            ))}
                        </div>
                    </div>

                     <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">3. 动态干扰项</label>
                        <textarea
                            value={influencingFactors}
                            onChange={e => setInfluencingFactors(e.target.value)}
                            placeholder="描述未来事件，如“618大促提报”、“小红书KOL推广”"
                            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47] resize-none"
                        ></textarea>
                    </div>

                     <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !selectedSkuId}
                        className="w-full py-4 rounded-2xl bg-[#70AD47] text-white font-black text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300"
                    >
                        {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <TrendingUp size={18} />}
                        执行 AI 时间序列预测
                    </button>
                </div>

                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[600px] flex flex-col">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 mb-8">
                        <Bot size={20} className="text-[#70AD47]" />
                        预测结果报告
                    </h3>
                    
                    <div className="flex-1">
                        {isLoading ? (
                             <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <LoaderCircle size={48} className="animate-spin mb-6" />
                                <p className="font-black text-sm uppercase tracking-widest">Calculating Prophecy...</p>
                            </div>
                        ) : error ? (
                            <div className="bg-rose-50 rounded-2xl p-6 text-rose-500 flex gap-4">
                                <AlertCircle size={24} className="shrink-0" />
                                <div>
                                    <p className="font-black text-sm">预测中断</p>
                                    <p className="text-xs mt-1 font-bold">{error}</p>
                                </div>
                            </div>
                        ) : forecastResult ? (
                            <div className="animate-fadeIn space-y-10">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">周期总预测件数</p>
                                        <p className="text-3xl font-black text-[#70AD47] mt-2">{totalPredictedSales.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">平均日销量预估</p>
                                        <p className="text-3xl font-black text-slate-800 mt-2">{(totalPredictedSales / forecastDays).toFixed(1)}</p>
                                    </div>
                                </div>
                                
                                <div className="bg-[#70AD47]/5 rounded-2xl p-6 border border-[#70AD47]/20">
                                    <h4 className="text-[10px] font-black text-[#70AD47] uppercase tracking-widest mb-3">AI 洞察摘要</h4>
                                    <p className="text-sm text-slate-700 font-bold leading-relaxed">{forecastResult.summary}</p>
                                    <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">{forecastResult.analysis}</p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">每日趋势详情</h4>
                                    <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                                        {forecastResult.forecast.map(item => (
                                            <div key={item.date} className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-xl hover:border-[#70AD47]/30 transition-all">
                                                <span className="text-xs font-black text-slate-600 flex items-center gap-2">
                                                    <CalendarDays size={14} className="text-slate-300" />
                                                    {item.date}
                                                </span>
                                                <span className="text-sm font-black text-slate-800">{item.predicted_sales} <span className="text-[10px] text-slate-400">PCS</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-200">
                                <BarChartHorizontalBig size={64} className="mb-6 opacity-40" />
                                <p className="font-black text-sm uppercase tracking-widest">Configure To Begin Forecast</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

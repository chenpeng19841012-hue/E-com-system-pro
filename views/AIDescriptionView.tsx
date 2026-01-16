import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Bot, ChevronDown, Sparkles, Clipboard, LoaderCircle, AlertCircle } from 'lucide-react';
import { ProductSKU } from '../lib/types';

interface AIDescriptionViewProps {
    skus: ProductSKU[];
}

export const AIDescriptionView = ({ skus }: AIDescriptionViewProps) => {
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [sellingPoints, setSellingPoints] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [tone, setTone] = useState('专业严谨');
    const [keywords, setKeywords] = useState('');
    const [generatedDescription, setGeneratedDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copyButtonText, setCopyButtonText] = useState('复制文案');

    useEffect(() => {
        if (selectedSkuId) {
            const sku = skus.find(s => s.id === selectedSkuId);
            if (sku) {
                const autoSellingPoints = [
                    sku.name,
                    sku.model,
                    sku.configuration,
                    `${sku.brand}品牌`,
                ].filter(Boolean).join('；');
                setSellingPoints(autoSellingPoints);
            }
        } else {
            setSellingPoints('');
        }
    }, [selectedSkuId, skus]);
    
    const handleGenerate = async () => {
        if (!sellingPoints) {
            setError('核心卖点不能为空。');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedDescription('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const sku = skus.find(s => s.id === selectedSkuId);

            const prompt = `
                作为一名顶尖的电商文案专家，请根据以下信息，生成一段吸引人的、专业的商品描述文案。文案需要重点突出核心卖点，符合目标客群的阅读习惯，并自然地融入SEO关键词。

                **商品基本信息:**
                - 商品名称: ${sku?.name || '未指定'}
                - 品牌: ${sku?.brand || '未指定'}
                - 型号: ${sku?.model || '未指定'}
                - 核心配置: ${sku?.configuration || '未指定'}
                - 品类: ${sku?.category || '未指定'}

                **核心卖点 (必须重点突出):**
                ${sellingPoints}

                **目标客群:**
                ${targetAudience || '大众用户'}

                **文案风格:**
                ${tone}

                **SEO关键词 (请自然融入):**
                ${keywords || '无'}

                请直接生成最终的文案，不要包含任何“好的，这是生成的文案：”等多余的引导性语句。
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            
            setGeneratedDescription(response.text.trim());

        } catch (err: any) {
            console.error(err);
            setError(`文案生成失败: ${err.message || '请检查API Key或网络连接'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedDescription);
        setCopyButtonText('复制成功!');
        setTimeout(() => setCopyButtonText('复制文案'), 2000);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 文案生成</h1>
                <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">GEMINI-POWERED PRODUCT DESCRIPTION GENERATOR</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">1. 选择关联SKU (自动填充信息)</label>
                        <div className="relative">
                           <select 
                                value={selectedSkuId} 
                                onChange={e => setSelectedSkuId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47] appearance-none"
                            >
                                <option value="">选择一个已录入的SKU...</option>
                                {skus.map(sku => <option key={sku.id} value={sku.id}>{sku.name} ({sku.code})</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">2. 输入核心卖点 *</label>
                        <textarea
                            value={sellingPoints}
                            onChange={e => setSellingPoints(e.target.value)}
                            placeholder="例如：超长续航；轻薄便携；高性能处理器，适合游戏和设计；"
                            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47] resize-y"
                        ></textarea>
                    </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">3. 描述目标客群</label>
                        <input
                            type="text"
                            value={targetAudience}
                            onChange={e => setTargetAudience(e.target.value)}
                            placeholder="例如：大学生、商务人士、游戏发烧友"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#70AD47]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">4. 选择文案风格</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['专业严谨', '轻松活泼', '幽默风趣', '科技酷炫'].map(item => (
                                <button key={item} onClick={() => setTone(item)} className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-all ${tone === item ? 'bg-[#70AD47] border-[#70AD47] text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-[#70AD47]'}`}>{item}</button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">5. 包含SEO关键词</label>
                        <input
                            type="text"
                            value={keywords}
                            onChange={e => setKeywords(e.target.value)}
                            placeholder="多个关键词请用逗号“,”分隔"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 outline-none focus:border-[#70AD47]"
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                         <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="w-full py-4 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed">
                            {isLoading ? <><LoaderCircle size={16} className="animate-spin" /> 正在生成...</> : <><Sparkles size={16} className="fill-white"/> 生成文案</>}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Bot size={18} className="text-[#70AD47]" />
                            AI 生成结果
                        </h3>
                         {generatedDescription && (
                            <div className="flex gap-2">
                                 <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors">
                                    <Clipboard size={14} /> {copyButtonText}
                                </button>
                                 <button onClick={handleGenerate} disabled={isLoading} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200">
                                    再次生成
                                </button>
                            </div>
                         )}
                    </div>
                    
                    <div className="flex-1 bg-slate-50/70 rounded-lg p-6 overflow-y-auto">
                        {isLoading ? (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <LoaderCircle size={32} className="animate-spin mb-4" />
                                <p className="font-bold">AI正在创作中，请稍候...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-rose-500 bg-rose-50 rounded-lg p-4">
                                <AlertCircle size={32} className="mb-4" />
                                <p className="font-bold text-sm text-center">{error}</p>
                            </div>
                        ) : generatedDescription ? (
                            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                {generatedDescription}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <Bot size={48} className="mb-4 opacity-50" />
                                <p className="font-bold text-center">请在左侧配置参数，<br/>开始您的AI文案创作之旅</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

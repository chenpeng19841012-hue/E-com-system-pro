import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Bot, ChevronDown, Sparkles, LoaderCircle, AlertCircle, Download } from 'lucide-react';
import { ProductSKU } from '../lib/types';

interface AIAdImageViewProps {
    skus: ProductSKU[];
}

export const AIAdImageView = ({ skus }: AIAdImageViewProps) => {
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('产品实拍');
    
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (selectedSkuId) {
            const sku = skus.find(s => s.id === selectedSkuId);
            if (sku) {
                setPrompt(`一张${sku.brand}品牌${sku.name}的广告图, `);
            }
        } else {
            setPrompt('');
        }
    }, [selectedSkuId, skus]);

    const handleGenerate = async () => {
        if (!prompt) {
            setError('核心创意不能为空。');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedImageUrl(null);

        try {
            const fullPrompt = `${prompt} 风格为${style}。`;

            const requestBody = {
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: fullPrompt }] },
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio,
                    },
                },
            };

            const apiResponse = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || 'API request failed');
            }

            const responseData = await apiResponse.json();

            let foundImage = false;
            for (const part of responseData.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64String = part.inlineData.data;
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${base64String}`;
                    setGeneratedImageUrl(imageUrl);
                    foundImage = true;
                    break; 
                }
            }

            if (!foundImage) {
                throw new Error("AI未能成功生成图片，请调整创意或稍后再试。");
            }

        } catch (err: any) {
            console.error(err);
            setError(`图片生成失败: ${err.message || '请检查API Key或网络连接'}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = () => {
        if (!generatedImageUrl) return;
        const link = document.createElement('a');
        link.href = generatedImageUrl;
        const sku = skus.find(s => s.id === selectedSkuId);
        const fileName = sku ? `${sku.code}_ad_image.png` : 'ai_generated_image.png';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 广告图</h1>
                <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">GEMINI-POWERED AD IMAGE GENERATOR</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">1. 关联商品 (可选)</label>
                        <div className="relative">
                           <select 
                                value={selectedSkuId} 
                                onChange={e => setSelectedSkuId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-[#70AD47] appearance-none"
                            >
                                <option value="">无特定商品</option>
                                {skus.map(sku => <option key={sku.id} value={sku.id}>{sku.name} ({sku.code})</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">2. 核心创意 *</label>
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="例如：一台银色笔记本电脑，放置在极简风格的白色桌面上，旁边有一杯咖啡和一株小绿植，窗外是模糊的城市景色，光线明亮柔和。"
                            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#70AD47] resize-y"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">3. 选择图片比例</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[{label: '1:1 (主图)', value: '1:1'}, {label: '16:9 (横幅)', value: '16:9'}, {label: '9:16 (竖版)', value: '9:16'}].map(item => (
                                <button key={item.value} onClick={() => setAspectRatio(item.value)} className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-all ${aspectRatio === item.value ? 'bg-[#70AD47] border-[#70AD47] text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-[#70AD47]'}`}>{item.label}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">4. 选择图片风格</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['产品实拍', '科技感', '生活方式'].map(item => (
                                <button key={item} onClick={() => setStyle(item)} className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-all ${style === item ? 'bg-[#70AD47] border-[#70AD47] text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-[#70AD47]'}`}>{item}</button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                         <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="w-full py-4 rounded-lg bg-[#70AD47] text-white font-bold text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed">
                            {isLoading ? <><LoaderCircle size={16} className="animate-spin" /> 正在创作...</> : <><Sparkles size={16} className="fill-white"/> 生成创意图片</>}
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
                         {generatedImageUrl && (
                            <div className="flex gap-2">
                                 <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors">
                                    <Download size={14} /> 下载图片
                                </button>
                                 <button onClick={handleGenerate} disabled={isLoading} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200">
                                    重新生成
                                </button>
                            </div>
                         )}
                    </div>
                    
                    <div className="flex-1 bg-slate-50/70 rounded-lg p-4 flex items-center justify-center">
                        {isLoading ? (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <LoaderCircle size={32} className="animate-spin mb-4" />
                                <p className="font-bold">AI 正在挥洒创意，请稍候...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-rose-500 bg-rose-50 rounded-lg p-4">
                                <AlertCircle size={32} className="mb-4" />
                                <p className="font-bold text-sm text-center">{error}</p>
                            </div>
                        ) : generatedImageUrl ? (
                            <img src={generatedImageUrl} alt="Generated ad image" className="max-w-full max-h-full object-contain rounded-md shadow-lg" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <ImageIcon size={48} className="mb-4 opacity-50" />
                                <p className="font-bold text-center">请在左侧描述您的创意，<br/>开启视觉创作之旅</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
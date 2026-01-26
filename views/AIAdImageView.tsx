
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Bot, ChevronDown, Sparkles, LoaderCircle, AlertCircle, Download, Maximize2, Layers } from 'lucide-react';
import { ProductSKU } from '../lib/types';
import { GoogleGenAI } from "@google/genai";

export const AIAdImageView = ({ skus }: { skus: ProductSKU[] }) => {
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (selectedSkuId) {
            const sku = skus.find(s => s.id === selectedSkuId);
            if (sku) {
                setPrompt(`一张${sku.brand}${sku.name}的高端电商展示图，极简主义背景，柔和自然光，${sku.configuration}细节展示。`);
            }
        }
    }, [selectedSkuId, skus]);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError('');
        setImgUrl(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio as any,
                    }
                }
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    setImgUrl(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    return;
                }
            }
            throw new Error("模型未返回有效图像数据");
        } catch (err: any) {
            setError(`视觉引擎启动失败: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 视觉创意舱</h1>
                    <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">Next-Gen Ad Visualizer</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Controls */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-[#70AD47] font-black text-sm uppercase">
                            <Layers size={18} /> 创意参数
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">关联资产</label>
                            <select 
                                value={selectedSkuId} 
                                onChange={e => setSelectedSkuId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47]"
                            >
                                <option value="">自由创作模式</option>
                                {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">尺寸比例</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['1:1', '3:4', '16:9'].map(r => (
                                    <button 
                                        key={r} 
                                        onClick={() => setAspectRatio(r)}
                                        className={`py-2 text-[10px] font-black rounded-lg border-2 transition-all ${aspectRatio === r ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">画面描述 (PROMPT)</label>
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-[#70AD47] resize-none"
                                placeholder="描述你想要的画面，例如：产品浮动在水面上，周围有气泡..."
                            />
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="w-full py-4 rounded-2xl bg-[#70AD47] text-white font-black text-sm hover:bg-[#5da035] shadow-lg shadow-[#70AD47]/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? <LoaderCircle size={18} className="animate-spin mr-2" /> : <Sparkles size={18} className="mr-2" />}
                            生成创意大片
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-100 rounded-[40px] border-4 border-white shadow-inner flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden group">
                        {isLoading ? (
                            <div className="text-center">
                                <div className="w-20 h-20 border-4 border-[#70AD47]/20 border-t-[#70AD47] rounded-full animate-spin mx-auto mb-6"></div>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Rendering Reality...</p>
                            </div>
                        ) : imgUrl ? (
                            <>
                                <img src={imgUrl} className="w-full h-full object-contain" alt="Generated" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button 
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = imgUrl;
                                            link.download = 'yunzhou_ad_visual.png';
                                            link.click();
                                        }}
                                        className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:scale-105 transition-transform"
                                    >
                                        <Download size={16} /> 保存至本地
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center px-10">
                                <ImageIcon size={80} className="mx-auto text-slate-300 mb-6 opacity-50" />
                                <h3 className="text-slate-400 font-black text-xl mb-2">等待视觉灵感</h3>
                                <p className="text-slate-400 text-xs font-bold max-w-sm mx-auto">配置左侧参数并点击生成按钮，云舟 AI 将为您创作高精细度的电商广告视觉图。</p>
                            </div>
                        )}

                        {error && (
                            <div className="absolute bottom-8 left-8 right-8 p-4 bg-rose-500 text-white rounded-2xl text-xs font-black flex items-center gap-3 animate-slideIn">
                                <AlertCircle size={18} /> {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

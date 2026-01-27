import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Image as ImageIcon, Bot, ChevronDown, Sparkles, LoaderCircle, AlertCircle, Download, Maximize2, Layers, Search, X, Box, Upload, Palette, Monitor, Zap, RotateCcw, Share2, Ruler, LayoutGrid, SunMedium, Camera } from 'lucide-react';
import { ProductSKU } from '../lib/types';
import { generateWanxImage } from '../lib/ai';

interface AIAdImageViewProps {
    skus: ProductSKU[];
}

const ASPECT_RATIOS = [
    { id: '1:1', label: '1:1 正方形 (800*800 / 1024*1024)', desc: '京东/淘宝主图' },
    { id: '3:4', label: '3:4 竖图 (淘宝/小红书)', desc: '移动端全屏流' },
    { id: '16:9', label: '16:9 宽屏', desc: '详情页 Banner' }
];

const SCENE_STYLES = [
    { id: 'white', label: '极简白底', prompt: 'Pure white background, e-commerce product photography, high-end studio lighting, minimalist' },
    { id: 'modern', label: '现代办公/家居', prompt: 'Modern minimalist interior desk background, lifestyle product photography, high-end furniture' },
    { id: 'luxury', label: '轻奢大理石', prompt: 'Luxury marble countertop, soft elegant background, product placement on stone, high-end' },
    { id: 'wood', label: '天然木质', prompt: 'Natural warm wood texture background, organic feeling, soft natural shadows' },
    { id: 'nature', label: '户外实景', prompt: 'Outdoor natural daylight, park or garden background with beautiful bokeh, soft morning sun' }
];

const LIGHTING_MODES = [
    { id: 'soft', label: '柔和漫反射', prompt: 'soft diffused studio lighting' },
    { id: 'dramatic', label: '侧影高光', prompt: 'dramatic side lighting with hard shadows, high contrast' },
    { id: 'natural', label: '全彩自然光', prompt: 'natural sunlight through window with plant shadows' }
];

export const AIAdImageView = ({ skus }: AIAdImageViewProps) => {
    // SKU 搜索状态
    const [selectedSkuId, setSelectedSkuId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // 配置状态
    const [aspectRatio, setAspectRatio] = useState<any>('1:1');
    const [sceneStyle, setSceneStyle] = useState(SCENE_STYLES[0].id);
    const [lightingMode, setLightingMode] = useState(LIGHTING_MODES[0].id);
    const [customPrompt, setCustomPrompt] = useState('');
    
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // 点击外部关闭搜索下拉
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsSearchOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredSkus = useMemo(() => {
        const lower = searchTerm.toLowerCase().trim();
        if (!lower) return skus.slice(0, 8);
        return skus.filter(s => 
            s.code.toLowerCase().includes(lower) || 
            s.name.toLowerCase().includes(lower) ||
            (s.model && s.model.toLowerCase().includes(lower))
        ).slice(0, 15);
    }, [skus, searchTerm]);

    const selectedSku = useMemo(() => skus.find(s => s.id === selectedSkuId), [skus, selectedSkuId]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            const style = SCENE_STYLES.find(s => s.id === sceneStyle);
            const lighting = LIGHTING_MODES.find(l => l.id === lightingMode);
            
            // 构建高密度 Prompt
            const finalPrompt = `
                Product photography of: ${selectedSku?.name || 'High-end electronics'}, ${selectedSku?.brand || ''} ${selectedSku?.model || ''}.
                Style: ${style?.prompt}.
                Lighting: ${lighting?.prompt}.
                Details: 4K resolution, ultra-detailed, commercial quality, sharp focus, ${customPrompt}.
            `.trim();

            const url = await generateWanxImage(finalPrompt, { aspectRatio });
            setImgUrl(url);
        } catch (err: any) {
            setError(`物理视觉链路中断: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 md:p-12 w-full animate-fadeIn space-y-10 min-h-screen bg-[#F8FAFC]">
            {/* Header - Standardized 3-line format */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand uppercase tracking-[0.3em] leading-none">物理视觉神经网络已连接</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">AI 视觉创意舱</h1>
                    <p className="text-slate-400 font-bold text-sm tracking-wide">Neural Visual Synthesis & Strategic Content Factory</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Configuration Panel */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        
                        {/* 1. SKU Selection */}
                        <div className="space-y-4 relative z-10" ref={searchRef}>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Box size={14} className="text-brand" /> 1. 物理资产挂载
                            </label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="搜索 SKU 编码或名称..." 
                                    value={selectedSku ? selectedSku.name : searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        if (selectedSkuId) setSelectedSkuId('');
                                        setIsSearchOpen(true);
                                    }}
                                    onFocus={() => setIsSearchOpen(true)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] pl-12 pr-10 py-4 text-sm font-black text-slate-700 outline-none focus:border-brand shadow-inner transition-all" 
                                />
                                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                {selectedSku && (
                                    <button onClick={() => { setSelectedSkuId(''); setSearchTerm(''); }} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            
                            {isSearchOpen && !selectedSkuId && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-[28px] shadow-2xl z-50 p-4 max-h-64 overflow-y-auto no-scrollbar animate-slideIn">
                                    {filteredSkus.length > 0 ? filteredSkus.map(sku => (
                                        <button 
                                            key={sku.id} 
                                            onClick={() => { setSelectedSkuId(sku.id); setIsSearchOpen(false); }} 
                                            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl text-left transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-brand transition-all">
                                                <Box size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-800 truncate">{sku.name}</p>
                                                <p className="text-[9px] font-mono text-slate-400 mt-0.5">{sku.code}</p>
                                            </div>
                                        </button>
                                    )) : (
                                        <div className="p-8 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">无匹配物理资产</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Format Selection */}
                        <div className="space-y-4 relative z-10">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Ruler size={14} className="text-blue-500" /> 2. 输出物理比例 (Aspect)
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {ASPECT_RATIOS.map(ratio => (
                                    <button 
                                        key={ratio.id} 
                                        onClick={() => setAspectRatio(ratio.id)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${aspectRatio === ratio.id ? 'bg-brand/5 border-brand shadow-md ring-4 ring-brand/5' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                                    >
                                        <div className="text-left">
                                            <p className={`text-xs font-black ${aspectRatio === ratio.id ? 'text-slate-900' : 'text-slate-600'}`}>{ratio.label}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{ratio.desc}</p>
                                        </div>
                                        {aspectRatio === ratio.id && <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Style & Light */}
                        <div className="space-y-4 relative z-10">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Palette size={14} className="text-purple-500" /> 3. 场景与光影控制
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase ml-1">背景风格</span>
                                    <select value={sceneStyle} onChange={e => setSceneStyle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-700 outline-none appearance-none">
                                        {SCENE_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase ml-1">光影模式</span>
                                    <select value={lightingMode} onChange={e => setLightingMode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-700 outline-none appearance-none">
                                        {LIGHTING_MODES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 4. Custom Adjust */}
                        <div className="space-y-4 relative z-10">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <SunMedium size={14} className="text-amber-500" /> 4. 细节干预 (Optional)
                            </label>
                            <textarea 
                                value={customPrompt} 
                                onChange={e => setCustomPrompt(e.target.value)}
                                placeholder="输入额外细节描述，例如：增加反光、景深效果、加入冰块装饰等..."
                                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-[28px] px-6 py-5 text-xs font-bold text-slate-700 outline-none focus:border-brand shadow-inner resize-none no-scrollbar transition-all" 
                            />
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading || !selectedSkuId} 
                            className="w-full py-6 rounded-[28px] bg-brand text-white font-black text-sm hover:bg-[#5da035] shadow-2xl shadow-brand/20 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                        >
                            {isLoading ? <LoaderCircle size={22} className="animate-spin" /> : <Sparkles size={22} />}
                            {isLoading ? '视觉渲染中...' : '启动物理视觉渲染'}
                        </button>
                        
                        {error && (
                            <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-slideIn">
                                <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-rose-600 leading-relaxed">{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Visual Display */}
                <div className="lg:col-span-8 flex flex-col space-y-10">
                    <div className="bg-white rounded-[56px] p-12 h-full flex flex-col shadow-sm border border-slate-100 relative overflow-hidden group/result">
                        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(112,173,71,0.02),transparent_70%)] pointer-events-none"></div>
                        
                        <div className="relative z-10 flex items-center justify-between mb-10 border-b border-slate-50 pb-8">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-brand border border-slate-100 shadow-inner group-hover/result:rotate-6 transition-transform">
                                    <Camera size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">视觉渲染输出</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Algorithmic Visual Output Manifest</p>
                                </div>
                            </div>
                            {imgUrl && (
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => { const link = document.createElement('a'); link.href = imgUrl; link.download = `Product_Visual_${selectedSku?.code || 'Gen'}.png`; link.click(); }}
                                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-2"
                                    >
                                        <Download size={14} /> 导出资产
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                    <div className="w-24 h-24 border-4 border-slate-100 border-t-brand rounded-full animate-spin mb-10"></div>
                                    <p className="font-black text-xs uppercase tracking-[0.4em] animate-pulse">Synthesizing Neural Pixels...</p>
                                </div>
                            ) : imgUrl ? (
                                <div className="relative group/img max-w-full h-full flex items-center justify-center p-6 animate-fadeIn">
                                    <img 
                                        src={imgUrl} 
                                        className={`max-w-full max-h-full rounded-[40px] shadow-2xl border-8 border-white object-contain bg-slate-50 transition-transform duration-700 group-hover/img:scale-[1.02]`} 
                                        alt="Generated Visual" 
                                    />
                                    <div className="absolute inset-0 rounded-[40px] border border-slate-100 pointer-events-none"></div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-200 gap-10 opacity-30">
                                    <div className="w-32 h-32 rounded-[48px] border-4 border-dashed border-slate-200 flex items-center justify-center">
                                        <ImageIcon size={64} strokeWidth={1} />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-sm font-black uppercase tracking-[0.4em]">Laboratory Awaiting Ignition</p>
                                        <p className="text-[10px] font-bold text-slate-400">请选择左侧 SKU 资产并点击“启动渲染”进入视觉计算</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-12 pt-8 border-t border-slate-50 flex justify-between items-center relative z-10 shrink-0">
                            <div className="flex items-center gap-3 grayscale opacity-30">
                                <Sparkles size={16} className="text-brand animate-pulse"/>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Visual Synthesis Active</p>
                            </div>
                            <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.2em] italic">Physical Assets Digitization Hub</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
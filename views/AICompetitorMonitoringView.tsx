
import React from 'react';
import { Binoculars, ShieldAlert, Zap, Bot } from 'lucide-react';

export const AICompetitorMonitoringView = () => (
  <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
    <div className="mb-8">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 竞品监控</h1>
      <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">COMPETITIVE INTELLIGENCE ENGINE</p>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                <Binoculars size={48} className="text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-4">知己知彼，百战不殆</h3>
            <p className="text-slate-500 text-sm font-medium max-w-md leading-relaxed">
                本模块正在进行最后的神经网络调优。未来将为您提供：
            </p>
            <div className="mt-8 space-y-4 text-left w-full max-w-xs">
                {[
                    { icon: <ShieldAlert size={14} />, text: '竞品价格实时异动警报' },
                    { icon: <Zap size={14} />, text: 'SKU 级竞对流量穿透分析' },
                    { icon: <Bot size={14} />, text: 'AI 生成的针对性对垒建议' }
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-[#70AD47]">{item.icon}</div>
                        <span className="text-xs font-black text-slate-600">{item.text}</span>
                    </div>
                ))}
            </div>
            <div className="mt-12 flex items-center gap-2">
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#70AD47] animate-pulse" style={{animationDelay: `${i*0.2}s`}}></div>)}
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engine Under Development</span>
            </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-12 shadow-2xl flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                <Binoculars size={200} className="text-white" />
            </div>
            <div className="relative z-10">
                <div className="text-[#70AD47] text-xs font-black uppercase tracking-[0.3em] mb-4">Coming Q1 2026</div>
                <h2 className="text-white text-4xl font-black leading-tight">
                    定义下一代<br/>
                    <span className="text-[#70AD47]">对手透视</span>系统
                </h2>
                <p className="text-slate-400 text-sm mt-6 font-bold leading-relaxed max-w-sm">
                    通过分布式爬虫与 Gemini 深度视觉识别，我们将打破平台壁垒，让您的竞争对手在您面前毫无秘密。
                </p>
            </div>
            <div className="relative z-10 mt-20 border-t border-slate-800 pt-8 flex justify-between items-center">
                <div className="flex -space-x-3">
                    {[1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700"></div>)}
                    <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-[#70AD47] flex items-center justify-center text-white font-black text-[10px]">+80</div>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Beta Testing Enrolling</span>
            </div>
        </div>
    </div>
  </div>
);

import React from 'react';
import { Rocket } from 'lucide-react';

export const AIMarketingCopilotView = () => (
  <div className="p-8 max-w-[1600px] mx-auto animate-fadeIn">
    <div className="mb-8">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight">AI 智能营销官</h1>
      <p className="text-slate-500 mt-2 font-bold text-xs tracking-widest uppercase">AI MARKETING COPILOT</p>
    </div>
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 h-96 flex flex-col items-center justify-center text-slate-300 font-bold text-lg">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Rocket size={32} className="text-slate-400" />
        </div>
        <h3 className="text-slate-600 font-bold text-xl mb-2">洞察即行动，自动优化广告</h3>
        <p className="text-slate-400 text-sm">此模块正在全力开发中，敬请期待！</p>
        <p className="text-slate-400 text-sm mt-1">未来将支持一键创建广告活动、智能预算分配，以及7x24小时无人值守优化。</p>
    </div>
  </div>
);
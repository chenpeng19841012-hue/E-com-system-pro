import React from 'react';
import { 
    LayoutGrid, 
    Search, 
    Eye, 
    Package, 
    Database, 
    PanelLeftClose, 
    PanelLeftOpen,
    Bot,
    TrendingUp,
    MessageCircle,
    Image,
    Calculator,
    DollarSign,
    PackagePlus,
    Binoculars,
    FileText,
    Rocket,
    Tags,
    Heart,
    Camera // Import Camera icon for snapshot view
} from 'lucide-react';
import { View } from '../lib/types';

const SidebarItem = ({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }) => (
    <button 
        onClick={onClick}
        title={collapsed ? label : ''}
        className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-lg text-sm font-bold transition-all ${
            active 
            ? 'bg-[#70AD47] text-white shadow-lg shadow-[#70AD47]/20' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
    >
        <div className="shrink-0">{icon}</div>
        {!collapsed && <span className="truncate">{label}</span>}
    </button>
);

export const Sidebar = ({ currentView, setCurrentView, isSidebarCollapsed, setIsSidebarCollapsed }: {
    currentView: View;
    setCurrentView: (view: View) => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
}) => {
    return (
        <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-400 flex flex-col shrink-0 transition-all duration-300`}>
            <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-6 justify-between'} border-b border-slate-800`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 border border-slate-700">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 12L12 5L19 12" stroke="#70AD47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 20L12 13L19 20" stroke="#70AD47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    {!isSidebarCollapsed && <span className="font-black text-xl text-slate-100 tracking-tight whitespace-nowrap">数<span className="text-[#70AD47]">舰</span></span>}
                </div>
                {!isSidebarCollapsed && (
                  <button onClick={() => setIsSidebarCollapsed(true)} className="text-slate-500 hover:text-slate-200 p-1">
                      <PanelLeftClose size={16} />
                  </button>
                )}
            </div>

            <div className="p-4 space-y-1 overflow-y-auto flex-1 no-scrollbar">
                {isSidebarCollapsed && (
                   <div className="flex justify-center mb-4">
                       <button onClick={() => setIsSidebarCollapsed(false)} className="text-slate-500 hover:text-slate-200 p-1">
                           <PanelLeftOpen size={20} />
                       </button>
                   </div>
                )}

                {!isSidebarCollapsed && <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">核心分析</div>}
                <SidebarItem collapsed={isSidebarCollapsed} icon={<LayoutGrid size={18} />} label="AI驾驶舱" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Search size={18} />} label="多维查询" active={currentView === 'multiquery'} onClick={() => setCurrentView('multiquery')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<FileText size={18} />} label="运营报表" active={currentView === 'reports'} onClick={() => setCurrentView('reports')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Package size={18} />} label="资产管理" active={currentView === 'products'} onClick={() => setCurrentView('products')} />
                
                {!isSidebarCollapsed && <div className="px-4 py-2 mt-6 text-[10px] font-bold uppercase tracking-wider text-slate-600">AI 洞察与决策</div>}
                <SidebarItem collapsed={isSidebarCollapsed} icon={<PackagePlus size={18} />} label="AI 智能补货" active={currentView === 'ai-smart-replenishment'} onClick={() => setCurrentView('ai-smart-replenishment')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Binoculars size={18} />} label="AI 竞品监控" active={currentView === 'ai-competitor-monitoring'} onClick={() => setCurrentView('ai-competitor-monitoring')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Calculator size={18} />} label="AI产品报价" active={currentView === 'ai-quoting'} onClick={() => setCurrentView('ai-quoting')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<MessageCircle size={18} />} label="AI智能客服助手" active={currentView === 'ai-cs-assistant'} onClick={() => setCurrentView('ai-cs-assistant')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<DollarSign size={18} />} label="AI 利润分析" active={currentView === 'ai-profit-analytics'} onClick={() => setCurrentView('ai-profit-analytics')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<TrendingUp size={18} />} label="AI销售预测" active={currentView === 'ai-sales-forecast'} onClick={() => setCurrentView('ai-sales-forecast')} />

                {!isSidebarCollapsed && <div className="px-4 py-2 mt-6 text-[10px] font-bold uppercase tracking-wider text-slate-600">AI 执行与创造</div>}
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Rocket size={18} />} label="AI 智能营销官" active={currentView === 'ai-marketing-copilot'} onClick={() => setCurrentView('ai-marketing-copilot')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Bot size={18} />} label="AI文案生成" active={currentView === 'ai-description'} onClick={() => setCurrentView('ai-description')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Image size={18} />} label="AI广告图" active={currentView === 'ai-ad-image'} onClick={() => setCurrentView('ai-ad-image')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Tags size={18} />} label="动态定价引擎" active={currentView === 'dynamic-pricing-engine'} onClick={() => setCurrentView('dynamic-pricing-engine')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Heart size={18} />} label="客户生命周期管理" active={currentView === 'customer-lifecycle-hub'} onClick={() => setCurrentView('customer-lifecycle-hub')} />

                {!isSidebarCollapsed && <div className="px-4 py-2 mt-6 text-[10px] font-bold uppercase tracking-wider text-slate-600">数据工程</div>}
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Database size={18} />} label="数据中心" active={currentView === 'data-center'} onClick={() => setCurrentView('data-center')} />
                <SidebarItem collapsed={isSidebarCollapsed} icon={<Eye size={18} />} label="数据体验" active={currentView === 'data-experience'} onClick={() => setCurrentView('data-experience')} />
            </div>

            <div className="p-4 border-t border-slate-800">
                <button 
                  onClick={() => setCurrentView('system-snapshot')}
                  title={isSidebarCollapsed ? "系统快照中心" : ''}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-lg transition-colors cursor-pointer ${
                    currentView === 'system-snapshot' ? 'bg-slate-700' : 'bg-slate-800/50 hover:bg-slate-800'
                  }`}
                >
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm shrink-0">梧</div>
                    {!isSidebarCollapsed && (
                      <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-bold text-slate-200 truncate">梧桐翁</div>
                           <div className="text-xs text-slate-500">系统快照中心</div>
                      </div>
                    )}
                </button>
            </div>
        </div>
    );
};
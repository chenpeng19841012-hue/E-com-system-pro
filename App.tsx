
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, CloudSync as SyncIcon } from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { DashboardView } from './views/DashboardView';
import { MultiQueryView } from './views/MultiQueryView';
import { ReportsView } from './views/ReportsView';
import { SKUManagementView } from './views/SKUManagementView';
import { DataExperienceView } from './views/DataExperienceView';
import { DataCenterView } from './views/DataCenterView';
import { CloudSyncView } from './views/CloudSyncView';
import { AIProfitAnalyticsView } from './views/AIProfitAnalyticsView';
import { AISmartReplenishmentView } from './views/AISmartReplenishmentView';
import { AIQuotingView } from './views/AIQuotingView';
import { AIDescriptionView } from './views/AIDescriptionView';
import { AISalesForecastView } from './views/AISalesForecastView';
import { AIAssistantView } from './views/AIAssistantView';
import { AIAdImageView } from './views/AIAdImageView';
import { SystemSnapshotView } from './views/SystemSnapshotView';
import { AICompetitorMonitoringView } from './views/AICompetitorMonitoringView';
import { AIMarketingCopilotView } from './views/AIMarketingCopilotView';
import { DynamicPricingEngineView } from './views/DynamicPricingEngineView';
import { CustomerLifecycleHubView } from './views/CustomerLifecycleHubView';

import { View, TableType, ToastProps, FieldDefinition, Shop, ProductSKU, CustomerServiceAgent, UploadHistory, QuotingData, SkuList, Snapshot, SnapshotSettings } from './lib/types';
import { DB } from './lib/db';
import { INITIAL_SHANGZHI_SCHEMA, INITIAL_JINGZHUNTONG_SCHEMA, INITIAL_CUSTOMER_SERVICE_SCHEMA } from './lib/schemas';
import { normalizeDate, getSkuIdentifier } from './lib/helpers';
import { parseExcelFile } from './lib/excel';
import { createClient } from '@supabase/supabase-js';

const INITIAL_QUOTING_DATA: QuotingData = {
    "prices": {
        "主机": { "TSK-C3 I5-13400": 2700.0, "TSK-C3 I5-14500": 3300.0 },
        "内存": { "8G DDR5": 450.0, "16G DDR5": 1000.0 }
    },
    "settings": { "margin": 1.15 },
    "discounts": [{ "min_qty": 10, "rate": 0.98 }]
};

export const App = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [toasts, setToasts] = useState<ToastProps[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    
    const [schemas, setSchemas] = useState<any>({});
    const [shops, setShops] = useState<Shop[]>([]);
    const [skus, setSkus] = useState<ProductSKU[]>([]);
    const [agents, setAgents] = useState<CustomerServiceAgent[]>([]);
    const [skuLists, setSkuLists] = useState<SkuList[]>([]);
    const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
    const [quotingData, setQuotingData] = useState<QuotingData>(INITIAL_QUOTING_DATA);
    const [snapshotSettings, setSnapshotSettings] = useState<SnapshotSettings>({ autoSnapshotEnabled: true, retentionDays: 7 });
    const [factTables, setFactTables] = useState<any>({ shangzhi: [], jingzhuntong: [], customer_service: [] });

    const autoSyncTimer = useRef<any>(null);

    const addToast = (type: 'success' | 'error', title: string, message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    // --- 云端核心方法 ---
    const handleAutoCloudPush = useCallback(async () => {
        const config = await DB.loadConfig('cloud_sync_config', { url: '', key: '', autoSync: true });
        if (!config.url || !config.key || !config.autoSync) return;
        try {
            const supabase = createClient(config.url, config.key);
            const dbData = await DB.exportFullDatabase();
            await supabase.storage.from('backups').upload('main_database_mirror.json', new Blob([dbData], { type: 'application/json' }), { upsert: true });
        } catch (e) {}
    }, []);

    const handleAutoCloudPull = async () => {
        const config = await DB.loadConfig('cloud_sync_config', { url: '', key: '', autoSync: true });
        if (!config.url || !config.key) return;
        setIsCloudSyncing(true);
        try {
            const supabase = createClient(config.url, config.key);
            const { data, error } = await supabase.storage.from('backups').download('main_database_mirror.json');
            if (!error && data) {
                const text = await data.text();
                await DB.importFullDatabase(text);
                addToast('success', '云端同步成功', '已拉取最新业务快照。');
            }
        } catch (e) {
        } finally {
            setIsCloudSyncing(false);
        }
    };

    useEffect(() => {
        if (isAppLoading) return;
        if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
        autoSyncTimer.current = setTimeout(() => handleAutoCloudPush(), 5000);
        return () => { if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current); };
    }, [shops, skus, agents, skuLists, quotingData, isAppLoading, handleAutoCloudPush]);

    const loadMetadata = useCallback(async () => {
        setIsAppLoading(true);
        try {
            await handleAutoCloudPull();
            const [s_shops, s_skus, s_agents, s_skuLists, history, settings, q_data, s_sz, s_jzt, s_cs_schema] = await Promise.all([
                DB.loadConfig('dim_shops', []),
                DB.loadConfig('dim_skus', []),
                DB.loadConfig('dim_agents', []),
                DB.loadConfig('dim_sku_lists', []),
                DB.loadConfig('upload_history', []),
                DB.loadConfig('snapshot_settings', { autoSnapshotEnabled: true, retentionDays: 7 }),
                DB.loadConfig('quoting_data', INITIAL_QUOTING_DATA),
                DB.loadConfig('schema_shangzhi', INITIAL_SHANGZHI_SCHEMA),
                DB.loadConfig('schema_jingzhuntong', INITIAL_JINGZHUNTONG_SCHEMA),
                DB.loadConfig('schema_customer_service', INITIAL_CUSTOMER_SERVICE_SCHEMA)
            ]);
            const [f_sz, f_jzt, f_cs] = await Promise.all([
                DB.getRange('fact_shangzhi', '1970-01-01', '2099-12-31'),
                DB.getRange('fact_jingzhuntong', '1970-01-01', '2099-12-31'),
                DB.getRange('fact_customer_service', '1970-01-01', '2099-12-31')
            ]);
            setShops(s_shops); setSkus(s_skus); setAgents(s_agents); setSkuLists(s_skuLists);
            setUploadHistory(history); setSnapshotSettings(settings); setQuotingData(q_data);
            setSchemas({ shangzhi: s_sz, jingzhuntong: s_jzt, customer_service: s_cs_schema });
            setFactTables({ shangzhi: f_sz, jingzhuntong: f_jzt, customer_service: f_cs });
        } finally { setIsAppLoading(false); }
    }, []);

    useEffect(() => { loadMetadata(); }, [loadMetadata]);

    const renderView = () => {
        if (isAppLoading) return <div className="flex flex-col h-full items-center justify-center text-slate-400 font-black"><SyncIcon size={32} className={`mb-4 text-brand ${isCloudSyncing ? 'animate-spin' : ''}`} /><p className="tracking-widest uppercase text-xs">云舟引擎启航中...</p></div>;
        
        const commonProps = { skus, shops, agents, schemas, addToast };
        switch (currentView) {
            case 'dashboard': return <DashboardView {...commonProps} />;
            case 'multiquery': return <MultiQueryView {...commonProps} shangzhiData={factTables.shangzhi} jingzhuntongData={factTables.jingzhuntong} />;
            case 'reports': return <ReportsView {...commonProps} factTables={factTables} skuLists={skuLists} onAddNewSkuList={async (l) => { const n = [...skuLists, {...l, id: Date.now().toString()}]; setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onUpdateSkuList={async (l) => { const n = skuLists.map(x=>x.id===l.id?l:x); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onDeleteSkuList={(id) => { const n = skuLists.filter(x=>x.id!==id); setSkuLists(n); DB.saveConfig('dim_sku_lists', n); }} />;
            case 'data-center': return <DataCenterView onUpload={async ()=>{}} onBatchUpdate={async ()=>{}} history={uploadHistory} factTables={factTables} shops={shops} schemas={schemas} addToast={addToast} />;
            case 'cloud-sync': return <CloudSyncView addToast={addToast} />;
            case 'data-experience': return <DataExperienceView factTables={factTables} schemas={schemas} shops={shops} onClearTable={async (k:any)=>await DB.clearTable(`fact_${k}`)} onDeleteRows={async ()=>{}} onUpdateSchema={async (t:any, s:any) => { const ns = {...schemas, [t]: s}; setSchemas(ns); await DB.saveConfig(`schema_${t}`, s); }} addToast={addToast} />;
            case 'products': return <SKUManagementView {...commonProps} skuLists={skuLists} onAddNewSKU={async ()=>true} onUpdateSKU={async ()=>true} onDeleteSKU={()=>{}} onBulkAddSKUs={()=>{}} onAddNewShop={async ()=>true} onUpdateShop={async ()=>true} onDeleteShop={()=>{}} onBulkAddShops={()=>{}} onAddNewAgent={async ()=>true} onUpdateAgent={async ()=>true} onDeleteAgent={()=>{}} onBulkAddAgents={()=>{}} onAddNewSkuList={async ()=>true} onUpdateSkuList={async ()=>true} onDeleteSkuList={()=>{}} />;
            case 'ai-profit-analytics': return <AIProfitAnalyticsView {...commonProps} />;
            case 'ai-smart-replenishment': return <AISmartReplenishmentView shangzhiData={factTables.shangzhi} onUpdateSKU={async ()=>true} {...commonProps} />;
            case 'ai-quoting': return <AIQuotingView quotingData={quotingData} onUpdate={async (d) => { setQuotingData(d); await DB.saveConfig('quoting_data', d); }} addToast={addToast} />;
            case 'ai-description': return <AIDescriptionView skus={skus} />;
            case 'ai-sales-forecast': return <AISalesForecastView skus={skus} />;
            case 'ai-cs-assistant': return <AIAssistantView skus={skus} shops={shops} />;
            case 'ai-ad-image': return <AIAdImageView skus={skus} />;
            case 'ai-competitor-monitoring': return <AICompetitorMonitoringView />;
            case 'system-snapshot': return <SystemSnapshotView snapshots={[]} settings={snapshotSettings} onUpdateSettings={async (s) => { setSnapshotSettings(s); await DB.saveConfig('snapshot_settings', s); }} onCreate={()=>{}} onRestore={()=>{}} onDelete={()=>{}} onImport={()=>{}} addToast={addToast} />;
            default: return <DashboardView {...commonProps} />;
        }
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} />
            <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
                <main className="flex-1 overflow-auto relative no-scrollbar">
                    {renderView()}
                </main>
                <ToastContainer toasts={toasts} />
            </div>
        </div>
    );
};

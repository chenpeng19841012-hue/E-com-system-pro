
import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { DashboardView } from './views/DashboardView';
import { MultiQueryView } from './views/MultiQueryView';
import { ReportsView } from './views/ReportsView';
import { SKUManagementView } from './views/SKUManagementView';
import { DataExperienceView } from './views/DataExperienceView';
import { DataCenterView } from './views/DataCenterView';
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
import { normalizeDate } from './lib/helpers';
import { parseExcelFile } from './lib/excel';

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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isAppLoading, setIsAppLoading] = useState(true);
    
    // Metadata States (Stay in memory because they are small)
    const [schemas, setSchemas] = useState<any>({});
    const [shops, setShops] = useState<Shop[]>([]);
    const [skus, setSkus] = useState<ProductSKU[]>([]);
    const [agents, setAgents] = useState<CustomerServiceAgent[]>([]);
    const [skuLists, setSkuLists] = useState<SkuList[]>([]);
    const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
    const [quotingData, setQuotingData] = useState<QuotingData>(INITIAL_QUOTING_DATA);
    const [snapshotSettings, setSnapshotSettings] = useState<SnapshotSettings>({ autoSnapshotEnabled: true, retentionDays: 7 });

    // Fact Tables State (Loaded into memory for calculation views)
    // Fix: Added factTables state to hold large datasets for MultiQueryView and ReportsView
    const [factTables, setFactTables] = useState<any>({ shangzhi: [], jingzhuntong: [], customer_service: [] });

    const loadMetadata = useCallback(async () => {
        setIsAppLoading(true);
        try {
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

            // Fix: Fetch fact table data during metadata load to ensure it's available for reporting components
            const [f_sz, f_jzt, f_cs] = await Promise.all([
                DB.getRange('fact_shangzhi', '1970-01-01', '2099-12-31'),
                DB.getRange('fact_jingzhuntong', '1970-01-01', '2099-12-31'),
                DB.getRange('fact_customer_service', '1970-01-01', '2099-12-31')
            ]);

            setShops(s_shops);
            setSkus(s_skus);
            setAgents(s_agents);
            setSkuLists(s_skuLists);
            setUploadHistory(history);
            setSnapshotSettings(settings);
            setQuotingData(q_data);
            setSchemas({ shangzhi: s_sz, jingzhuntong: s_jzt, customer_service: s_cs_schema });
            setFactTables({ shangzhi: f_sz, jingzhuntong: f_jzt, customer_service: f_cs });
        } finally {
            setIsAppLoading(false);
        }
    }, []);

    useEffect(() => { loadMetadata(); }, [loadMetadata]);

    const addToast = (type: 'success' | 'error', title: string, message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    const handleProcessAndUpload = async (file: File, targetTable: TableType) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const { data: validData } = parseExcelFile(bstr);
                    const tableName = `fact_${targetTable}`;

                    const targetSchema = schemas[targetTable];
                    const labelToKeyMap = new Map<string, string>();
                    targetSchema.forEach((field: any) => {
                        labelToKeyMap.set(field.label, field.key);
                        field.tags?.forEach((tag: string) => labelToKeyMap.set(tag, field.key));
                    });

                    const processedRows = validData.map((rawRow: any) => {
                        const newRow: any = {};
                        for (const headerLabel in rawRow) {
                            const key = labelToKeyMap.get(headerLabel.trim());
                            if (key) newRow[key] = rawRow[headerLabel];
                        }
                        if (newRow.date) newRow.date = normalizeDate(newRow.date);
                        return newRow;
                    }).filter(row => row.date);

                    await DB.bulkAdd(tableName, processedRows);

                    const historyItem: UploadHistory = {
                        id: String(Date.now()),
                        fileName: file.name,
                        fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                        rowCount: processedRows.length,
                        uploadTime: new Date().toLocaleString(),
                        status: '成功',
                        targetTable: targetTable
                    };
                    const newHistory = [historyItem, ...uploadHistory].slice(0, 20);
                    setUploadHistory(newHistory);
                    await DB.saveConfig('upload_history', newHistory);

                    // Fix: Reload data from DB to update in-memory factTables state
                    await loadMetadata();

                    addToast('success', '同步完成', `成功导入 ${processedRows.length} 条记录。`);
                    resolve();
                } catch (err) {
                    addToast('error', '导入失败', '数据处理错误。');
                    reject(err);
                }
            };
            reader.readAsBinaryString(file);
        });
    };

    const handleClearTable = async (key: TableType) => {
        await DB.clearTable(`fact_${key}`);
        // Fix: Update local state after clearing table
        await loadMetadata();
        addToast('success', '清空成功', `物理表数据已重置。`);
    };

    const handleUpdateSKU = async (sku: ProductSKU) => {
        const updated = skus.map(s => s.id === sku.id ? sku : s);
        setSkus(updated);
        await DB.saveConfig('dim_skus', updated);
        return true;
    };

    const renderView = () => {
        if (isAppLoading) return <div className="flex h-full items-center justify-center text-slate-400 font-bold">引擎加载中...</div>;

        const commonProps = { skus, shops, agents, schemas, addToast };

        switch (currentView) {
            case 'dashboard': return <DashboardView {...commonProps} />;
            // Fix: Passed required shangzhiData and jingzhuntongData props to MultiQueryView
            case 'multiquery': return <MultiQueryView {...commonProps} shangzhiData={factTables.shangzhi} jingzhuntongData={factTables.jingzhuntong} />;
            // Fix: Passed required factTables prop to ReportsView
            case 'reports': return <ReportsView {...commonProps} factTables={factTables} skuLists={skuLists} onAddNewSkuList={async (l) => { const n = [...skuLists, {...l, id: Date.now().toString()}]; setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onUpdateSkuList={async (l) => { const n = skuLists.map(x=>x.id===l.id?l:x); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onDeleteSkuList={(id) => { const n = skuLists.filter(x=>x.id!==id); setSkuLists(n); DB.saveConfig('dim_sku_lists', n); }} />;
            // Fix: Passed real factTables instead of empty object to DataCenterView and DataExperienceView
            case 'data-center': return <DataCenterView onUpload={handleProcessAndUpload} history={uploadHistory} factTables={factTables} schemas={schemas} addToast={addToast} />;
            case 'data-experience': return <DataExperienceView factTables={factTables} schemas={schemas} onClearTable={handleClearTable} onUpdateSchema={async (t:any, s:any) => { const ns = {...schemas, [t]: s}; setSchemas(ns); await DB.saveConfig(`schema_${t}`, s); }} addToast={addToast} />;
            case 'products': return <SKUManagementView {...commonProps} skuLists={skuLists} onAddNewSKU={async (s) => { const n = [{...s, id:Date.now().toString()}, ...skus]; setSkus(n); await DB.saveConfig('dim_skus', n); return true; }} onUpdateSKU={handleUpdateSKU} onDeleteSKU={async (id) => { const n = skus.filter(s=>s.id!==id); setSkus(n); await DB.saveConfig('dim_skus', n); }} onBulkAddSKUs={async (ss) => { const n = [...ss.map((s,i)=>({...s, id:(Date.now()+i).toString()})), ...skus]; setSkus(n); await DB.saveConfig('dim_skus', n); }} onAddNewShop={async (s) => { const n = [{...s, id:Date.now().toString()}, ...shops]; setShops(n); await DB.saveConfig('dim_shops', n); return true; }} onUpdateShop={async (s) => { const n = shops.map(x=>x.id===s.id?s:x); setShops(n); await DB.saveConfig('dim_shops', n); return true; }} onDeleteShop={async (id) => { const n = shops.filter(x=>x.id!==id); setShops(n); await DB.saveConfig('dim_shops', n); }} onBulkAddShops={async (ss) => { const n = [...ss.map((s,i)=>({...s, id:(Date.now()+i).toString()})), ...shops]; setShops(n); await DB.saveConfig('dim_shops', n); }} onAddNewAgent={async (a) => { const n = [{...a, id:Date.now().toString()}, ...agents]; setAgents(n); await DB.saveConfig('dim_agents', n); return true; }} onUpdateAgent={async (a) => { const n = agents.map(x=>x.id===a.id?a:x); setAgents(n); await DB.saveConfig('dim_agents', n); return true; }} onDeleteAgent={async (id) => { const n = agents.filter(x=>x.id!==id); setAgents(n); await DB.saveConfig('dim_agents', n); }} onBulkAddAgents={async (as) => { const n = [...as.map((a,i)=>({...a, id:(Date.now()+i).toString()})), ...agents]; setAgents(n); await DB.saveConfig('dim_agents', n); }} onAddNewSkuList={async (l) => { const n = [{...l, id:Date.now().toString()}, ...skuLists]; setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onUpdateSkuList={async (l) => { const n = skuLists.map(x=>x.id===l.id?l:x); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onDeleteSkuList={async (id) => { const n = skuLists.filter(x=>x.id!==id); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); }} />;
            case 'ai-profit-analytics': return <AIProfitAnalyticsView {...commonProps} />;
            // Fix: Passed real factTables.shangzhi instead of empty array to AISmartReplenishmentView
            case 'ai-smart-replenishment': return <AISmartReplenishmentView shangzhiData={factTables.shangzhi} onUpdateSKU={handleUpdateSKU} {...commonProps} />;
            case 'ai-quoting': return <AIQuotingView quotingData={quotingData} onUpdate={async (d) => { setQuotingData(d); await DB.saveConfig('quoting_data', d); }} addToast={addToast} />;
            case 'ai-description': return <AIDescriptionView skus={skus} />;
            case 'ai-sales-forecast': return <AISalesForecastView skus={skus} />;
            case 'ai-cs-assistant': return <AIAssistantView skus={skus} shops={shops} />;
            case 'ai-ad-image': return <AIAdImageView skus={skus} />;
            case 'ai-competitor-monitoring': return <AICompetitorMonitoringView />;
            case 'ai-marketing-copilot': return <AIMarketingCopilotView />;
            case 'dynamic-pricing-engine': return <DynamicPricingEngineView />;
            case 'customer-lifecycle-hub': return <CustomerLifecycleHubView />;
            case 'system-snapshot': return <SystemSnapshotView snapshots={[]} settings={snapshotSettings} onUpdateSettings={async (s) => { setSnapshotSettings(s); await DB.saveConfig('snapshot_settings', s); }} onCreate={()=>{}} onRestore={()=>{}} onDelete={()=>{}} onImport={()=>{}} addToast={addToast} />;
            default: return <DashboardView {...commonProps} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} />
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <main className="flex-1 overflow-auto bg-slate-50/50 relative">
                    {renderView()}
                </main>
                <ToastContainer toasts={toasts} />
            </div>
        </div>
    );
};

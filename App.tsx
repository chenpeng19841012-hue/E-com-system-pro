
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

import { View, TableType, ToastProps, Shop, ProductSKU, CustomerServiceAgent, UploadHistory, QuotingData, SkuList, SnapshotSettings, MonitoredCompetitorShop, CompetitorGroup } from './lib/types';
import { DB } from './lib/db';
import { parseExcelFile } from './lib/excel';
import { INITIAL_SHANGZHI_SCHEMA, INITIAL_JINGZHUNTONG_SCHEMA, INITIAL_CUSTOMER_SERVICE_SCHEMA } from './lib/schemas';

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
    
    const [schemas, setSchemas] = useState<any>({});
    const [shops, setShops] = useState<Shop[]>([]);
    const [skus, setSkus] = useState<ProductSKU[]>([]);
    const [agents, setAgents] = useState<CustomerServiceAgent[]>([]);
    const [skuLists, setSkuLists] = useState<SkuList[]>([]);
    const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
    const [quotingData, setQuotingData] = useState<QuotingData>(INITIAL_QUOTING_DATA);
    const [snapshotSettings, setSnapshotSettings] = useState<SnapshotSettings>({ autoSnapshotEnabled: true, retentionDays: 7 });
    const [factTables, setFactTables] = useState<any>({ shangzhi: [], jingzhuntong: [], customer_service: [] });

    // Competitor Monitoring Data
    const [compShops, setCompShops] = useState<MonitoredCompetitorShop[]>([]);
    const [compGroups, setCompGroups] = useState<CompetitorGroup[]>([]);

    const addToast = (type: 'success' | 'error', title: string, message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    const loadMetadata = useCallback(async () => {
        try {
            // 在云原生模式下，DB.loadConfig 直接从 Supabase 拉取
            const [s_shops, s_skus, s_agents, s_skuLists, history, settings, q_data, s_sz, s_jzt, s_cs_schema, s_compShops, s_compGroups] = await Promise.all([
                DB.loadConfig('dim_shops', []),
                DB.loadConfig('dim_skus', []),
                DB.loadConfig('dim_agents', []),
                DB.loadConfig('dim_sku_lists', []),
                DB.loadConfig('upload_history', []),
                DB.loadConfig('snapshot_settings', { autoSnapshotEnabled: true, retentionDays: 7 }),
                DB.loadConfig('quoting_data', INITIAL_QUOTING_DATA),
                DB.loadConfig('schema_shangzhi', INITIAL_SHANGZHI_SCHEMA),
                DB.loadConfig('schema_jingzhuntong', INITIAL_JINGZHUNTONG_SCHEMA),
                DB.loadConfig('schema_customer_service', INITIAL_CUSTOMER_SERVICE_SCHEMA),
                DB.loadConfig('comp_shops', []),
                DB.loadConfig('comp_groups', [])
            ]);
            
            setShops(s_shops); setSkus(s_skus); setAgents(s_agents); setSkuLists(s_skuLists);
            setUploadHistory(history); setSnapshotSettings(settings); setQuotingData(q_data);
            setSchemas({ shangzhi: s_sz, jingzhuntong: s_jzt, customer_service: s_cs_schema });
            
            // 直连模式下不全量拉取 factTables
            setFactTables({ shangzhi: [], jingzhuntong: [], customer_service: [] }); 
            
            setCompShops(s_compShops); setCompGroups(s_compGroups);
        } catch (e) {
            console.error("Initialization failed:", e);
        }
    }, []);

    useEffect(() => { 
        const init = async () => {
            setIsAppLoading(true);
            await loadMetadata();
            setIsAppLoading(false);
        };
        init();
    }, [loadMetadata]);

    const onDeleteRows = async (tableType: TableType, ids: any[]) => {
        try {
            await DB.deleteRows(`fact_${tableType}`, ids);
        } catch (e) {
            addToast('error', '物理删除失败', '操作数据库时发生错误。');
            throw e;
        }
    };

    const handleBulkSave = async (key: string, data: any[], type: string) => {
        try {
            await DB.saveConfig(key, data);
            await loadMetadata();
            addToast('success', '同步成功', `已批量更新 ${data.length} 条${type}数据并同步至云端。`);
        } catch (e) {
            addToast('error', '物理写入失败', `无法保存${type}数据到本地库。`);
        }
    };

    const handleUpdateSKU = async (s: ProductSKU) => {
        const n = skus.map(x => x.id === s.id ? s : x);
        await DB.saveConfig('dim_skus', n);
        await loadMetadata();
        return true;
    };

    // 统一数据上传处理器 - 支持进度回调
    const handleUpload = async (file: File, type: TableType, shopId?: string, onProgress?: (p: number) => void) => {
        // 重置客户端以确保获取最新配置 (Fix for stale client)
        DB.resetClient();
        
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const { data } = parseExcelFile(e.target?.result);
                    if (data.length === 0) throw new Error("文件内容为空或格式无法识别");

                    // 1. 构建映射表 (Excel Header -> DB Column)
                    const headerMap: Record<string, string> = {};
                    const currentSchema = schemas[type];
                    
                    if (currentSchema && Array.isArray(currentSchema)) {
                        currentSchema.forEach((field: any) => {
                            // 映射 Label (e.g., 'CA') -> Key (e.g., 'paid_items')
                            headerMap[field.label] = field.key;
                            headerMap[field.label.trim()] = field.key;
                            
                            // 映射 Tags (e.g., '成交商品件数') -> Key
                            if (field.tags) {
                                field.tags.forEach((tag: string) => headerMap[tag] = field.key);
                            }
                            // 映射自身 Key (以防 Excel 表头已经是 DB 字段名)
                            headerMap[field.key] = field.key;
                        });
                    }

                    // 2. 数据增强与映射
                    const enrichedData = data.map(row => {
                        const mappedRow: any = {};
                        
                        // 标准化日期 (优先处理)
                        let normalizedDate = null;
                        if (row['日期']) {
                             if (typeof row['日期'] === 'number') {
                                 const date = new Date((row['日期'] - 25569) * 86400 * 1000);
                                 normalizedDate = date.toISOString().split('T')[0];
                             } else {
                                 normalizedDate = row['日期'];
                             }
                        } else if (row['date']) {
                            normalizedDate = row['date'];
                        }
                        if (normalizedDate) mappedRow['date'] = normalizedDate;

                        // 注入 shopId (如果用户在下拉菜单选了)
                        if (shopId) {
                            const shop = shops.find(s => s.id === shopId);
                            if (shop) mappedRow['shop_name'] = shop.name;
                        } else if (row['店铺名称'] || row['shop_name']) {
                            mappedRow['shop_name'] = row['店铺名称'] || row['shop_name'];
                        }

                        // 核心映射逻辑
                        Object.keys(row).forEach(excelKey => {
                            const cleanKey = excelKey.trim();
                            const dbKey = headerMap[cleanKey] || headerMap[cleanKey.toUpperCase()];
                            
                            if (dbKey) {
                                // 防止覆盖已处理的 date/shop_name，除非新值非空
                                if ((dbKey === 'date' || dbKey === 'shop_name') && mappedRow[dbKey]) return;
                                mappedRow[dbKey] = row[excelKey];
                            } else {
                                // 如果没有映射，保留原样? 
                                // Supabase 会报错 "Column not found" 如果包含无效列。
                                // 策略：仅保留映射成功的列，以及 date/shop_name。
                            }
                        });

                        return mappedRow;
                    });

                    // 写入数据库 (Direct Cloud Upload)
                    const tableName = `fact_${type}`;
                    await DB.bulkAdd(tableName, enrichedData, onProgress);

                    // 记录历史
                    const newHistoryItem: UploadHistory = {
                        id: Date.now().toString(),
                        fileName: file.name,
                        fileSize: (file.size / 1024).toFixed(1) + 'KB',
                        rowCount: data.length,
                        uploadTime: new Date().toLocaleString(),
                        status: '成功',
                        targetTable: type
                    };
                    const updatedHistory = [newHistoryItem, ...uploadHistory];
                    setUploadHistory(updatedHistory);
                    await DB.saveConfig('upload_history', updatedHistory);

                    // 刷新视图
                    await loadMetadata();
                    addToast('success', '云端写入完成', `已成功将 ${data.length} 条数据注入 Supabase 数据库。`);
                    resolve();
                } catch (err: any) {
                    addToast('error', '上传失败', err.message);
                    reject(err);
                }
            };
            reader.readAsBinaryString(file);
        });
    };

    const handleBatchUpdate = async (skusToUpdate: string[], shopId: string) => {
        try {
            const shop = shops.find(s => s.id === shopId);
            if (!shop) throw new Error("目标店铺不存在");
            addToast('error', '操作受限', '云原生模式下暂不支持批量修改海量数据，请使用 Supabase SQL Editor 执行 UPDATE 语句。');
        } catch (e: any) {
            addToast('error', '批量更新失败', e.message);
        }
    };

    const renderView = () => {
        if (isAppLoading) return (
            <div className="flex flex-col h-full items-center justify-center text-slate-400 font-black bg-white">
                <SyncIcon size={48} className="mb-4 text-brand animate-spin" />
                <p className="tracking-[0.4em] uppercase text-xs font-black">连接云端资产库...</p>
                <p className="text-[10px] mt-2 opacity-50">Connecting to Supabase Master Node</p>
            </div>
        );
        
        const commonProps = { skus, shops, agents, schemas, addToast };
        switch (currentView) {
            case 'dashboard': return <DashboardView {...commonProps} />;
            case 'multiquery': return <MultiQueryView {...commonProps} shangzhiData={factTables.shangzhi} jingzhuntongData={factTables.jingzhuntong} />;
            case 'reports': return <ReportsView {...commonProps} factTables={factTables} skuLists={skuLists} onAddNewSkuList={async (l:any) => { const n = [...skuLists, {...l, id: Date.now().toString()}]; setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onUpdateSkuList={async (l:any) => { const n = skuLists.map(x=>x.id===l.id?l:x); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} onDeleteSkuList={(id:any) => { const n = skuLists.filter(x=>x.id!==id); setSkuLists(n); DB.saveConfig('dim_sku_lists', n); }} />;
            case 'data-center': return <DataCenterView onUpload={handleUpload} onBatchUpdate={handleBatchUpdate} history={uploadHistory} factTables={factTables} shops={shops} schemas={schemas} addToast={addToast} />;
            case 'cloud-sync': return <CloudSyncView addToast={addToast} />;
            case 'data-experience': return <DataExperienceView factTables={factTables} schemas={schemas} shops={shops} onClearTable={async (k:any)=>await DB.clearTable(`fact_${k}`)} onDeleteRows={onDeleteRows} onRefreshData={loadMetadata} onUpdateSchema={async (t:any, s:any) => { const ns = {...schemas, [t]: s}; setSchemas(ns); await DB.saveConfig(`schema_${t}`, s); }} addToast={addToast} />;
            case 'products': return (
                <SKUManagementView 
                    {...commonProps} 
                    skuLists={skuLists} 
                    onAddNewSKU={async (s)=> { const n = [...skus, {...s, id: Date.now().toString()}]; await handleBulkSave('dim_skus', n, 'SKU'); return true; }} 
                    onUpdateSKU={handleUpdateSKU} 
                    onDeleteSKU={async (id)=> { const n = skus.filter(x=>x.id!==id); await handleBulkSave('dim_skus', n, 'SKU'); }} 
                    onBulkAddSKUs={async (newList)=> { 
                        const updatedSkus = [...skus];
                        newList.forEach(newItem => {
                            const index = updatedSkus.findIndex(s => s.code === newItem.code);
                            if (index !== -1) {
                                updatedSkus[index] = { ...updatedSkus[index], ...newItem };
                            } else {
                                updatedSkus.push({ ...newItem, id: Math.random().toString(36).substr(2, 9) });
                            }
                        });
                        await handleBulkSave('dim_skus', updatedSkus, 'SKU');
                    }} 
                    onAddNewShop={async (s)=> { const n = [...shops, {...s, id: Date.now().toString()}]; await handleBulkSave('dim_shops', n, '店铺'); return true; }} 
                    onUpdateShop={async (s)=> { const n = shops.map(x=>x.id===s.id?s:x); await handleBulkSave('dim_shops', n, '店铺'); return true; }} 
                    onDeleteShop={async (id)=> { const n = shops.filter(x=>x.id!==id); await handleBulkSave('dim_shops', n, '店铺'); }} 
                    onBulkAddShops={async (newList)=> {
                        const updatedShops = [...shops];
                        newList.forEach(newItem => {
                            const index = updatedShops.findIndex(s => s.name === newItem.name);
                            if (index !== -1) {
                                updatedShops[index] = { ...updatedShops[index], ...newItem };
                            } else {
                                updatedShops.push({ ...newItem, id: Math.random().toString(36).substr(2, 9) });
                            }
                        });
                        await handleBulkSave('dim_shops', updatedShops, '店铺');
                    }}
                    onAddNewAgent={async (s)=> { const n = [...agents, {...s, id: Date.now().toString()}]; await handleBulkSave('dim_agents', n, '客服'); return true; }} 
                    onUpdateAgent={async (s)=> { const n = agents.map(x=>x.id===s.id?s:x); await handleBulkSave('dim_agents', n, '客服'); return true; }} 
                    onDeleteAgent={async (id)=> { const n = agents.filter(x=>x.id!==id); await handleBulkSave('dim_agents', n, '客服'); }}
                    onBulkAddAgents={async (newList)=> {
                        const updatedAgents = [...agents];
                        newList.forEach(newItem => {
                            const index = updatedAgents.findIndex(a => a.account === newItem.account);
                            if (index !== -1) {
                                updatedAgents[index] = { ...updatedAgents[index], ...newItem };
                            } else {
                                updatedAgents.push({ ...newItem, id: Math.random().toString(36).substr(2, 9) });
                            }
                        });
                        await handleBulkSave('dim_agents', updatedAgents, '客服');
                    }}
                    onAddNewSkuList={async (l:any) => { const n = [...skuLists, {...l, id: Date.now().toString()}]; setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} 
                    onUpdateSkuList={async (l:any) => { const n = skuLists.map(x=>x.id===l.id?l:x); setSkuLists(n); await DB.saveConfig('dim_sku_lists', n); return true; }} 
                    onDeleteSkuList={(id:any) => { const n = skuLists.filter(x=>x.id!==id); setSkuLists(n); DB.saveConfig('dim_sku_lists', n); }}
                />
            );
            case 'ai-profit-analytics': return <AIProfitAnalyticsView {...commonProps} />;
            case 'ai-smart-replenishment': return <AISmartReplenishmentView shangzhiData={factTables.shangzhi} onUpdateSKU={handleUpdateSKU} {...commonProps} />;
            case 'ai-quoting': return <AIQuotingView quotingData={quotingData} onUpdate={async (d:any) => { setQuotingData(d); await DB.saveConfig('quoting_data', d); }} addToast={addToast} />;
            case 'ai-description': return <AIDescriptionView skus={skus} />;
            case 'ai-sales-forecast': return <AISalesForecastView skus={skus} />;
            case 'ai-cs-assistant': return <AIAssistantView skus={skus} shops={shops} addToast={addToast} />;
            case 'ai-ad-image': return <AIAdImageView skus={skus} />;
            case 'system-snapshot': return <SystemSnapshotView snapshots={[]} settings={snapshotSettings} onUpdateSettings={async (s:any) => { setSnapshotSettings(s); await DB.saveConfig('snapshot_settings', s); }} onCreate={()=>{}} onRestore={()=>{}} onDelete={()=>{}} onImport={()=>{}} addToast={addToast} />;
            case 'ai-competitor-monitoring': return (
                <AICompetitorMonitoringView 
                    compShops={compShops} 
                    compGroups={compGroups} 
                    shangzhiData={factTables.shangzhi}
                    onUpdateCompShops={async (data) => { setCompShops(data); await DB.saveConfig('comp_shops', data); await loadMetadata(); }}
                    onUpdateCompGroups={async (data) => { setCompGroups(data); await DB.saveConfig('comp_groups', data); await loadMetadata(); }}
                    addToast={addToast} 
                />
            );
            default: return <DashboardView {...commonProps} />;
        }
    };

    return (
        <div className="flex flex-row h-screen w-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed} />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative border-l border-slate-200">
                <main className="flex-1 overflow-y-auto no-scrollbar relative">
                    {renderView()}
                </main>
                <ToastContainer toasts={toasts} />
            </div>
        </div>
    );
};

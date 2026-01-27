
export type View = 'dashboard' | 'multiquery' | 'reports' | 'ai-description' | 'ai-sales-forecast' | 'ai-cs-assistant' | 'ai-ad-image' | 'ai-quoting' | 'products' | 'data-experience' | 'data-center' | 'ai-profit-analytics' | 'ai-smart-replenishment' | 'ai-competitor-monitoring' | 'ai-marketing-copilot' | 'dynamic-pricing-engine' | 'customer-lifecycle-hub' | 'system-snapshot' | 'cloud-sync';
export type TableType = 'shangzhi' | 'jingzhuntong' | 'customer_service';
export type ProductSubView = 'sku' | 'shop' | 'agent' | 'list';
export type DataExpSubView = 'preview' | 'schema';
export type FieldDataType = 'STRING' | 'INTEGER' | 'REAL' | 'TIMESTAMP';

export interface ToastProps {
  id: number;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldDataType;
  required?: boolean;
  tags?: string[];
}

export interface Shop {
  id: string;
  name:string;
  platformId?: string;
  mode: string; 
}

export type SKUStatus = '待售' | '在售' | '下架';
export type SKUAdvertisingStatus = '在投' | '未投';
export type SKUMode = '入仓' | '厂直';

export interface ProductSKU {
  id: string;
  name: string;
  code: string;
  shopId: string;
  brand: string;
  category: string;
  model?: string;
  mtm?: string;
  configuration?: string;
  mode?: SKUMode;
  status?: SKUStatus;
  advertisingStatus?: SKUAdvertisingStatus;
  costPrice?: number;
  sellingPrice?: number;
  promoPrice?: number;
  jdCommission?: number;
  warehouseStock?: number;
  factoryStock?: number;
  isStatisticsEnabled?: boolean; // 新增：是否参与统计
}

export interface CustomerServiceAgent {
  id: string;
  name: string;
  account: string;
  shopIds: string[];
}

export interface SkuList {
  id: string;
  name: string;
  skuCodes: string[];
}

export interface UploadHistory {
  id: string;
  fileName: string;
  fileSize: string;
  rowCount: number;
  uploadTime: string;
  status: '成功' | '失败';
  targetTable: TableType;
}

// AI Quoting System Types
export interface QuotingDiscount {
  min_qty: number;
  rate: number;
}

export interface QuotingSettings {
  margin: number;
}

export interface QuotingData {
  prices: Record<string, Record<string, number>>;
  settings: QuotingSettings;
  discounts: QuotingDiscount[];
}

// System Snapshot Types
export interface SnapshotSettings {
  autoSnapshotEnabled: boolean;
  retentionDays: number;
}

export interface Snapshot {
  id: string; // ISO string timestamp
  type: 'manual' | 'auto';
  size: number; // in bytes
  data: Record<string, any>;
}

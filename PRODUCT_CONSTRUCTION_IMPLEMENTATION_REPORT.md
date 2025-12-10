# 商品結構與 BOM 實作報告 (Product Construction Implementation Report)

## 1. 概述
為了支援電商與製造業常見的「組合商品 (Bundles)」與「加工組裝 (Manufacturing)」場景，我們對系統進行了核心升級，引入了 **BOM (Bill of Materials)** 與 **組裝單 (Assembly Order)** 的概念。

## 2. 資料庫架構升級 (Schema Upgrade)

### 2.1 商品類型 (`ProductType`)
新增了 `ProductType` Enum，將商品分為四類：
- **SIMPLE**: 一般商品 (買進賣出，如：iPhone 15)。
- **BUNDLE**: 虛擬組合 (賣出時自動扣除子件庫存，如：聖誕禮盒)。
- **MANUFACTURED**: 製成品 (需透過組裝單入庫，如：自行組裝的電腦)。
- **SERVICE**: 服務 (無庫存，如：運費、安裝費)。

### 2.2 物料清單 (`BillOfMaterial`)
新增 `BillOfMaterial` 模型，定義父子階層關係：
- `parentId`: 父商品 (Bundle or Manufactured)。
- `childId`: 子商品 (Component)。
- `quantity`: 每個父商品需要多少子商品。

### 2.3 組裝單 (`AssemblyOrder`)
新增 `AssemblyOrder` 模型，用於執行庫存轉換：
- 支援 **組裝 (ASSEMBLE)** 與 **拆解 (DISASSEMBLE)**。
- 記錄成本轉換 (`totalCostBase`)。

## 3. 後端模組實作 (`ProductModule`)

已建立全新的 `ProductModule`，提供以下功能：

### 3.1 商品管理 (CRUD)
- `POST /products`: 建立商品 (支援設定類型、價格、成本)。
- `GET /products`: 查詢商品列表 (支援依類型、分類篩選)。
- `GET /products/:id`: 查詢商品詳情 (包含 BOM 結構)。
- `PATCH /products/:id`: 更新商品資訊。

### 3.2 BOM 管理
- `POST /products/:id/bom`: 新增 BOM 子件。
  - 驗證：父商品類型必須為 BUNDLE 或 MANUFACTURED。
  - 驗證：不可將自己設為子件 (防止直接遞迴)。
- `DELETE /products/:id/bom/:childId`: 移除 BOM 子件。

## 4. 下一步建議
1.  **前端介面**: 實作「商品管理」頁面，支援 BOM 的視覺化編輯。
2.  **銷售扣庫邏輯**: 更新 `SalesService`，當訂單包含 `BUNDLE` 商品時，自動展開 BOM 並扣除子件庫存。
3.  **組裝流程**: 實作 `AssemblyService`，處理組裝單的庫存轉換與成本滾算。

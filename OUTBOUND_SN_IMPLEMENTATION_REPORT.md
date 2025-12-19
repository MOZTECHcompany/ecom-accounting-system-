# Outbound Serial Number Selection Implementation Report

## Overview
Implemented the logic to select and track Serial Numbers (SN) during the Sales Order fulfillment process. This ensures that specific units (identified by SN) are marked as `SOLD` when they leave the warehouse.

## Changes

### Backend
1.  **Inventory Service** (`backend/src/modules/inventory/inventory.service.ts`):
    *   Added `markSerialNumbersAsSold`: Updates SN status to `SOLD`, clears `warehouseId`, and sets `outboundRefType`/`outboundRefId`.
    *   Added `getWarehouses`: Helper to list active warehouses.

2.  **Sales Service** (`backend/src/modules/sales/sales.service.ts`):
    *   Updated `fulfillSalesOrder`: Now accepts `itemSerialNumbers` map.
    *   Added validation: Checks if SN-tracked products have the correct number of SNs provided.
    *   Integration: Calls `inventoryService.markSerialNumbersAsSold` before deducting stock.

3.  **Controllers**:
    *   `SalesController`: Added `POST /sales/orders/:id/fulfill` endpoint.
    *   `InventoryController`: Added `GET /inventory/warehouses` endpoint.

4.  **DTO**:
    *   Created `FulfillSalesOrderDto` to define the fulfillment request structure.

### Frontend
1.  **Services**:
    *   `inventory.service.ts`: Created to fetch warehouses.
    *   `sales.service.ts`: Added `fulfill` method.

2.  **Components**:
    *   `FulfillOrderModal.tsx`: New modal component that:
        *   Allows selecting the source warehouse.
        *   Dynamically lists items requiring SNs.
        *   Validates that the number of entered SNs matches the order quantity.
    *   `OrderDetailsDrawer.tsx`: Added a "Fulfill" button that opens the modal.

3.  **Pages**:
    *   `SalesPage.tsx`: Updated to refresh the order list after successful fulfillment.

## Workflow
1.  User opens a Sales Order in the Frontend.
2.  User clicks "Fulfill" (出貨).
3.  Modal appears asking for:
    *   Source Warehouse.
    *   Serial Numbers for any tracked items (e.g., "SN1", "SN2").
4.  Frontend sends request to `POST /sales/orders/:id/fulfill`.
5.  Backend:
    *   Validates SNs exist and are `AVAILABLE`.
    *   Updates SNs to `SOLD`.
    *   Reduces inventory quantity (Inventory Transaction).
6.  Order is marked as fulfilled (implicitly by stock deduction, though explicit status update might be needed in `SalesOrderService` if not already handled).

## Next Steps
*   **Testing**: Verify the flow with actual data (create PO -> Receive SNs -> Create SO -> Fulfill with SNs).
*   **Returns**: Implement logic for Sales Returns (RMA) to mark SNs as `RETURNED` or `AVAILABLE` again.

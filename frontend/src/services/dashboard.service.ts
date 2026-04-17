import api from "./api";

const DEFAULT_ENTITY_ID =
  import.meta.env.VITE_DEFAULT_ENTITY_ID?.trim() || "tw-entity-001";

export type DashboardPerformanceBucket = {
  key: string;
  label: string;
  account?: string;
  storeName?: string | null;
  gross: number;
  orderCount: number;
  payoutGross: number;
  payoutNet: number;
  feeTotal: number;
  paymentCount: number;
  reconciledCount: number;
  pendingPayoutCount: number;
};

export type DashboardSalesOverview = {
  entityId: string;
  range: {
    startDate: string | null;
    endDate: string | null;
  };
  buckets: DashboardPerformanceBucket[];
  total: DashboardPerformanceBucket;
};

export const dashboardService = {
  async getSalesOverview(params?: {
    entityId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DashboardSalesOverview> {
    const query = new URLSearchParams();
    query.set("entityId", params?.entityId?.trim() || DEFAULT_ENTITY_ID);
    if (params?.startDate) {
      query.set("startDate", params.startDate);
    }
    if (params?.endDate) {
      query.set("endDate", params.endDate);
    }
    query.set("_ts", String(Date.now()));

    const response = await api.get<DashboardSalesOverview>(
      `/reports/dashboard-sales-overview?${query.toString()}`,
    );
    return response.data;
  },
};

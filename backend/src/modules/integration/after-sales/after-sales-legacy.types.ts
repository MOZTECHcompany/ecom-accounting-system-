export type LegacyAfterSalesHealth = {
  ok: true;
  mode: 'read_only';
  contractVersion: string;
  sourceCommit: string;
  featureBaseline?: string;
  checkedAt: string;
};

export type LegacyAfterSalesUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: {
    code: string;
    name: string;
  };
};

export type LegacyAfterSalesCaseSummary = {
  id: string;
  caseNumber: string;
  type: string;
  status: string;
  sourceChannel: string;
  referenceNumber: string | null;
  contactName: string;
  isUrgent: boolean;
  handler: LegacyAfterSalesUser | null;
  assignee: LegacyAfterSalesUser | null;
  registeredAt: string;
  receivedAt: string | null;
  currentStatusChangedAt: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: Record<string, number>;
};

export type LegacyAfterSalesCaseList = {
  items: LegacyAfterSalesCaseSummary[];
  page: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  contractVersion: string;
  sourceCommit: string;
  featureBaseline?: string;
};

export type LegacyAfterSalesCaseDetail = {
  item: Record<string, unknown>;
  contractVersion: string;
  sourceCommit: string;
  featureBaseline?: string;
};

export type AfterSalesReadiness = {
  configured: boolean;
  connected: boolean;
  mode: 'read_only';
  contractVersion: string | null;
  sourceCommit: string | null;
  featureBaseline: string | null;
  checkedAt: string;
  reason?: 'not_configured' | 'connection_failed';
};

import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Button,
  Timeline,
  Card,
  message,
  Radio,
  DatePicker,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  BankOutlined,
  DollarOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import FinancialHealthWidget from "../components/FinancialHealthWidget";
import PageSkeleton from "../components/PageSkeleton";
import AIInsightsWidget from "../components/AIInsightsWidget";
import { shopifyService } from "../services/shopify.service";
import { oneShopService } from "../services/oneshop.service";
import {
  dashboardService,
  DashboardPerformanceBucket,
  DashboardSalesOverview,
} from "../services/dashboard.service";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DASHBOARD_TZ = "Asia/Taipei";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault(DASHBOARD_TZ);

type RangeMode = "all" | "today" | "yesterday" | "last7d" | "custom";
type CustomRange = [Dayjs, Dayjs] | null;
type RangeValue = [Dayjs | null, Dayjs | null] | null;

function resolveRange(
  mode: RangeMode,
  timezone: string,
  customRange: CustomRange,
) {
  if (mode === "today") {
    const start = dayjs().tz(timezone).startOf("day");
    const end = dayjs().tz(timezone).endOf("day");
    return { since: start.toISOString(), until: end.toISOString() };
  }

  if (mode === "yesterday") {
    const start = dayjs().tz(timezone).subtract(1, "day").startOf("day");
    const end = dayjs().tz(timezone).subtract(1, "day").endOf("day");
    return { since: start.toISOString(), until: end.toISOString() };
  }

  if (mode === "last7d") {
    const end = dayjs().tz(timezone).endOf("day");
    const start = end.subtract(6, "day").startOf("day");
    return { since: start.toISOString(), until: end.toISOString() };
  }

  if (mode === "custom" && customRange && customRange[0] && customRange[1]) {
    const start = customRange[0].tz(timezone, true).startOf("day");
    const end = customRange[1].tz(timezone, true).endOf("day");
    return { since: start.toISOString(), until: end.toISOString() };
  }

  return { since: undefined, until: undefined };
}

function getBucketAccent(index: number) {
  const accents = [
    "from-sky-500/15 to-sky-100/10 text-sky-600",
    "from-emerald-500/15 to-emerald-100/10 text-emerald-600",
    "from-amber-500/15 to-amber-100/10 text-amber-600",
    "from-fuchsia-500/15 to-fuchsia-100/10 text-fuchsia-600",
    "from-slate-700/15 to-slate-100/10 text-slate-700",
  ];
  return accents[index % accents.length];
}

function getBucketStatus(bucket: DashboardPerformanceBucket) {
  if (!bucket.paymentCount) {
    return {
      color: "default" as const,
      label: "待同步金流",
      helper: "目前只有訂單，尚未建立收款或撥款資料",
    };
  }

  if (bucket.pendingPayoutCount === 0) {
    return {
      color: "green" as const,
      label: "已完成對帳",
      helper: "這個區塊的收款都已完成對帳回填",
    };
  }

  if (bucket.reconciledCount > 0) {
    return {
      color: "gold" as const,
      label: "部分待撥款",
      helper: "已有部分收款完成對帳，仍有款項待撥或待核對",
    };
  }

  return {
    color: "blue" as const,
    label: "待撥款 / 待對帳",
    helper: "訂單已進系統，但金流與撥款明細尚未全部完成回填",
  };
}

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rangeMode, setRangeMode] = useState<RangeMode>("today");
  const [customRange, setCustomRange] = useState<CustomRange>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [overview, setOverview] = useState<DashboardSalesOverview | null>(null);

  useEffect(() => {
    if (rangeMode === "custom" && (!customRange?.[0] || !customRange?.[1])) {
      setLoading(false);
      return;
    }

    const storedEntityId = localStorage.getItem("entityId")?.trim();
    const { since, until } = resolveRange(rangeMode, DASHBOARD_TZ, customRange);

    let ignore = false;

    const fetchSummary = async () => {
      setLoading(true);
      try {
        const summary = await dashboardService.getSalesOverview({
          entityId: storedEntityId,
          startDate: since,
          endDate: until,
        });

        if (ignore) return;

        setOverview(summary);
      } catch (error: any) {
        if (!ignore) {
          message.error(error?.response?.data?.message || "讀取儀表板資料失敗");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      ignore = true;
    };
  }, [rangeMode, customRange, refreshToken]);

  const handleCustomRangeChange = (value: RangeValue) => {
    if (!value || !value[0] || !value[1]) {
      setCustomRange(null);
      return;
    }
    setCustomRange([value[0], value[1]]);
  };

  const handleManualSync = async () => {
    const storedEntityId = localStorage.getItem("entityId")?.trim();
    const { since, until } = resolveRange(rangeMode, DASHBOARD_TZ, customRange);
    setSyncing(true);
    try {
      const [
        shopifyOrdersResult,
        shopifyTransactionsResult,
        oneShopOrdersResult,
        oneShopTransactionsResult,
      ] = await Promise.all([
        shopifyService.syncOrders({ entityId: storedEntityId, since, until }),
        shopifyService.syncTransactions({
          entityId: storedEntityId,
          since,
          until,
        }),
        oneShopService.syncOrders({ entityId: storedEntityId, since, until }),
        oneShopService.syncTransactions({
          entityId: storedEntityId,
          since,
          until,
        }),
      ]);

      message.success(
        `同步完成：Shopify 訂單 ${
          shopifyOrdersResult.created + shopifyOrdersResult.updated
        } 筆、1Shop 訂單 ${
          oneShopOrdersResult.created + oneShopOrdersResult.updated
        } 筆、Shopify 金流 ${
          shopifyTransactionsResult.created + shopifyTransactionsResult.updated
        } 筆、1Shop 金流 ${
          oneShopTransactionsResult.created + oneShopTransactionsResult.updated
        } 筆`,
      );
      setRefreshToken((prev) => prev + 1);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "同步失敗，請稍後再試");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }
  const performanceBuckets = overview
    ? [...overview.buckets, overview.total]
    : [];
  const total = overview?.total;

  return (
    <div className="space-y-8">
      {/* AI Insights Widget */}
      <AIInsightsWidget />

      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Title
              level={2}
              className="!text-gray-800 font-light tracking-tight !mb-0"
            >
              Dashboard
            </Title>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-green"></div>
              <span className="text-xs font-medium text-green-600 uppercase tracking-wider">
                Live Updates
              </span>
            </div>
          </div>
          <Text className="text-gray-500">
            歡迎回來，管理員。這是您今天的財務健康概況。
          </Text>
        </div>
        <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
          <div className="flex flex-wrap justify-end gap-2 items-center">
            <Radio.Group
              value={rangeMode}
              onChange={(e) => {
                const nextMode = e.target.value as RangeMode;
                setRangeMode(nextMode);
                if (
                  nextMode === "custom" &&
                  (!customRange?.[0] || !customRange?.[1])
                ) {
                  message.info("請選擇自訂日期區間");
                }
              }}
              className="shadow-sm"
            >
              <Radio.Button value="today">今天</Radio.Button>
              <Radio.Button value="yesterday">昨天</Radio.Button>
              <Radio.Button value="last7d">最近 7 天</Radio.Button>
              <Radio.Button value="all">全部期間</Radio.Button>
              <Radio.Button value="custom">自訂</Radio.Button>
            </Radio.Group>

            <Button
              type="primary"
              icon={<SyncOutlined spin={syncing} />}
              loading={syncing}
              onClick={handleManualSync}
              className="bg-black hover:bg-gray-800 border-none shadow-sm"
            >
              {syncing ? "同步中..." : "即時同步"}
            </Button>
          </div>

          {rangeMode === "custom" && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full sm:w-auto"
            >
              <RangePicker
                value={customRange}
                onChange={handleCustomRangeChange}
                format="YYYY/MM/DD"
                allowClear
                className="w-full shadow-sm"
                placeholder={["開始日期", "結束日期"]}
              />
            </motion.div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            System Status: Operational
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {performanceBuckets.map((bucket, index) => {
            const status = getBucketStatus(bucket);
            const accent = getBucketAccent(index);

            return (
              <motion.div
                key={bucket.key}
                whileHover={{ y: -4 }}
                className="glass-card relative overflow-hidden p-6 transition-all duration-300"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.split(" ")[0]} ${accent.split(" ")[1]}`}
                />
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      {bucket.label}
                    </div>
                    {"account" in bucket && bucket.account ? (
                      <div className="mt-1 text-xs text-slate-400">
                        帳號：{bucket.account}
                      </div>
                    ) : null}
                  </div>
                  <Tag color={status.color} className="rounded-full px-3 py-1">
                    {status.label}
                  </Tag>
                </div>

                <Statistic
                  title={<span className="label-text font-medium">業績總額</span>}
                  value={bucket.gross}
                  precision={2}
                  prefix="$"
                  valueStyle={{
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    fontSize: "28px",
                  }}
                />

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/40 px-4 py-3">
                    <div className="text-xs text-slate-400">訂單數</div>
                    <div className="mt-1 font-semibold text-slate-800">
                      {bucket.orderCount}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/40 px-4 py-3">
                    <div className="text-xs text-slate-400">已入帳 / 收款</div>
                    <div className="mt-1 font-semibold text-slate-800">
                      {bucket.payoutNet.toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/40 px-4 py-3">
                    <div className="text-xs text-slate-400">手續費</div>
                    <div className="mt-1 font-semibold text-slate-800">
                      {bucket.feeTotal.toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/40 px-4 py-3">
                    <div className="text-xs text-slate-400">待撥 / 待對帳</div>
                    <div className="mt-1 font-semibold text-slate-800">
                      {bucket.pendingPayoutCount}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs leading-5 text-slate-500">
                  {status.helper}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden p-0"
        >
          <div className="border-b border-white/30 bg-[linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,41,59,0.75))] px-6 py-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
              Reconciliation Pulse
            </div>
            <div className="mt-2 text-2xl font-semibold">金流與入帳狀態</div>
            <div className="mt-2 text-sm leading-6 text-white/75">
              這裡會把訂單、收款、手續費、待撥款與已對帳的狀態壓成一個管理視圖，方便每天追追帳。
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-slate-900/5 px-5 py-4">
                <div className="text-xs text-slate-400">總訂單數</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {total?.orderCount || 0}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900/5 px-5 py-4">
                <div className="text-xs text-slate-400">已建立收款</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {total?.paymentCount || 0}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900/5 px-5 py-4">
                <div className="text-xs text-slate-400">已完成對帳</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-600">
                  {total?.reconciledCount || 0}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900/5 px-5 py-4">
                <div className="text-xs text-slate-400">待撥款 / 待對帳</div>
                <div className="mt-2 text-2xl font-semibold text-amber-600">
                  {total?.pendingPayoutCount || 0}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/30 bg-white/45 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    總業績 vs 已入帳
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    用來看業績已經進來多少、實際撥款與淨額又落到多少。
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">總業績</div>
                  <div className="text-xl font-semibold text-slate-900">
                    ${total?.gross.toFixed(2) || "0.00"}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>已入帳淨額</span>
                    <span>${total?.payoutNet.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200/70">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${
                          total?.gross
                            ? Math.min((total.payoutNet / total.gross) * 100, 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>手續費</span>
                    <span>${total?.feeTotal.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200/70">
                    <div
                      className="h-2 rounded-full bg-fuchsia-500 transition-all"
                      style={{
                        width: `${
                          total?.gross
                            ? Math.min((total.feeTotal / total.gross) * 100, 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Financial Health Widget */}
      <div className="animate-slide-up" style={{ animationDelay: "400ms" }}>
        <FinancialHealthWidget />
      </div>

      {/* Recent Activity & Tasks */}
      <Row
        gutter={[
          { xs: 16, sm: 24 },
          { xs: 16, sm: 24 },
        ]}
      >
        <Col xs={24} lg={12}>
          <div
            className="h-full animate-slide-up"
            style={{ animationDelay: "500ms" }}
          >
            <Card
              title="近期活動 (Recent Activity)"
              className="glass-card !border-0 h-full"
            >
              <Timeline
                items={[
                  {
                    color: "green",
                    children: (
                      <div className="pb-4">
                        <div className="font-medium">
                          收到來自 Tech Solutions 的款項
                        </div>
                        <div className="text-xs text-gray-400">
                          2025-11-21 10:30 AM • NT$ 150,000
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: "blue",
                    children: (
                      <div className="pb-4">
                        <div className="font-medium">開立發票 #INV-2025089</div>
                        <div className="text-xs text-gray-400">
                          2025-11-21 09:15 AM • 給 Global Trade Co.
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: "red",
                    children: (
                      <div className="pb-4">
                        <div className="font-medium">
                          庫存警示：MacBook Pro M3
                        </div>
                        <div className="text-xs text-gray-400">
                          2025-11-20 16:45 PM • 庫存低於安全水位
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: "gray",
                    children: (
                      <div className="pb-4">
                        <div className="font-medium">系統自動備份完成</div>
                        <div className="text-xs text-gray-400">
                          2025-11-20 03:00 AM
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div
            className="h-full animate-slide-up"
            style={{ animationDelay: "600ms" }}
          >
            <Card
              title="待辦事項 (Pending Tasks)"
              className="glass-card !border-0 h-full"
            >
              <div className="space-y-4">
                {[
                  {
                    title: "審核 11 月份行銷費用報銷",
                    user: "Alice",
                    time: "2h ago",
                    tag: "Approval",
                  },
                  {
                    title: "確認 Q4 財務預測報告",
                    user: "Bob",
                    time: "4h ago",
                    tag: "Review",
                  },
                  {
                    title: "更新供應商合約條款",
                    user: "Charlie",
                    time: "1d ago",
                    tag: "Legal",
                  },
                ].map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{
                          backgroundColor:
                            idx === 0
                              ? "#f56a00"
                              : idx === 1
                                ? "#7265e6"
                                : "#ffbf00",
                        }}
                      >
                        {task.user.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          {task.title}
                        </div>
                        <div className="text-xs text-gray-400">
                          {task.user} • {task.time}
                        </div>
                      </div>
                    </div>
                    <Tag>{task.tag}</Tag>
                  </div>
                ))}
                <Button type="dashed" block className="mt-4">
                  查看更多待辦
                </Button>
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;

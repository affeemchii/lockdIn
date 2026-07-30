import { useState, useEffect } from "react";
import { api } from "../api";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalPrice: number;
  totalReceived: number;
  remainingBalance: number;
  currencyCode: string;
  balanceCollected: boolean;
};

type DailyData = {
  date: string;
  collected: number;
  outstanding: number;
  orders: number;
  aov: number;
};

const SHOPIFY_BLUE = "#458FFF";
const COLLECTED_COLOR = "#202223";
const OUTSTANDING_COLOR = "#ff4d0066";

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDepositOrders();
      const pending: Order[] = (result as any).orders || [];
      const collected: Order[] = (result as any).collectedOrders || [];
      setOrders([...pending, ...collected]);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  function fmt(amount: number, currency = "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency,
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount);
  }

  function fmtShort(amount: number) {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  }

  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - range);
  const prevStart = new Date(rangeStart);
  prevStart.setDate(prevStart.getDate() - range);

  const filtered = orders.filter((o: Order) => new Date(o.createdAt) >= rangeStart);
  const prev = orders.filter((o: Order) => new Date(o.createdAt) >= prevStart && new Date(o.createdAt) < rangeStart);
  const currency = orders[0]?.currencyCode || "USD";

  const totalSales = filtered.reduce((s: number, o: Order) => s + o.totalPrice, 0);
  const totalCollected = filtered.reduce((s: number, o: Order) => s + o.totalReceived, 0);
  const totalOutstanding = filtered.reduce((s: number, o: Order) => s + o.remainingBalance, 0);
  const totalOrders = filtered.length;
  const aov = totalOrders > 0 ? totalSales / totalOrders : 0;

  const prevSales = prev.reduce((s: number, o: Order) => s + o.totalPrice, 0);
  const prevOrders = prev.length;
  const prevAov = prevOrders > 0 ? prevSales / prevOrders : 0;

  function pctChange(curr: number, p: number) {
    if (p === 0) return null;
    return ((curr - p) / p) * 100;
  }

  const salesChange = pctChange(totalSales, prevSales);
  const ordersChange = pctChange(totalOrders, prevOrders);
  const aovChange = pctChange(aov, prevAov);

  function PctBadge({ change }: { change: number | null }) {
    if (change === null) return null;
    const up = change >= 0;
    return (
      <span style={{ fontSize: "12px", color: up ? "#1a7f37" : "#d82c0d", fontWeight: "600" }}>
        {up ? "↑" : "↓"}{Math.abs(change).toFixed(1)}%
      </span>
    );
  }

  // Build daily data
  const dailyMap: Record<string, DailyData> = {};
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyMap[key] = { date: key, collected: 0, outstanding: 0, orders: 0, aov: 0 };
  }
  filtered.forEach((o: Order) => {
    const key = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (dailyMap[key]) {
      dailyMap[key].collected += o.totalReceived;
      dailyMap[key].outstanding += o.remainingBalance;
      dailyMap[key].orders += 1;
    }
  });
  Object.values(dailyMap).forEach(d => {
    d.aov = d.orders > 0 ? (d.collected + d.outstanding) / d.orders : 0;
  });
  const dailyData = Object.values(dailyMap);

  // Sparkline data for metric cards
  const salesSparkData = dailyData.map(d => ({ v: d.collected + d.outstanding }));
  const ordersSparkData = dailyData.map(d => ({ v: d.orders }));
  const aovSparkData = dailyData.map(d => ({ v: d.aov }));
  const collectedSparkData = dailyData.map(d => ({ v: d.collected }));
  const outstandingSparkData = dailyData.map(d => ({ v: d.outstanding }));

  // Donut
  const donutR = 56;
  const donutCirc = 2 * Math.PI * donutR;
  const collectedPct = totalSales > 0 ? totalCollected / totalSales : 0;

  const compareLabel = `${prevStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${rangeStart.getFullYear()}`;

  function Sparkline({ data, color }: { data: { v: number }[], color: string }) {
    return (
      <ResponsiveContainer width={120} height={40}>
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (loading) return (
    <s-page heading="Analytics">
      <div style={{ padding: "60px", textAlign: "center", color: "#6d7175", fontSize: "13px" }}>Loading analytics...</div>
    </s-page>
  );

  return (
    <s-page heading="Analytics">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {error && <s-banner tone="critical">{error}</s-banner>}

        {/* Range selector + compare label */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "#6d7175" }}>
              Compared to: {compareLabel}
            </span>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {([7, 14, 30] as const).map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: "6px 14px", fontSize: "12px",
                fontWeight: range === r ? "600" : "400",
                color: range === r ? "#ffffff" : "#6d7175",
                backgroundColor: range === r ? "#202223" : "#ffffff",
                border: "1px solid #e1e3e5", borderRadius: "6px", cursor: "pointer",
              }}>
                Last {r} days
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 metric cards with sparklines */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Total lockdIn Sales", value: fmt(totalSales, currency), change: salesChange, spark: salesSparkData },
            { label: "Total lockdIn Orders", value: String(totalOrders), change: ordersChange, spark: ordersSparkData },
            { label: "lockdIn AOV", value: fmt(aov, currency), change: aovChange, spark: aovSparkData },
          ].map((m, i) => (
            <div key={i} style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "20px" }}>
              <p style={{ fontSize: "13px", color: "#6d7175", margin: "0 0 12px 0" }}>{m.label}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <p style={{ fontSize: "24px", fontWeight: "700", color: "#202223", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>{m.value}</p>
                  <PctBadge change={m.change} />
                </div>
                <Sparkline data={m.spark} color={SHOPIFY_BLUE} />
              </div>
            </div>
          ))}
        </div>

        {/* Middle row — donut + two stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

          {/* Donut card */}
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "20px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#202223", margin: "0 0 16px 0" }}>Total lockdIn sales</p>
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <svg viewBox="-70 -70 140 140" style={{ width: "130px", height: "130px", flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
                <circle cx="0" cy="0" r={donutR} fill="none" stroke="#e1e3e5" strokeWidth="12" />
                {totalSales > 0 && (
                  <>
                    <circle cx="0" cy="0" r={donutR} fill="none" stroke="#202223" strokeWidth="12"
                      strokeDasharray={`${collectedPct * donutCirc} ${(1 - collectedPct) * donutCirc}`}
                      strokeDashoffset={donutCirc / 4}
                      strokeLinecap="round"
                    />
                    {totalOutstanding > 0 && (
                      <circle cx="0" cy="0" r={donutR} fill="none" stroke="#d1d5db" strokeWidth="12"
                        strokeDasharray={`${(1 - collectedPct) * donutCirc} ${collectedPct * donutCirc}`}
                        strokeDashoffset={donutCirc / 4 - collectedPct * donutCirc}
                        strokeLinecap="round"
                      />
                    )}
                  </>
                )}
                <text x="0" y="-5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#202223">
                  {totalSales >= 1000 ? `$${(totalSales / 1000).toFixed(1)}K` : fmt(totalSales, currency)}
                </text>
                <text x="0" y="10" textAnchor="middle" fontSize="9" fill="#6d7175">total</text>
              </svg>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#202223", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "11px", color: "#6d7175", margin: "0 0 2px 0" }}>Collected {fmt(totalCollected, currency)}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#d1d5db", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "11px", color: "#6d7175", margin: "0 0 2px 0" }}>Outstanding {fmt(totalOutstanding, currency)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two stat cards stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "20px", flex: 1 }}>
              <p style={{ fontSize: "12px", color: "#6d7175", margin: "0 0 8px 0" }}>Total collected payments</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <p style={{ fontSize: "22px", fontWeight: "700", color: "#202223", margin: 0, letterSpacing: "-0.5px" }}>{fmt(totalCollected, currency)}</p>
                <Sparkline data={collectedSparkData} color={SHOPIFY_BLUE} />
              </div>
            </div>
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "20px", flex: 1 }}>
              <p style={{ fontSize: "12px", color: "#6d7175", margin: "0 0 8px 0" }}>Total outstanding payments</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <p style={{ fontSize: "22px", fontWeight: "700", color: "#202223", margin: 0, letterSpacing: "-0.5px" }}>{fmt(totalOutstanding, currency)}</p>
                <Sparkline data={outstandingSparkData} color={SHOPIFY_BLUE} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom two bar charts side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

          {/* Outstanding and Collected bar chart */}
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "20px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#202223", margin: "0 0 4px 0" }}>Outstanding and Collected Amount</p>
            <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#d1d5db" }} />
                <span style={{ fontSize: "11px", color: "#6d7175" }}>Total Outstanding</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#202223" }} />
                <span style={{ fontSize: "11px", color: "#6d7175" }}>Total Collected</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f2f3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8c9196" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: "#8c9196" }} axisLine={false} tickLine={false} width={45} />
                <Tooltip formatter={(value: any) => fmt(Number(value), currency)} contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
                <Bar dataKey="collected" stackId="a" fill="#202223" radius={[0, 0, 0, 0]} name="Collected" />
                <Bar dataKey="outstanding" stackId="a" fill="#d1d5db" radius={[2, 2, 0, 0]} name="Outstanding" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AOV bar chart */}
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "20px" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#202223", margin: "0 0 20px 0" }}>Average Order Value</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f2f3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8c9196" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: "#8c9196" }} axisLine={false} tickLine={false} width={45} />
                <Tooltip formatter={(value: any) => fmt(Number(value), currency)} contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
                <Bar dataKey="aov" fill="#202223" radius={[2, 2, 0, 0]} name="AOV" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders per day — full width */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "10px", padding: "20px" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#202223", margin: "0 0 20px 0" }}>Number of lockdIn orders</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f2f3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8c9196" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8c9196" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "6px" }} />
              <Bar dataKey="orders" fill="#202223" radius={[2, 2, 0, 0]} name="Orders">
                {dailyData.map((_, i) => (
                  <Cell key={i} fill="#202223" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </s-page>
  );
}
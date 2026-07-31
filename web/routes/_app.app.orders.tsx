import { useState, useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { api } from "../api";

// React Router v7 requires a loader export for SSR routes.
// All actual data fetching happens client-side via useEffect.
export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  numericId: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  tags: string[];
};

type Tab = "all" | "pending" | "collected";

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ status, type }: { status: string; type: "payment" | "fulfillment" }) {
  const s = status?.toLowerCase() ?? "";

  let bg = "#f6f6f7";
  let color = "#6d7175";
  let label = status ?? "—";

  if (type === "payment") {
    if (s === "partially_paid" || s === "partially paid") {
      bg = "#fff3cd"; color = "#b7791f"; label = "Partially paid";
    } else if (s === "paid") {
      bg = "#d4edda"; color = "#1a7f37"; label = "Paid";
    } else if (s === "pending") {
      bg = "#fff3cd"; color = "#b7791f"; label = "Pending";
    } else if (s === "refunded") {
      bg = "#f6f6f7"; color = "#6d7175"; label = "Refunded";
    }
  }

  if (type === "fulfillment") {
    if (s === "fulfilled") {
      bg = "#d4edda"; color = "#1a7f37"; label = "Fulfilled";
    } else if (s === "unfulfilled") {
      bg = "#f6f6f7"; color = "#6d7175"; label = "Unfulfilled";
    } else if (s === "partial") {
      bg = "#fff3cd"; color = "#b7791f"; label = "Partial";
    }
  }

  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
      backgroundColor: bg,
      color,
    }}>
      {label}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatMoney(amount: string, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency,
  }).format(Number(amount));
}

function isCollected(order: Order) {
  return order.tags?.includes("lockdin-balance-collected");
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [collecting, setCollecting] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await api.getDepositOrders();
      const all = [...(result.pendingOrders ?? []), ...(result.collectedOrders ?? [])];
      setOrders(all);
    } catch (err: any) {
      setErrorMessage("Failed to load orders. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "pending") return !isCollected(o);
    if (activeTab === "collected") return isCollected(o);
    return true;
  });

  const pendingCount = orders.filter((o) => !isCollected(o)).length;
  const collectedCount = orders.filter((o) => isCollected(o)).length;

  async function handleMarkCollected(orderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCollecting(orderId);
    try {
      console.log("orderId received:", orderId); await api.markBalanceCollected({ orderId: orderId.replace("gid://shopify/Order/", "") });
      await loadOrders();
      if (expandedRow === orderId) setExpandedRow(null);
    } catch (err: any) {
      setErrorMessage("Failed to mark order as collected: " + err.message);
    } finally {
      setCollecting(null);
    }
  }

  function toggleRow(orderId: string) {
    setExpandedRow((prev) => (prev === orderId ? null : orderId));
  }

  function openInShopify(order: Order, e: React.MouseEvent) {
    e.stopPropagation();
    window.open(
      `https://admin.shopify.com/store/affans-testing/orders/${order.numericId}`,
      "_blank"
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <s-page>
      {/* Page header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "16px",
      }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#202223", letterSpacing: "-0.3px" }}>
            Orders
          </div>
          <div style={{ fontSize: "13px", color: "#6d7175", marginTop: "4px" }}>
            Deposit orders and COD balance collection status.
          </div>
        </div>
        <button
          onClick={loadOrders}
          style={{
            padding: "8px 16px",
            backgroundColor: "#ffffff",
            border: "1px solid #c9cccf",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            color: "#202223",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "#fff4f4",
          border: "1px solid #ffd2d2",
          borderRadius: "8px",
          color: "#d82c0d",
          fontSize: "13px",
          marginBottom: "16px",
        }}>
          {errorMessage}
        </div>
      )}

      {/* Main card */}
      <div style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e1e3e5",
        borderRadius: "12px",
        overflow: "hidden",
      }}>

        {/* Tab bar */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #e1e3e5",
          padding: "0 16px",
          gap: "4px",
        }}>
          {(["all", "pending", "collected"] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = {
              all: `All orders (${orders.length})`,
              pending: `Pending COD (${pendingCount})`,
              collected: `Collected (${collectedCount})`,
            };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 16px",
                  fontSize: "13px",
                  fontWeight: isActive ? "600" : "400",
                  color: isActive ? "#202223" : "#6d7175",
                  border: "none",
                  borderBottom: isActive ? "2px solid #202223" : "2px solid transparent",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  marginBottom: "-1px",
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#6d7175", fontSize: "13px" }}>
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#6d7175", fontSize: "13px" }}>
            No orders found.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#fafafa" }}>
                {["Order", "Date", "Customer", "Payment", "Fulfillment", "Total", "Action"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6d7175",
                    borderBottom: "1px solid #e1e3e5",
                    whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const collected = isCollected(order);
                const isExpanded = expandedRow === order.id;
                const isMarkingThis = collecting === order.id;
                const money = formatMoney(
                  order.totalPriceSet?.shopMoney?.amount ?? "0",
                  order.totalPriceSet?.shopMoney?.currencyCode ?? "USD"
                );

                return (
                  <>
                    {/* Main row */}
                    <tr
                      key={order.id}
                      onClick={() => toggleRow(order.id)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isExpanded ? "#f6f6f7" : "transparent",
                        borderBottom: isExpanded ? "none" : "1px solid #f1f2f3",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#fafafa";
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
                      }}
                    >
                      {/* Order number */}
                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: "600", color: "#202223" }}>
                        {order.name}
                      </td>

                      {/* Date */}
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "#6d7175", whiteSpace: "nowrap" }}>
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Customer — showing numeric order ID until Protected Customer Data is approved */}
                      <td style={{ padding: "14px 16px", fontSize: "11px", color: "#6d7175", fontFamily: "monospace" }}>
                        {order.numericId}
                      </td>

                      {/* Payment badge */}
                      <td style={{ padding: "14px 16px" }}>
                        <Badge status={order.displayFinancialStatus} type="payment" />
                      </td>

                      {/* Fulfillment badge */}
                      <td style={{ padding: "14px 16px" }}>
                        <Badge status={order.displayFulfillmentStatus} type="fulfillment" />
                      </td>

                      {/* Total */}
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "#202223", fontWeight: "500", whiteSpace: "nowrap" }}>
                        {money}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "14px 16px" }} onClick={(e) => e.stopPropagation()}>
                        {collected ? (
                          <span style={{ fontSize: "12px", color: "#1a7f37", fontWeight: "600" }}>
                            ✓ Collected
                          </span>
                        ) : (
                          <button
                            onClick={(e) => handleMarkCollected(order.id, e)}
                            disabled={isMarkingThis}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: isMarkingThis ? "#e1e3e5" : "#202223",
                              color: isMarkingThis ? "#6d7175" : "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: isMarkingThis ? "not-allowed" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isMarkingThis ? "Saving..." : "Mark collected"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <tr key={`${order.id}-detail`} style={{ backgroundColor: "#f6f6f7", borderBottom: "1px solid #e1e3e5" }}>
                        <td colSpan={7} style={{ padding: "0 16px 16px 16px" }}>
                          <div style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e1e3e5",
                            borderRadius: "8px",
                            padding: "16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "24px",
                          }}>

                            {/* Left: order details grid */}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "12px", fontWeight: "700", color: "#202223", marginBottom: "10px" }}>
                                Order details
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                                <div>
                                  <div style={{ fontSize: "11px", color: "#6d7175", marginBottom: "2px" }}>Order ID</div>
                                  <div style={{ fontSize: "12px", color: "#202223", fontFamily: "monospace" }}>{order.numericId}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "11px", color: "#6d7175", marginBottom: "2px" }}>Order name</div>
                                  <div style={{ fontSize: "12px", color: "#202223", fontWeight: "600" }}>{order.name}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "11px", color: "#6d7175", marginBottom: "2px" }}>Created</div>
                                  <div style={{ fontSize: "12px", color: "#202223" }}>{formatDate(order.createdAt)}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "11px", color: "#6d7175", marginBottom: "2px" }}>Total</div>
                                  <div style={{ fontSize: "12px", color: "#202223", fontWeight: "600" }}>{money}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "11px", color: "#6d7175", marginBottom: "2px" }}>Payment</div>
                                  <div><Badge status={order.displayFinancialStatus} type="payment" /></div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "11px", color: "#6d7175", marginBottom: "2px" }}>Fulfillment</div>
                                  <div><Badge status={order.displayFulfillmentStatus} type="fulfillment" /></div>
                                </div>
                              </div>

                              {/* Tags */}
                              {order.tags?.length > 0 && (
                                <div style={{ marginTop: "12px" }}>
                                  <div style={{ fontSize: "11px", color: "#6d7175", marginBottom: "4px" }}>Tags</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                    {order.tags.map((tag) => (
                                      <span key={tag} style={{
                                        padding: "2px 8px",
                                        backgroundColor: "#f6f6f7",
                                        border: "1px solid #e1e3e5",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        color: "#202223",
                                      }}>
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right: action buttons */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
                              <button
                                onClick={(e) => openInShopify(order, e)}
                                style={{
                                  padding: "8px 16px",
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #c9cccf",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  color: "#202223",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                View in Shopify ↗
                              </button>
                              {!collected ? (
                                <button
                                  onClick={(e) => handleMarkCollected(order.id, e)}
                                  disabled={collecting === order.id}
                                  style={{
                                    padding: "8px 16px",
                                    backgroundColor: collecting === order.id ? "#e1e3e5" : "#202223",
                                    color: collecting === order.id ? "#6d7175" : "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: collecting === order.id ? "not-allowed" : "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {collecting === order.id ? "Saving..." : "Mark collected"}
                                </button>
                              ) : (
                                <span style={{ fontSize: "12px", color: "#1a7f37", fontWeight: "600", textAlign: "center" }}>
                                  ✓ Balance collected
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </s-page>
  );
}
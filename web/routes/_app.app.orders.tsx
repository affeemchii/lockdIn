import { useState, useEffect } from "react";
import { api } from "../api";
import { useBilling } from "../hooks/useBilling";
import { UpgradeModal } from "../components/UpgradeModal";

type Order = {
  id: string;
  gadgetId: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  financialStatus: string;
  totalPrice: number;
  totalReceived: number;
  remainingBalance: number;
  currencyCode: string;
  balanceCollected: boolean;
  tags: string[];
  productTitle: string;
  sellingPlanName: string;
  hasSellingPlan: boolean;
  shopifyAdminUrl: string;
};

export default function OrdersPage() {
  const { billing, startUpgrade } = useBilling();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "collected">("pending");
  const [orders, setOrders] = useState<Order[]>([]);
  const [collectedOrders, setCollectedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDepositOrders();
      setOrders((result as any).orders || []);
      setCollectedOrders((result as any).collectedOrders || []);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkCollected(order: Order) {
    setCollectingId(order.id);
    try {
      await api.markBalanceCollected({
        orderId: order.gadgetId,
        orderTags: JSON.stringify(order.tags),
        remainingBalance: order.remainingBalance,
        currencyCode: order.currencyCode,
      });
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || "Failed to mark balance as collected");
    } finally {
      setCollectingId(null);
    }
  }

  function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const currentOrders = activeTab === "pending" ? orders : collectedOrders;

  return (
    <s-page heading="Deposit Orders">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="You've reached your monthly order limit"
        message="You've used all 25 deposit orders on the free plan this month. Upgrade to Pro for unlimited orders."
        limitType="orders"
        billing={billing}
        startUpgrade={startUpgrade}
      />

      {/* Tab bar */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid #e1e3e5",
        marginBottom: "20px",
      }}>
        <button
          onClick={() => setActiveTab("pending")}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: activeTab === "pending" ? "600" : "400",
            color: activeTab === "pending" ? "#202223" : "#6d7175",
            background: "none",
            border: "none",
            borderBottom: activeTab === "pending" ? "2px solid #202223" : "2px solid transparent",
            cursor: "pointer",
            marginBottom: "-1px",
          }}
        >
          {"Pending COD "}
          <span style={{
            marginLeft: "6px",
            padding: "2px 8px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            backgroundColor: orders.length > 0 ? "#fff4e5" : "#f1f2f3",
            color: orders.length > 0 ? "#916a00" : "#6d7175",
          }}>
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("collected")}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: activeTab === "collected" ? "600" : "400",
            color: activeTab === "collected" ? "#202223" : "#6d7175",
            background: "none",
            border: "none",
            borderBottom: activeTab === "collected" ? "2px solid #202223" : "2px solid transparent",
            cursor: "pointer",
            marginBottom: "-1px",
          }}
        >
          {"Collected "}
          <span style={{
            marginLeft: "6px",
            padding: "2px 8px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            backgroundColor: collectedOrders.length > 0 ? "#f0fdf4" : "#f1f2f3",
            color: collectedOrders.length > 0 ? "#1a7f37" : "#6d7175",
          }}>
            {collectedOrders.length}
          </span>
        </button>
      </div>

      {/* Subtitle */}
      <div style={{ marginBottom: "16px", fontSize: "14px", color: "#6d7175" }}>
        {activeTab === "pending"
          ? "Orders where customers paid a deposit. Mark balance as collected after receiving COD payment."
          : "Orders where COD balance has been collected and marked as fully paid."
        }
      </div>

      {/* Order limit warning banner */}
      {!billing?.isPro && billing && billing.monthlyOrderCount >= billing.FREE_ORDER_LIMIT * 0.8 && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: billing.isOrderLimitHit ? "#fff4f4" : "#fff4e5",
          border: `1px solid ${billing.isOrderLimitHit ? "#d82c0d" : "#ffc453"}`,
          borderRadius: "8px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: "13px", color: billing.isOrderLimitHit ? "#d82c0d" : "#916a00" }}>
            {billing.isOrderLimitHit
              ? `You have reached your limit of ${billing.FREE_ORDER_LIMIT} deposit orders this month.`
              : `You have used ${billing.monthlyOrderCount} of ${billing.FREE_ORDER_LIMIT} free deposit orders this month.`
            }
          </span>
          <button
            onClick={() => setShowUpgradeModal(true)}
            style={{
              padding: "6px 12px",
              backgroundColor: "#202223",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginLeft: "12px",
            }}
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <s-banner tone="critical" style={{ marginBottom: "16px" }}>
          {error}
        </s-banner>
      )}

      {/* Loading state */}
      {loading && (
        <s-card>
          <div style={{ padding: "40px", textAlign: "center", color: "#6d7175" }}>
            Loading orders...
          </div>
        </s-card>
      )}

      {/* Empty state */}
      {!loading && currentOrders.length === 0 && (
        <s-card>
          <div style={{ padding: "60px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>
              {activeTab === "pending" ? "📦" : "✅"}
            </div>
            <div style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#202223",
              marginBottom: "8px",
            }}>
              {activeTab === "pending" ? "No pending COD orders" : "No collected orders yet"}
            </div>
            <div style={{ fontSize: "14px", color: "#6d7175" }}>
              {activeTab === "pending"
                ? "When customers place deposit orders, they will appear here for COD collection."
                : "Orders you have marked as collected will appear here."
              }
            </div>
          </div>
        </s-card>
      )}

      {/* Orders table */}
      {!loading && currentOrders.length > 0 && (
        <s-card>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "0.8fr 1.5fr 1fr 1fr 1fr 1.5fr 1fr",
            gap: "12px",
            padding: "12px 16px",
            borderBottom: "1px solid #e1e3e5",
            fontSize: "12px",
            fontWeight: "600",
            color: "#6d7175",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            <div>Order</div>
            <div>Customer</div>
            <div>Date</div>
            <div>{activeTab === "pending" ? "Deposit Paid" : "Total Paid"}</div>
            <div>{activeTab === "pending" ? "Balance Due" : "Order Total"}</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          {/* Order rows */}
          {currentOrders.map((order) => (
            <div
              key={order.id}
              style={{
                display: "grid",
                gridTemplateColumns: "0.8fr 1.5fr 1fr 1fr 1fr 1.5fr 1fr",
                gap: "12px",
                padding: "16px",
                borderBottom: "1px solid #f1f2f3",
                alignItems: "center",
                fontSize: "14px",
              }}
            >
              <div style={{ fontWeight: "600", color: "#202223" }}>
                {order.orderNumber}
              </div>

              <div>
                <div style={{ fontWeight: "500", color: "#202223" }}>
                  {order.customerName}
                </div>
                <div style={{ fontSize: "12px", color: "#6d7175" }}>
                  {order.customerEmail}
                </div>
              </div>

              <div style={{ color: "#6d7175" }}>
                {formatDate(order.createdAt)}
              </div>

              <div style={{ fontWeight: "600", color: "#1a7f37" }}>
                {formatMoney(order.totalReceived, order.currencyCode)}
              </div>

              <div style={{
                fontWeight: "600",
                color: activeTab === "collected" ? "#6d7175" : "#b54708",
              }}>
                {activeTab === "collected"
                  ? formatMoney(order.totalPrice, order.currencyCode)
                  : formatMoney(order.remainingBalance, order.currencyCode)
                }
              </div>

              <div>
                {activeTab === "pending" ? (
                  <span style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600",
                    backgroundColor: "#fff8ec",
                    color: "#b54708",
                    border: "1px solid #ffc453",
                  }}>
                    COD Pending
                  </span>
                ) : (
                  <span style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600",
                    backgroundColor: "#f0fdf4",
                    color: "#1a7f37",
                    border: "1px solid #bbf7d0",
                  }}>
                    Collected
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {activeTab === "pending" && (
                  <button
                    onClick={() => handleMarkCollected(order)}
                    disabled={collectingId === order.id}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: collectingId === order.id ? "#e1e3e5" : "#202223",
                      color: collectingId === order.id ? "#6d7175" : "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: collectingId === order.id ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {collectingId === order.id ? "Saving..." : "Mark Collected"}
                  </button>
                )}
                {activeTab === "collected" && (
                  <span style={{ fontSize: "12px", color: "#1a7f37", fontWeight: "600" }}>
                    Done
                  </span>
                )}
                <a
                  href={order.shopifyAdminUrl}
                  target="_top"
                  style={{
                    fontSize: "12px",
                    color: "#6d7175",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  View in Shopify
                </a>
              </div>
            </div>
          ))}

          {/* Footer */}
          <div style={{
            padding: "12px 16px",
            borderTop: "1px solid #e1e3e5",
            fontSize: "13px",
            color: "#6d7175",
          }}>
            {activeTab === "pending"
              ? `${orders.length} pending order${orders.length !== 1 ? "s" : ""} · ${orders.length} awaiting COD collection`
              : `${collectedOrders.length} collected order${collectedOrders.length !== 1 ? "s" : ""}`
            }
          </div>
        </s-card>
      )}
    </s-page>
  );
}
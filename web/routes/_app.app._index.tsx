import { useState, useEffect } from "react";
import { api } from "../api";

export default function AppDashboardIndex() {
  const [purchaseOptions, setPurchaseOptions] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [aov, setAov] = useState(0);
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    fetchOptions();
    fetchMetrics();
  }, []);

  async function fetchOptions() {
    try {
      const result = await api.listSellingPlanGroups();
      setPurchaseOptions((result as any).plans || []);
    } catch (err) {
      console.error("Failed to fetch purchase options", err);
    } finally {
      setLoadingOptions(false);
    }
  }

  async function fetchMetrics() {
    try {
      const result = await api.getDepositOrders();
      const pending: any[] = (result as any).orders || [];
      const collected: any[] = (result as any).collectedOrders || [];
      const allOrders = [...pending, ...collected];

      const count = allOrders.length;
      const sales = allOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const avg = count > 0 ? sales / count : 0;
      const currency = allOrders[0]?.currencyCode || "USD";

      setTotalOrders(count);
      setTotalSales(sales);
      setAov(avg);
      setCurrencyCode(currency);
    } catch (err) {
      console.error("Failed to fetch metrics", err);
    } finally {
      setLoadingMetrics(false);
    }
  }

  const handleDelete = async (sellingPlanGroupId: string) => {
    if (!confirm("Are you sure you want to delete this purchase option? This cannot be undone.")) return;
    setDeletingId(sellingPlanGroupId);
    try {
      await api.deleteSellingPlanGroup({ sellingPlanGroupId });
      setPurchaseOptions(prev => prev.filter((p: any) => p.id !== sellingPlanGroupId));
    } catch (err) {
      console.error("Failed to delete", err);
      alert("Failed to delete purchase option. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  }

  return (
    <s-page heading="Dashboard">
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Metrics Bar */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1px",
            backgroundColor: "#e1e3e5",
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
            overflow: "hidden",
          }}>
            <div style={{ backgroundColor: "#ffffff", padding: "16px 20px" }}>
              <p style={{ fontSize: "12px", color: "#6d7175", marginBottom: "4px" }}>Total lockdIn Sales</p>
              <p style={{ fontSize: "22px", fontWeight: "700", color: "#202223" }}>
                {loadingMetrics ? "—" : formatMoney(totalSales, currencyCode)}
              </p>
              <p style={{ fontSize: "11px", color: "#8c9196", marginTop: "4px" }}>All time</p>
            </div>
            <div style={{ backgroundColor: "#ffffff", padding: "16px 20px" }}>
              <p style={{ fontSize: "12px", color: "#6d7175", marginBottom: "4px" }}>Total lockdIn Orders</p>
              <p style={{ fontSize: "22px", fontWeight: "700", color: "#202223" }}>
                {loadingMetrics ? "—" : totalOrders}
              </p>
              <p style={{ fontSize: "11px", color: "#8c9196", marginTop: "4px" }}>All time</p>
            </div>
            <div style={{ backgroundColor: "#ffffff", padding: "16px 20px" }}>
              <p style={{ fontSize: "12px", color: "#6d7175", marginBottom: "4px" }}>lockdIn AOV</p>
              <p style={{ fontSize: "22px", fontWeight: "700", color: "#202223" }}>
                {loadingMetrics ? "—" : formatMoney(aov, currencyCode)}
              </p>
              <p style={{ fontSize: "11px", color: "#8c9196", marginTop: "4px" }}>All time</p>
            </div>
          </div>

          {/* Theme Extension Badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            backgroundColor: "#ffffff",
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
          }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#202223" }}>Theme extension block</span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              backgroundColor: "#fdf3d1",
              color: "#916a00",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "4px",
              border: "1px solid #f5c842",
            }}>
              Inactive
            </span>
            <span style={{ fontSize: "13px", color: "#6d7175", flex: 1 }}>
              lockdIn theme extensions may not be enabled. Open the theme editor to ensure lockdIn is properly installed.
            </span>
            <a
              href="https://admin.shopify.com/themes/current/editor"
              target="_blank"
              style={{ fontSize: "13px", color: "#2c6ecb", textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Open theme editor
            </a>
          </div>

          {/* Purchase Options List */}
          {!loadingOptions && purchaseOptions.length > 0 && (
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e1e3e5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#202223", margin: 0 }}>Purchase options</h2>
                <s-link href="/app/create">
                  <button style={{
                    padding: "8px 16px",
                    backgroundColor: "#202223",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                  }}>
                    Create purchase option
                  </button>
                </s-link>
              </div>
              {purchaseOptions.map((option: any, index: number) => (
                <div
                  key={option.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: index < purchaseOptions.length - 1 ? "1px solid #e1e3e5" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "#202223", margin: 0 }}>{option.name}</p>
                    <p style={{ fontSize: "12px", color: "#6d7175", margin: 0 }}>
                      {option.depositType === "percentage"
                        ? `${option.depositValue}% deposit`
                        : `$${option.depositValue} deposit`}
                      {" · "}
                      {option.balanceDueTrigger === "FULFILLMENT"
                        ? "Due on fulfillment"
                        : option.balanceDueTrigger === "TIME_AFTER_CHECKOUT"
                          ? "Due after checkout"
                          : "Due on specific date"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#6d7175" }}>
                      {new Date(option.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDelete(option.id)}
                      disabled={deletingId === option.id}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "transparent",
                        color: "#d82c0d",
                        fontSize: "13px",
                        fontWeight: "500",
                        borderRadius: "6px",
                        border: "1px solid #d82c0d",
                        cursor: "pointer",
                        opacity: deletingId === option.id ? 0.5 : 1,
                      }}
                    >
                      {deletingId === option.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loadingOptions && purchaseOptions.length === 0 && (
            <div style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e3e5",
              borderRadius: "8px",
              padding: "60px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                marginBottom: "24px",
                backgroundColor: "#f6f6f7",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="12" y="28" width="40" height="28" rx="4" stroke="#8c9196" strokeWidth="2.5" fill="#f6f6f7" />
                  <path d="M22 28V20C22 14.477 26.477 10 32 10C37.523 10 42 14.477 42 20V28" stroke="#8c9196" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="32" cy="42" r="4" fill="#8c9196" />
                </svg>
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#202223", marginBottom: "8px" }}>
                Create your first purchase option
              </h2>
              <p style={{ fontSize: "14px", color: "#6d7175", maxWidth: "380px", lineHeight: "1.6", marginBottom: "20px" }}>
                Now that you have completed initial setup, create a purchase option and choose which products to offer with a deposit.
              </p>
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                backgroundColor: "#fff8e6",
                border: "1px solid #f5c842",
                borderRadius: "8px",
                padding: "12px 16px",
                maxWidth: "440px",
                width: "100%",
                marginBottom: "24px",
                textAlign: "left",
              }}>
                <span style={{ fontSize: "16px", marginTop: "1px" }}>{"⚠️"}</span>
                <p style={{ fontSize: "13px", color: "#4f5359", lineHeight: "1.5", margin: 0 }}>
                  If you are new to lockdIn, we recommend starting with a test product and running through the full buying experience before going live.
                </p>
              </div>
              <s-link href="/app/create">
                <button style={{
                  padding: "10px 20px",
                  backgroundColor: "#202223",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "600",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}>
                  Create a purchase option
                </button>
              </s-link>
            </div>
          )}

          {/* Loading State */}
          {loadingOptions && (
            <div style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e1e3e5",
              borderRadius: "8px",
              padding: "40px",
              textAlign: "center",
            }}>
              <p style={{ color: "#6d7175", fontSize: "14px" }}>Loading purchase options...</p>
            </div>
          )}

        </div>

        {/* Right Sidebar */}
        <div style={{ width: "260px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "8px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "16px" }}>{"❓"}</span>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#202223", margin: 0 }}>Help center</p>
            </div>
            <p style={{ fontSize: "13px", color: "#6d7175", marginBottom: "12px", lineHeight: "1.5" }}>
              Everything you need to get started with lockdIn.
            </p>
            <button style={{ fontSize: "13px", color: "#2c6ecb", backgroundColor: "transparent", border: "1px solid #c9cccf", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}>
              View help center
            </button>
          </div>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "8px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "16px" }}>{"✨"}</span>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#202223", margin: 0 }}>Explore features</p>
            </div>
            <p style={{ fontSize: "13px", color: "#6d7175", marginBottom: "12px", lineHeight: "1.5" }}>
              Get the most out of lockdIn with our advanced features guide.
            </p>
            <button style={{ fontSize: "13px", color: "#2c6ecb", backgroundColor: "transparent", border: "1px solid #c9cccf", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}>
              Explore features
            </button>
          </div>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e1e3e5", borderRadius: "8px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "16px" }}>{"📋"}</span>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#202223", margin: 0 }}>Change log</p>
            </div>
            <p style={{ fontSize: "13px", color: "#6d7175", marginBottom: "12px", lineHeight: "1.5" }}>
              Stay updated with our latest features and improvements.
            </p>
            <button style={{ fontSize: "13px", color: "#2c6ecb", backgroundColor: "transparent", border: "1px solid #c9cccf", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}>
              View change log
            </button>
          </div>
        </div>

      </div>
    </s-page>
  );
}
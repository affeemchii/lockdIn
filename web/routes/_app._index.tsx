import { useNavigate } from "react-router";

export default function Index() {
  const navigate = useNavigate();

  return (
    <s-page heading="Welcome to lockdIn!">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "40px" }}>

        <s-banner
          heading="Secure your Cash on Delivery (COD) orders by collecting automated upfront deposits at checkout."
          tone="info"
        />

        <s-card>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#202223", margin: 0 }}>
              Getting Started Checklist
            </h2>

            <s-stack gap="base">

              <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid #e1e3e5", paddingBottom: "16px", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#e1e3e5", color: "#202223", fontWeight: "600", fontSize: "13px", flexShrink: 0 }}>
                  1
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <s-text type="strong">Configure Deposit Settings</s-text>
                  <s-text color="subdued">Check out the instructions below to configure your store's upfront deposit settings.</s-text>
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid #e1e3e5", paddingBottom: "16px", alignItems: "center", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#e1e3e5", color: "#202223", fontWeight: "600", fontSize: "13px", flexShrink: 0 }}>
                  2
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <s-text type="strong">Enable Theme App Extension</s-text>
                  <s-text color="subdued">Enable the lockdIn widget in your Theme Editor so the deposit badge shows on your product page.</s-text>
                </div>
                <s-button
                  href="https://admin.shopify.com/themes/current/editor?context=apps"
                  target="_blank"
                  variant="secondary"
                >
                  Enable Theme App Extension
                </s-button>
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#e1e3e5", color: "#202223", fontWeight: "600", fontSize: "13px", flexShrink: 0 }}>
                  3
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <s-text type="strong">Create your First Rule</s-text>
                  <s-text color="subdued">Set up your first purchase option with custom deposit rules.</s-text>
                </div>
                <s-button onClick={() => navigate("/app/create")} variant="primary">
                  Create your First Rule
                </s-button>
              </div>

            </s-stack>
          </div>
        </s-card>

      </div>
    </s-page>
  );
}
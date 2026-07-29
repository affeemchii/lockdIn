export function NavMenu() {
  return (
    <>
      <s-app-nav>
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/orders">Orders</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
        <s-link href="/app/billing">Billing</s-link>
        <s-link href="/app/settings">Settings</s-link>
        <s-link href="/app/integrations">Integrations</s-link>
      </s-app-nav>
    </>
  );
}
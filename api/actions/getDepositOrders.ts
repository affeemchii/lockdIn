import { GetDepositOrdersGlobalActionContext } from "gadget-server";

export const params = {};

export const run = async ({ logger, connections }: GetDepositOrdersGlobalActionContext) => {
  // We query Shopify GraphQL directly instead of Gadget DB.
  // This works even without Protected Customer Data approval
  // because we are querying from the backend with the app's
  // access token — not from the storefront.
  const shopify = connections.shopify.current;

  if (!shopify) {
    throw new Error("Shopify connection not found");
  }

  try {
    const result = await shopify.graphql(`
      query getDepositOrders {
        orders(first: 250, query: "tag:lockdin-deposit") {
          edges {
            node {
              id
              name
              createdAt
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalOutstandingSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              tags
              note
              email
              customer {
                firstName
                lastName
                email
              }
            }
          }
        }
      }
    `);

    const orders = result.orders?.edges ?? [];

    logger.info({ totalFetched: orders.length }, "Fetched deposit orders from Shopify");

    // Format orders for the frontend
    const formattedOrders = orders.map(({ node: order }: any) => {
      const totalPrice = parseFloat(order.totalPriceSet?.shopMoney?.amount || "0");
      const totalOutstanding = parseFloat(order.totalOutstandingSet?.shopMoney?.amount || "0");
      const totalReceived = totalPrice - totalOutstanding;
      const currencyCode = order.totalPriceSet?.shopMoney?.currencyCode || "USD";

      const tags: string[] = order.tags || [];
      const balanceCollected = tags.includes("lockdin-balance-collected");

      const customerName = order.customer
        ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim()
        : "Guest";

      // Extract numeric ID from GID for markBalanceCollected action
      // gid://shopify/Order/123456 → 123456
      const numericId = order.id.replace("gid://shopify/Order/", "");

      return {
        id: numericId,
        gadgetId: numericId,
        orderNumber: order.name || "—",
        createdAt: order.createdAt,
        customerName,
        customerEmail: order.customer?.email || order.email || "",
        financialStatus: order.displayFinancialStatus || "",
        totalPrice,
        totalReceived: totalReceived > 0 ? totalReceived : 0,
        remainingBalance: totalOutstanding > 0 ? totalOutstanding : 0,
        currencyCode,
        balanceCollected,
        tags,
      };
    });

    return { orders: formattedOrders };

  } catch (err: any) {
    logger.error({ error: err.message }, "Error fetching deposit orders from Shopify");
    return { orders: [], error: err.message };
  }
};
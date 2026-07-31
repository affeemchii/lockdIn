import { GetDepositOrdersGlobalActionContext } from "gadget-server";

export const params = {};

export const run = async ({ logger, connections }: GetDepositOrdersGlobalActionContext) => {
  const shopify = connections.shopify.current;

  if (!shopify) {
    throw new Error("Shopify connection not found");
  }

  try {
    const [taggedResult, partialResult, collectedResult] = await Promise.all([

      shopify.graphql(`
        query getTaggedDepositOrders {
          orders(first: 250, query: "tag:lockdin-deposit") {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                displayFulfillmentStatus
                totalPriceSet { shopMoney { amount currencyCode } }
                totalReceivedSet { shopMoney { amount currencyCode } }
                totalOutstandingSet { shopMoney { amount currencyCode } }
                tags
              }
            }
          }
        }
      `),

      shopify.graphql(`
        query getPartialDepositOrders {
          orders(first: 250, query: "financial_status:partially_paid") {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                displayFulfillmentStatus
                totalPriceSet { shopMoney { amount currencyCode } }
                totalReceivedSet { shopMoney { amount currencyCode } }
                totalOutstandingSet { shopMoney { amount currencyCode } }
                tags
              }
            }
          }
        }
      `),

      shopify.graphql(`
        query getCollectedOrders {
          orders(first: 250, query: "tag:lockdin-balance-collected") {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                displayFulfillmentStatus
                totalPriceSet { shopMoney { amount currencyCode } }
                totalReceivedSet { shopMoney { amount currencyCode } }
                totalOutstandingSet { shopMoney { amount currencyCode } }
                tags
              }
            }
          }
        }
      `)
    ]);

    const domain = connections.shopify.currentShop?.domain || "";
    const storeHandle = domain.replace(".myshopify.com", "");

    function formatOrder(order: any) {
      const totalPrice = parseFloat(order.totalPriceSet?.shopMoney?.amount || "0");
      const totalReceived = parseFloat(order.totalReceivedSet?.shopMoney?.amount || "0");
      const totalOutstanding = parseFloat(order.totalOutstandingSet?.shopMoney?.amount || "0");
      const currencyCode = order.totalPriceSet?.shopMoney?.currencyCode || "USD";
      const tags: string[] = order.tags || [];
      const balanceCollected = tags.includes("lockdin-balance-collected");
      const numericId = order.id.replace("gid://shopify/Order/", "");

      return {
        id: order.id,
        numericId,
        name: order.name || "—",
        createdAt: order.createdAt,
        displayFinancialStatus: order.displayFinancialStatus || "",
        displayFulfillmentStatus: order.displayFulfillmentStatus || "",
        totalPriceSet: order.totalPriceSet,
        totalPrice,
        totalReceived,
        remainingBalance: totalOutstanding > 0 ? totalOutstanding : 0,
        currencyCode,
        balanceCollected,
        tags,
        shopifyAdminUrl: `https://admin.shopify.com/store/${storeHandle}/orders/${numericId}`
      };
    }

    const taggedEdges = taggedResult?.orders?.edges ?? [];
    const partialEdges = partialResult?.orders?.edges ?? [];
    const collectedEdges = collectedResult?.orders?.edges ?? [];

    const seenPending = new Set<string>();
    const pendingOrders: any[] = [];

    for (const edge of [...taggedEdges, ...partialEdges]) {
      const tags: string[] = edge.node.tags || [];
      if (!seenPending.has(edge.node.id) && !tags.includes("lockdin-balance-collected")) {
        seenPending.add(edge.node.id);
        pendingOrders.push(formatOrder(edge.node));
      }
    }

    const collectedOrders = collectedEdges.map(({ node }: any) => formatOrder(node));

    logger.info({ pending: pendingOrders.length, collected: collectedOrders.length }, "Fetched deposit orders from Shopify");

    return { pendingOrders, collectedOrders };

  } catch (err: any) {
    logger.warn({ error: err.message }, "Error fetching deposit orders from Shopify");
    return { pendingOrders: [], collectedOrders: [], error: err.message };
  }
};

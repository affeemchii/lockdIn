import { GetDepositOrdersGlobalActionContext } from "gadget-server";

export const params = {};

export const run = async ({ logger, connections }: GetDepositOrdersGlobalActionContext) => {
  const shopify = connections.shopify.current;

  if (!shopify) {
    throw new Error("Shopify connection not found");
  }

  try {
    const [taggedResult, partialResult, collectedResult] = await Promise.all([
      // Query 1: orders tagged lockdin-deposit
      shopify.graphql(`
        query getTaggedDepositOrders {
          orders(first: 250, query: "tag:lockdin-deposit") {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                totalPriceSet {
                  shopMoney { amount currencyCode }
                }
                totalReceivedSet {
                  shopMoney { amount currencyCode }
                }
                totalOutstandingSet {
                  shopMoney { amount currencyCode }
                }
                tags
                email
                customer {
                  firstName
                  lastName
                  email
                }
                lineItems(first: 5) {
                  edges {
                    node {
                      title
                      sellingPlan {
                        sellingPlanId
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `),
      // Query 2: PARTIALLY_PAID orders (active deposit orders)
      shopify.graphql(`
        query getPartialDepositOrders {
          orders(first: 250, query: "financial_status:partially_paid") {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                totalPriceSet {
                  shopMoney { amount currencyCode }
                }
                totalReceivedSet {
                  shopMoney { amount currencyCode }
                }
                totalOutstandingSet {
                  shopMoney { amount currencyCode }
                }
                tags
                email
                customer {
                  firstName
                  lastName
                  email
                }
                lineItems(first: 5) {
                  edges {
                    node {
                      title
                      sellingPlan {
                        sellingPlanId
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `),
      // Query 3: orders tagged lockdin-balance-collected (collected orders)
      shopify.graphql(`
        query getCollectedOrders {
          orders(first: 250, query: "tag:lockdin-balance-collected") {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                totalPriceSet {
                  shopMoney { amount currencyCode }
                }
                totalReceivedSet {
                  shopMoney { amount currencyCode }
                }
                totalOutstandingSet {
                  shopMoney { amount currencyCode }
                }
                tags
                email
                customer {
                  firstName
                  lastName
                  email
                }
                lineItems(first: 5) {
                  edges {
                    node {
                      title
                      sellingPlan {
                        sellingPlanId
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `)
    ]);

    const domain = connections.shopify.currentShop?.domain || "";
    const storeHandle = domain.replace(".myshopify.com", "");

    // Format a single order node into our frontend shape
    function formatOrder(order: any) {
      const totalPrice = parseFloat(order.totalPriceSet?.shopMoney?.amount || "0");
      const totalReceived = parseFloat(order.totalReceivedSet?.shopMoney?.amount || "0");
      const totalOutstanding = parseFloat(order.totalOutstandingSet?.shopMoney?.amount || "0");
      const currencyCode = order.totalPriceSet?.shopMoney?.currencyCode || "USD";
      const tags: string[] = order.tags || [];
      const balanceCollected = tags.includes("lockdin-balance-collected");
      const customerName = order.customer
        ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim()
        : "Guest";
      const numericId = order.id.replace("gid://shopify/Order/", "");
      const productTitle = order.lineItems?.edges?.[0]?.node?.title || "—";
      const sellingPlanName = order.lineItems?.edges
        ?.find((e: any) => e.node?.sellingPlan?.name)
        ?.node?.sellingPlan?.name || "Deposit";
      const hasSellingPlan = order.lineItems?.edges?.some(
        (e: any) => e.node?.sellingPlan?.name
      );

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
        productTitle,
        sellingPlanName,
        hasSellingPlan,
        shopifyAdminUrl: `https://admin.shopify.com/store/${storeHandle}/orders/${numericId}`
      };
    }

    // Merge tagged + partial into pending, deduplicate by ID
    const taggedOrders = taggedResult.orders?.edges ?? [];
    const partialOrders = partialResult.orders?.edges ?? [];
    const collectedOrders = collectedResult.orders?.edges ?? [];

    const seenPending = new Set<string>();
    const pendingOrders: any[] = [];

    for (const edge of [...taggedOrders, ...partialOrders]) {
      const tags: string[] = edge.node.tags || [];
      if (!seenPending.has(edge.node.id) && !tags.includes("lockdin-balance-collected")) {
        seenPending.add(edge.node.id);
        pendingOrders.push(formatOrder(edge.node));
      }
    }

    // Format collected orders
    const formattedCollected = collectedOrders.map(({ node }: any) =>
      formatOrder(node)
    );

    logger.info({
      pending: pendingOrders.length,
      collected: formattedCollected.length
    }, "Fetched deposit orders from Shopify");

    return {
      orders: pendingOrders,
      collectedOrders: formattedCollected
    };

  } catch (err: any) {
    logger.error({ error: err.message }, "Error fetching deposit orders from Shopify");
    return { orders: [], collectedOrders: [], error: err.message };
  }
};
import { GetSubscriptionStatusGlobalActionContext } from "gadget-server";

export const run = async ({ api, connections, logger }: GetSubscriptionStatusGlobalActionContext) => {
  const shopify = connections.shopify.current;

  if (!shopify) {
    throw new Error("No Shopify connection found.");
  }

  // Check active subscriptions from Shopify
  const result = await shopify.graphql(`
    query getAppSubscription {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          test
          lineItems {
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }
    }
  `);

  const activeSubscriptions =
    result.currentAppInstallation?.activeSubscriptions ?? [];

  const proSubscription = activeSubscriptions.find(
    (sub: any) =>
      sub.name === "lockdIn Pro" &&
      sub.status === "ACTIVE"
  );

  const isPro = !!proSubscription;

  // Get shop ID via connections
  const shopId = connections.shopify.currentShopId;

  // Count purchase options from Gadget DB
  let purchaseOptionCount = 0;
  if (shopId) {
    const rules = await api.depositRule.findMany({
      filter: {
        shop: { id: { equals: String(shopId) } }
      }
    });
    purchaseOptionCount = rules.length;
  }

  // Count deposit orders this month via Shopify GraphQL directly.
  // We use Shopify GraphQL instead of Gadget DB because the
  // shopifyOrder model may not be available until Protected
  // Customer Data is approved.
  let monthlyOrderCount = 0;

  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const ordersResult = await shopify.graphql(`
      query getDepositOrders($query: String!) {
        orders(first: 250, query: $query) {
          edges {
            node {
              id
              tags
            }
          }
        }
      }
    `, {
      query: `created_at:>=${firstOfMonth.toISOString()} tag:lockdin`
    });

    const orders = ordersResult.orders?.edges ?? [];
    monthlyOrderCount = orders.length;

  } catch (e) {
    logger.warn(
      { error: e },
      "Could not count orders from Shopify — Protected Customer Data may not be approved yet."
    );
    monthlyOrderCount = 0;
  }

  const FREE_ORDER_LIMIT = 25;
  const FREE_PURCHASE_OPTION_LIMIT = 3;

  const isOrderLimitHit = !isPro && monthlyOrderCount >= FREE_ORDER_LIMIT;
  const isPurchaseOptionLimitHit = !isPro && purchaseOptionCount >= FREE_PURCHASE_OPTION_LIMIT;

  return {
    isPro,
    plan: isPro ? "Pro" : "Free",
    subscription: proSubscription ?? null,
    monthlyOrderCount,
    purchaseOptionCount,
    FREE_ORDER_LIMIT,
    FREE_PURCHASE_OPTION_LIMIT,
    isOrderLimitHit,
    isPurchaseOptionLimitHit,
    canUseReminders: isPro
  };
};
import { GetActiveShopSubscriptionGlobalActionContext } from "gadget-server";

export const params = {
  shopId: { type: "string", required: true }
};

export const run = async ({ params, connections, logger }: GetActiveShopSubscriptionGlobalActionContext) => {
  const shopId = (params as any).shopId as string;

  if (!shopId) {
    throw new Error("shopId is required");
  }

  const shopify = await connections.shopify.forShopId(shopId);

  if (!shopify) {
    throw new Error(`No Shopify connection found for shop ${shopId}.`);
  }

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

  return {
    shopId,
    isPro: !!proSubscription,
    subscription: proSubscription ?? null,
    activeSubscriptions,
  };
};
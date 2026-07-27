import { CreateSubscriptionGlobalActionContext } from "gadget-server";

export const run = async ({ connections, logger }: CreateSubscriptionGlobalActionContext) => {
    const shopify = connections.shopify.current;

    if (!shopify) {
        throw new Error("No Shopify connection found. Is the app installed?");
    }

    const result = await shopify.graphql(`
    mutation appSubscriptionCreate(
      $name: String!
      $lineItems: [AppSubscriptionLineItemInput!]!
      $returnUrl: String!
      $test: Boolean
    ) {
      appSubscriptionCreate(
        name: $name
        lineItems: $lineItems
        returnUrl: $returnUrl
        test: $test
      ) {
        appSubscription {
          id
          status
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `, {
        name: "lockdIn Pro",
        lineItems: [{
            plan: {
                appRecurringPricingDetails: {
                    price: { amount: 14.99, currencyCode: "USD" },
                    interval: "EVERY_30_DAYS"
                }
            }
        }],
        returnUrl: `https://lockdin.gadget.app/billing/confirm`,
        test: false
    });

    const { appSubscriptionCreate } = result;

    if (appSubscriptionCreate.userErrors?.length > 0) {
        const errorMessages = appSubscriptionCreate.userErrors
            .map((e: any) => e.message)
            .join(", ");
        throw new Error(`Shopify billing error: ${errorMessages}`);
    }

    return {
        confirmationUrl: appSubscriptionCreate.confirmationUrl,
        subscriptionId: appSubscriptionCreate.appSubscription.id
    };
};


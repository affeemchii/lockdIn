import { CreateSubscriptionGlobalActionContext } from "gadget-server";

export const params = {
  chargeId: { type: "string", required: true }
};

export const run = async ({ params, connections, logger }: CreateSubscriptionGlobalActionContext) => {
  const shopify = connections.shopify.current;

  if (!shopify) {
    throw new Error("No Shopify connection found.");
  }

  const chargeId = (params as any).chargeId as string;

  if (!chargeId) {
    throw new Error("No charge ID provided. Cannot confirm subscription.");
  }

  logger.info({ chargeId }, "Confirming app subscription");

  const result = await shopify.graphql(`
    mutation appSubscriptionActivate($id: ID!) {
      appSubscriptionActivate(id: $id) {
        appSubscription {
          id
          status
          name
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    id: chargeId
  });

  const { appSubscriptionActivate } = result;

  if (appSubscriptionActivate.userErrors?.length > 0) {
    const errorMessages = appSubscriptionActivate.userErrors
      .map((e: any) => e.message)
      .join(", ");
    throw new Error(`Failed to activate subscription: ${errorMessages}`);
  }

  const subscription = appSubscriptionActivate.appSubscription;

  logger.info(
    { subscriptionId: subscription.id, status: subscription.status },
    "Subscription activated successfully"
  );

  return {
    success: true,
    subscriptionId: subscription.id,
    status: subscription.status,
    name: subscription.name
  };
};
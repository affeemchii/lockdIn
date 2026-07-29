import { CancelShopSubscriptionGlobalActionContext } from "gadget-server";

export const params = {
    shopId: { type: "string" },
};

export const run = async ({
    params,
    api,
    logger,
    connections,
}: CancelShopSubscriptionGlobalActionContext) => {
    const shopId = params.shopId || String(connections.shopify?.currentShopId);

    if (!shopId) {
        throw new Error("shopId is required or a current shopify session must exist");
    }

    const organizationId = process.env.SHOPIFY_ORGANIZATION_ID;
    const partnerApiToken = process.env.SHOPIFY_PARTNER_API_TOKEN;
    const appIdRaw =
        process.env.SHOPIFY_PARTNER_APP_ID ||
        process.env.GADGET_PUBLIC_SHOPIFY_APP_CLIENT_ID;

    if (!organizationId || !partnerApiToken || !appIdRaw) {
        throw new Error(
            "Missing Partner API configuration. Requires SHOPIFY_ORGANIZATION_ID and SHOPIFY_PARTNER_API_TOKEN."
        );
    }

    const appId = appIdRaw.startsWith("gid://")
        ? appIdRaw
        : `gid://shopify/App/${appIdRaw}`;

    const shop = await api.shopifyShop.findOne(shopId, {
        select: { id: true },
    });

    if (!shop) {
        throw new Error("Shop not found");
    }

    const shopGlobalId = `gid://shopify/Shop/${shop.id}`;

    const query = `
    mutation CancelSubscription(
      $appId: ID!
      $shopId: ID!
      $prorate: Boolean!
      $deferCancellation: Boolean!
      $skipFinalUsageCharge: Boolean!
    ) {
      appSubscriptionCancel(
        appId: $appId
        shopId: $shopId
        prorate: $prorate
        deferCancellation: $deferCancellation
        skipFinalUsageCharge: $skipFinalUsageCharge
      ) {
        appSubscription {
          __typename
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

    const url = `https://partners.shopify.com/${organizationId}/api/2026-07/graphql.json`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": partnerApiToken,
            },
            body: JSON.stringify({
                query,
                variables: {
                    appId,
                    shopId: shopGlobalId,
                    prorate: false,
                    deferCancellation: true,
                    skipFinalUsageCharge: true,
                },
            }),
        });

        const json = await response.json();

        if (json.errors) {
            logger.error(
                { errors: json.errors },
                "Error canceling subscription from Partner API"
            );
            throw new Error(json.errors[0]?.message || "GraphQL Error from Partner API");
        }

        const result = json.data.appSubscriptionCancel;

        if (result.userErrors && result.userErrors.length > 0) {
            const errorMsg = result.userErrors
                .map((e: any) => e.message)
                .join(", ");
            throw new Error(`Cancellation failed: ${errorMsg}`);
        }

        return result.appSubscription;
    } catch (error) {
        logger.error({ error }, "Failed to cancel subscription");
        throw error;
    }
};
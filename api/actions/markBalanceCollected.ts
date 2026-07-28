import { MarkBalanceCollectedGlobalActionContext } from "gadget-server";

export const params = {
  orderId: { type: "string" },   // Gadget numeric order ID
  orderTags: { type: "string" }, // JSON stringified current tags array
  remainingBalance: { type: "number" },
  currencyCode: { type: "string" },
};

export const run = async ({
  params,
  logger,
  connections,
}: MarkBalanceCollectedGlobalActionContext) => {
  const shopify = connections.shopify.current;
  if (!shopify) {
    throw new Error("Shopify connection not found");
  }

  const { orderId, orderTags, remainingBalance, currencyCode } = params as any;

  // Build the Shopify global order ID
  const shopifyOrderGid = `gid://shopify/Order/${orderId}`;

  // Step 1 — Parse existing tags and add our collected tag.
  // We keep all existing tags and append lockdin-balance-collected.
  // This is how we track collection status in Shopify without
  // overwriting any merchant tags.
  const existingTags: string[] = JSON.parse(orderTags || "[]");
  const newTags = [...existingTags, "lockdin-balance-collected"];

  // Build a note recording the collection for merchant records
  const collectionNote = `lockdIn: Remaining balance of ${currencyCode} ${remainingBalance} collected via Cash on Delivery on ${new Date().toLocaleDateString()}.`;

  // Step 2 — Update the order tags and note in Shopify.
  // We do this first so even if orderMarkAsPaid fails,
  // we have a record of the collection.
  const updateResult = await shopify.graphql(`
    mutation updateOrder($input: OrderInput!) {
      orderUpdate(input: $input) {
        order {
          id
          tags
          note
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    input: {
      id: shopifyOrderGid,
      tags: newTags,
      note: collectionNote,
    },
  });

  if (updateResult.orderUpdate.userErrors?.length > 0) {
    const errors = updateResult.orderUpdate.userErrors
      .map((e: any) => `${e.field}: ${e.message}`)
      .join(", ");
    throw new Error(`Shopify update errors: ${errors}`);
  }

  logger.info({ orderId }, "Order tags updated with balance collected");

  // Step 3 — Call orderMarkAsPaid to officially mark the order
  // as fully paid in Shopify.
  //
  // WHY: Without this, Shopify still shows the order as PARTIALLY_PAID
  // even though the merchant has collected the remaining COD balance.
  // This mutation creates a CAPTURE transaction for the outstanding
  // amount and sets financial status to PAID.
  //
  // NOTE: This mutation only works if:
  // - The order has a positive outstanding balance
  // - The order is not already PAID
  // If either condition fails, Shopify returns a userError — we log
  // it but do not throw, since the tag update already succeeded.
  const markPaidResult = await shopify.graphql(`
    mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
      orderMarkAsPaid(input: $input) {
        order {
          id
          displayFinancialStatus
          totalOutstandingSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    input: {
      id: shopifyOrderGid,
    },
  });

  const { orderMarkAsPaid } = markPaidResult;

  if (orderMarkAsPaid.userErrors?.length > 0) {
    // Log the error but do not throw.
    // The order is already tagged as collected — that is the source
    // of truth in lockdIn. If Shopify cannot mark it as paid
    // (e.g. already paid, or order cancelled), we just log it.
    const errors = orderMarkAsPaid.userErrors
      .map((e: any) => e.message)
      .join(", ");
    logger.warn(
      { orderId, errors },
      "orderMarkAsPaid returned userErrors — order tagged as collected but Shopify financial status not updated"
    );
  } else {
    logger.info(
      {
        orderId,
        financialStatus: orderMarkAsPaid.order?.displayFinancialStatus,
        outstanding: orderMarkAsPaid.order?.totalOutstandingSet?.shopMoney?.amount,
      },
      "Order marked as paid in Shopify successfully"
    );
  }

  return {
    success: true,
    orderId,
    tags: updateResult.orderUpdate.order.tags,
    financialStatus: orderMarkAsPaid.order?.displayFinancialStatus ?? "unknown",
  };
};

export const options = {
  actionType: "custom" as const,
  triggers: { api: true }
};
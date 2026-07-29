import { useCallback, useState } from 'react';
import { useGlobalAction } from "@gadgetinc/react";
import { api } from "../api";
import type { Route } from "./+types/_app.app.billing";

declare const shopify: any;

export const loader = async ({ context }: Route.LoaderArgs) => {
    const shopId = context.connections.shopify.currentShopId;
    if (!shopId) {
        throw new Error("Could not load current Shop");
    }

    const shop = await context.api.shopifyShop.findOne(shopId.toString(), {
        select: { myshopifyDomain: true }
    });

    let activeSubscription = null;
    let subscriptionError = null;
    try {
        activeSubscription = await context.api.getActiveShopSubscription({ shopId: shopId.toString() });
    } catch (err: any) {
        subscriptionError = err.message || "Failed to load active subscription";
    }

    return {
        myshopifyDomain: shop.myshopifyDomain,
        appHandle: process.env.GADGET_PUBLIC_SHOPIFY_APP_HANDLE || "whatflow-official-api",
        activeSubscription,
        subscriptionError,
        shopId: shopId.toString(),
    };
};

export default function Plans({ loaderData }: Route.ComponentProps) {
    const { myshopifyDomain, appHandle, activeSubscription, subscriptionError, shopId } = loaderData;
    const [{ fetching: canceling }, cancelSubscription] = useGlobalAction(api.cancelShopSubscription);
    const [canceled, setCanceled] = useState(false);

    const handleManagePlans = useCallback(() => {
        if (myshopifyDomain) {
            const storeHandle = myshopifyDomain.replace('.myshopify.com', '');
            const url = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
            open(url, "_top");
        }
    }, [myshopifyDomain, appHandle]);

    const handleCancelPlan = useCallback(async () => {
        try {
            await cancelSubscription({ shopId });
            setCanceled(true);
            if (typeof shopify !== 'undefined') {
                shopify.toast.show("Subscription canceled successfully");
            }
        } catch (err: any) {
            if (typeof shopify !== 'undefined') {
                shopify.toast.show(err.message || "Failed to cancel subscription", { isError: true });
            }
        }
    }, [cancelSubscription, shopId]);

    const flatItem = (activeSubscription as any)?.items?.find((i: any) => i.price?.__typename === "FlatRatePrice") || (activeSubscription as any)?.items?.[0];
    const tieredItem = (activeSubscription as any)?.items?.find((i: any) => i.price?.__typename === "TieredPrice");

    let planName = "Starter";
    if (flatItem) {
        if (flatItem.description) {
            planName = flatItem.description;
        } else if (flatItem.handle) {
            planName = flatItem.handle.charAt(0).toUpperCase() + flatItem.handle.slice(1).toLowerCase();
        }
    }

    let priceText = "Free";
    if (flatItem?.price) {
        const { price } = flatItem;
        const periodSuffix = activeSubscription.billingPeriod === "ANNUAL" ? "year" : "month";
        if (price.__typename === "FlatRatePrice" && price.amount !== undefined) {
            const symbol = price.currency === "USD" ? "$" : `${price.currency} `;
            priceText = `${symbol}${parseFloat(price.amount).toFixed(2)} per ${periodSuffix}`;
        } else if (price.__typename === "TieredPrice" && price.tiers?.[0]) {
            const baseTier = price.tiers[0];
            const baseAmount = baseTier.amount !== undefined ? baseTier.amount : "0";
            const symbol = price.currency === "USD" ? "$" : `${price.currency} `;
            priceText = `${symbol}${parseFloat(baseAmount).toFixed(2)} per ${periodSuffix}`;
        }
    }

    const renderUsageCharges = () => {
        if (planName.toLowerCase() === "starter") {
            return <s-text color="subdued">No usage charges on this plan.</s-text>;
        }
        if (!tieredItem) {
            return <s-text color="subdued">No usage charges.</s-text>;
        }

        const currency = tieredItem.price?.currency || "USD";
        const symbol = currency === "USD" ? "$" : `${currency} `;
        const tiers = tieredItem.price?.tiers || [];
        const tiersMode = tieredItem.price?.tiersMode || "GRADUATED";
        const eventName = tieredItem.description || "Messages Sent";

        if (tiers.length === 0) {
            return <s-text color="subdued">{tieredItem.description || "Usage based pricing."}</s-text>;
        }

        const sortedTiers = [...tiers].sort((a: any, b: any) => {
            if (a.upTo === null || a.upTo === undefined) return 1;
            if (b.upTo === null || b.upTo === undefined) return -1;
            return parseInt(a.upTo) - parseInt(b.upTo);
        });

        const isVolume = tiersMode === "VOLUME";

        return (
            <s-stack gap="small-100">
                {sortedTiers.map((tier: any, index: number) => {
                    const startUnit = index === 0 ? 1 : parseInt(sortedTiers[index - 1].upTo) + 1;
                    const endUnit = tier.upTo;

                    let rangeText = "";
                    if (endUnit !== null && endUnit !== undefined) {
                        if (index === 0) {
                            rangeText = `First ${parseInt(endUnit).toLocaleString()} ${eventName}`;
                        } else {
                            rangeText = `${startUnit} to ${parseInt(endUnit).toLocaleString()} ${eventName}`;
                        }
                    } else {
                        rangeText = `${startUnit}+ ${eventName}`;
                    }

                    const amountPerUnit = parseFloat(tier.amountPerUnit || "0");
                    let costText = "Free";
                    if (amountPerUnit > 0) {
                        const formattedPrice = amountPerUnit % 1 === 0 ? amountPerUnit.toFixed(0) : amountPerUnit.toFixed(3).replace(/\.?0+$/, '');
                        costText = `${symbol}${formattedPrice}`;
                    }

                    return (
                        <s-text color="subdued" key={index}>
                            {rangeText}: {costText}
                        </s-text>
                    );
                })}

                <s-box paddingBlockStart="small-100">
                    <s-text color="subdued">
                        <span style={{ fontSize: "12px", display: "block", fontStyle: "italic" }}>
                            {isVolume
                                ? "Your monthly usage total determines the cost per unit for all usage."
                                : "Each tier's cost per unit only applies to usage within that tier."
                            }
                        </span>
                    </s-text>
                </s-box>
            </s-stack>
        );
    };

    const isCanceled = activeSubscription?.cancelAtEndOfCycle || canceled;
    const hasTrial = !isCanceled && activeSubscription?.trialEndsAt && new Date(activeSubscription.trialEndsAt) > new Date();

    return (
        <>
            {activeSubscription && (
                <s-modal id="cancel-modal" heading="Cancel plan?">
                    <s-stack direction="block" gap="base">
                        <s-text>
                            Are you sure you want to cancel your subscription? Your access will continue until the end of the billing cycle.
                        </s-text>
                    </s-stack>
                    <s-button
                        slot="primary-action"
                        variant="primary"
                        tone="critical"
                        commandFor="cancel-modal"
                        command="--hide"
                        loading={canceling || undefined}
                        onClick={() => void handleCancelPlan()}
                    >
                        Cancel plan
                    </s-button>
                    <s-button slot="secondary-actions" commandFor="cancel-modal" command="--hide">
                        Keep plan
                    </s-button>
                </s-modal>
            )}

            <s-page heading="Plans & Billing">
                <s-link slot="breadcrumb-actions" href="/">
                    Home
                </s-link>

                <s-section>
                    {subscriptionError && (
                        <s-banner tone="critical" heading="Could not load subscription details">
                            <p>{subscriptionError}</p>
                            <p>Make sure SHOPIFY_PARTNER_API_TOKEN and SHOPIFY_ORGANIZATION_ID are set in your environment variables.</p>
                        </s-banner>
                    )}

                    {!activeSubscription && !subscriptionError && (
                        <s-stack gap="base">
                            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                                <s-stack gap="small-100">
                                    <s-heading>Subscription</s-heading>
                                    <s-text color="subdued">You're not subscribed to a plan yet.</s-text>
                                </s-stack>
                                <s-button variant="primary" onClick={handleManagePlans}>
                                    Select plan
                                </s-button>
                            </s-stack>
                        </s-stack>
                    )}

                    {activeSubscription && (
                        <s-stack gap="large">
                            <s-stack gap="small-100">
                                <s-heading>Subscription</s-heading>
                                {activeSubscription.currentBillingCycle ? (
                                    <s-text color="subdued">
                                        Billing cycle: {new Date(activeSubscription.currentBillingCycle.startTime).toLocaleDateString()} to {new Date(activeSubscription.currentBillingCycle.endTime).toLocaleDateString()}
                                    </s-text>
                                ) : activeSubscription.trialEndsAt ? (
                                    <s-text color="subdued">
                                        First billing cycle starts: {new Date(activeSubscription.trialEndsAt).toLocaleDateString()}
                                    </s-text>
                                ) : null}
                            </s-stack>

                            <s-grid gridTemplateColumns="1fr 1fr 2fr" gap="base">
                                <s-stack gap="small-100">
                                    <s-text type="strong">Current plan</s-text>
                                    <s-stack direction="inline" gap="small-200" alignItems="center">
                                        <s-text color="subdued">{planName}</s-text>
                                        {hasTrial && (
                                            <s-badge tone="info">Trial ends {new Date(activeSubscription.trialEndsAt).toLocaleDateString()}</s-badge>
                                        )}
                                        {(activeSubscription.cancelAtEndOfCycle || canceled) && (
                                            <s-badge tone="warning">Cancels at end of cycle</s-badge>
                                        )}
                                    </s-stack>
                                </s-stack>
                                <s-stack gap="small-100">
                                    <s-text type="strong">Price</s-text>
                                    <s-text color="subdued">{priceText}</s-text>
                                </s-stack>
                                <s-stack gap="small-100">
                                    <s-text type="strong">Usage charges</s-text>
                                    {renderUsageCharges()}
                                </s-stack>
                            </s-grid>

                            <s-stack direction="inline" gap="small-200" justifyContent="end" alignItems="center">
                                {activeSubscription && !activeSubscription.cancelAtEndOfCycle && !canceled && (
                                    <s-button
                                        tone="critical"
                                        onClick={() => {
                                            if (typeof shopify !== 'undefined') {
                                                shopify.modal.show('cancel-modal');
                                            }
                                        }}
                                    >
                                        Cancel plan
                                    </s-button>
                                )}
                                <s-button variant="primary" onClick={handleManagePlans}>
                                    Change plan
                                </s-button>
                            </s-stack>
                        </s-stack>
                    )}
                </s-section>
            </s-page>
        </>
    );
}
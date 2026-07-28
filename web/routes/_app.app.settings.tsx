import { useState, useEffect } from "react";
import { api } from "../api";
import { useBilling } from "../hooks/useBilling";
import { UpgradeModal } from "../components/UpgradeModal";

function SettingRow({ label, description, children, last }: {
    label: string;
    description?: string;
    children: React.ReactNode;
    last?: boolean;
}) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.8fr",
            gap: "24px",
            padding: "20px 0",
            borderBottom: last ? "none" : "1px solid #f1f2f3",
            alignItems: "start",
        }}>
            <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                    {label}
                </div>
                {description && (
                    <div style={{ fontSize: "12px", color: "#6d7175", lineHeight: "1.5" }}>
                        {description}
                    </div>
                )}
            </div>
            <div>{children}</div>
        </div>
    );
}

function SectionCard({ title, description, children }: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e1e3e5",
            borderRadius: "12px",
            marginBottom: "16px",
            overflow: "hidden",
        }}>
            <div style={{
                padding: "20px 24px 16px 24px",
                borderBottom: "1px solid #e1e3e5",
                backgroundColor: "#fafafa",
            }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#202223" }}>
                    {title}
                </div>
                {description && (
                    <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "3px" }}>
                        {description}
                    </div>
                )}
            </div>
            <div style={{ padding: "0 24px" }}>
                {children}
            </div>
        </div>
    );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div
            onClick={() => onChange(!value)}
            style={{
                width: "44px",
                height: "26px",
                borderRadius: "13px",
                backgroundColor: value ? "#202223" : "#c9cccf",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s ease",
                flexShrink: 0,
            }}
        >
            <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                position: "absolute",
                top: "3px",
                left: value ? "21px" : "3px",
                transition: "left 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
        </div>
    );
}

function TextInput({ value, onChange, maxLength, placeholder, disabled }: {
    value: string;
    onChange?: (v: string) => void;
    maxLength?: number;
    placeholder?: string;
    disabled?: boolean;
}) {
    return (
        <div>
            <input
                type="text"
                value={value}
                maxLength={maxLength}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(e) => onChange && onChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #c9cccf",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: disabled ? "#6d7175" : "#202223",
                    backgroundColor: disabled ? "#f6f6f7" : "#ffffff",
                    boxSizing: "border-box",
                    outline: "none",
                }}
                onFocus={(e) => { if (!disabled) e.target.style.borderColor = "#202223"; }}
                onBlur={(e) => { e.target.style.borderColor = "#c9cccf"; }}
            />
            {maxLength && !disabled && (
                <div style={{
                    fontSize: "11px",
                    color: value.length > maxLength * 0.85 ? "#d82c0d" : "#6d7175",
                    marginTop: "4px",
                    textAlign: "right",
                }}>
                    {value.length}/{maxLength}
                </div>
            )}
        </div>
    );
}

function NumberInput({ value, onChange, min, max, suffix }: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    suffix?: string;
}) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{
                    width: "80px",
                    padding: "8px 12px",
                    border: "1px solid #c9cccf",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#202223",
                    outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#202223"}
                onBlur={(e) => e.target.style.borderColor = "#c9cccf"}
            />
            {suffix && <span style={{ fontSize: "13px", color: "#6d7175" }}>{suffix}</span>}
        </div>
    );
}

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Settings
    const { billing, startUpgrade } = useBilling();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [defaultDepositPercentage, setDefaultDepositPercentage] = useState(20);
    const [defaultLineItemText, setDefaultLineItemText] = useState("Deposit only due at checkout");
    const [balanceDueReminders, setBalanceDueReminders] = useState(true);
    const [reminderDays, setReminderDays] = useState(3);
    const [shopName, setShopName] = useState("");
    const [shopEmail, setShopEmail] = useState("");

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        setLoading(true);
        try {
            const result = await api.getSettings();
            setDefaultDepositPercentage(result.defaultDepositPercentage ?? 20);
            setDefaultLineItemText(result.defaultLineItemText ?? "Deposit only due at checkout");
            setBalanceDueReminders(result.balanceDueReminders ?? true);
            setReminderDays(result.reminderDays ?? 3);
            setShopName(result.shopName ?? "");
            setShopEmail(result.shopEmail ?? "");
        } catch (err: any) {
            setErrorMessage("Failed to load settings.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        setErrorMessage(null);
        try {
            await api.saveSettings({
                defaultDepositPercentage,
                defaultLineItemText,
                balanceDueReminders,
                reminderDays,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setErrorMessage("Failed to save: " + err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <s-page>
                <div style={{ padding: "60px", textAlign: "center", color: "#6d7175", fontSize: "13px" }}>
                    Loading settings...
                </div>
            </s-page>
        );
    }

    return (
        <s-page>
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                title="COD reminders are a Pro feature"
                message="Upgrade to Pro to get automated reminders when COD balances are due. Never forget to collect a payment again."
                limitType="reminders"
                billing={billing}
                startUpgrade={startUpgrade}
            />
            {/* Page header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "24px",
            }}>
                <div>
                    <div style={{ fontSize: "22px", fontWeight: "700", color: "#202223", letterSpacing: "-0.3px" }}>
                        Settings
                    </div>
                    <div style={{ fontSize: "13px", color: "#6d7175", marginTop: "4px" }}>
                        Manage your lockdIn account and preferences.
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: saved ? "#1a7f37" : saving ? "#e1e3e5" : "#202223",
                        color: saving ? "#6d7175" : "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: saving ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                    }}
                >
                    {saved ? "✓ Saved" : saving ? "Saving..." : "Save settings"}
                </button>
            </div>

            {/* Error */}
            {errorMessage && (
                <div style={{
                    padding: "12px 16px",
                    backgroundColor: "#fff4f4",
                    border: "1px solid #ffd2d2",
                    borderRadius: "8px",
                    color: "#d82c0d",
                    fontSize: "13px",
                    marginBottom: "16px",
                }}>
                    {errorMessage}
                </div>
            )}

            {/* Account */}
            <SectionCard
                title="Account"
                description="Your store account details."
            >
                <SettingRow
                    label="Store name"
                    description="The name of your Shopify store."
                >
                    <TextInput value={shopName} disabled />
                </SettingRow>
                <SettingRow
                    label="Contact email"
                    description="We use this to contact you about your lockdIn account."
                    last
                >
                    <TextInput value={shopEmail} disabled />
                </SettingRow>
            </SectionCard>

            {/* Billing */}
            <SectionCard
                title="Billing"
                description="Your current lockdIn subscription plan."
            >
                <SettingRow
                    label="Current plan"
                    description="Upgrade to unlock unlimited deposit orders and advanced features."
                    last
                >
                    {billing?.isPro ? (
                        <div style={{
                            border: "1px solid #b3d8b0",
                            borderRadius: "10px",
                            padding: "16px",
                            backgroundColor: "#f0faf0",
                        }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "8px",
                            }}>
                                <div>
                                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#202223" }}>
                                        Pro plan
                                    </span>
                                    <span style={{
                                        marginLeft: "8px",
                                        padding: "2px 8px",
                                        backgroundColor: "#008060",
                                        color: "#ffffff",
                                        borderRadius: "20px",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                    }}>
                                        Active
                                    </span>
                                </div>
                                <span style={{ fontSize: "14px", fontWeight: "700", color: "#202223" }}>
                                    $14.99/month
                                </span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#4a7c59" }}>
                                ✓ Unlimited deposit orders · ✓ Unlimited purchase options · ✓ COD reminders
                            </div>
                        </div>
                    ) : (
                        <div style={{ border: "1px solid #e1e3e5", borderRadius: "10px", padding: "16px" }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "8px",
                            }}>
                                <div>
                                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#202223" }}>
                                        Free plan
                                    </span>
                                    <span style={{
                                        marginLeft: "8px",
                                        padding: "2px 8px",
                                        backgroundColor: "#e3f1df",
                                        color: "#1a7f37",
                                        borderRadius: "20px",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                    }}>
                                        Current plan
                                    </span>
                                </div>
                                <span style={{ fontSize: "14px", fontWeight: "700", color: "#202223" }}>
                                    $0/month
                                </span>
                            </div>
                            <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                                <div style={{ flex: 1, background: "#f6f6f7", borderRadius: "8px", padding: "10px 12px" }}>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#202223" }}>
                                        {billing?.monthlyOrderCount ?? 0}
                                        <span style={{ fontSize: "13px", fontWeight: "400", color: "#6d7175" }}>
                                            /{billing?.FREE_ORDER_LIMIT ?? 25}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#6d7175", marginTop: "2px" }}>
                                        deposit orders this month
                                    </div>
                                </div>
                                <div style={{ flex: 1, background: "#f6f6f7", borderRadius: "8px", padding: "10px 12px" }}>
                                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#202223" }}>
                                        {billing?.purchaseOptionCount ?? 0}
                                        <span style={{ fontSize: "13px", fontWeight: "400", color: "#6d7175" }}>
                                            /{billing?.FREE_PURCHASE_OPTION_LIMIT ?? 3}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#6d7175", marginTop: "2px" }}>
                                        purchase options
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#202223",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    width: "100%",
                                }}
                            >
                                Upgrade to Pro — $14.99/month
                            </button>
                        </div>
                    )}
                </SettingRow>
            </SectionCard>

            {/* Theme installation */}
            <SectionCard
                title="Theme installation"
                description="Add the lockdIn deposit widget to your storefront."
            >
                <SettingRow
                    label="Widget block"
                    description="The deposit widget must be added to your product page template in the theme editor."
                    last
                >
                    <div style={{
                        border: "1px solid #e1e3e5",
                        borderRadius: "10px",
                        padding: "16px",
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "12px",
                        }}>
                            <div style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: "#f59e0b",
                            }} />
                            <span style={{ fontSize: "13px", color: "#202223", fontWeight: "600" }}>
                                Verify widget is active on your theme
                            </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#6d7175", marginBottom: "12px" }}>
                            Open your theme editor and confirm the lockdIn Deposit Options block is added to your product page template.
                        </div>
                        <a
                            href="https://admin.shopify.com/store/affans-testing/themes/current/editor"
                            target="_top"
                            style={{
                                display: "inline-block",
                                padding: "8px 16px",
                                backgroundColor: "#202223",
                                color: "#ffffff",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                textDecoration: "none",
                            }}
                        >
                            Open theme editor →
                        </a>
                    </div>
                </SettingRow>p
            </SectionCard>

            {/* Deposit defaults */}
            <SectionCard
                title="Deposit defaults"
                description="Pre-filled values when you create a new purchase option."
            >
                <SettingRow
                    label="Default deposit %"
                    description="The deposit percentage automatically filled in when creating a new purchase option."
                >
                    <NumberInput
                        value={defaultDepositPercentage}
                        onChange={setDefaultDepositPercentage}
                        min={1}
                        max={99}
                        suffix="% of order total"
                    />
                </SettingRow>
                <SettingRow
                    label="Line item help text"
                    description="Shown next to the line item at checkout. Max 29 characters."
                    last
                >
                    <TextInput
                        value={defaultLineItemText}
                        onChange={setDefaultLineItemText}
                        maxLength={29}
                        placeholder="Deposit only due at checkout"
                    />
                </SettingRow>
            </SectionCard>

            {/* COD reminders */}
            <SectionCard
                title="COD balance reminders"
                description="Get reminded to collect outstanding COD balances."
            >
                <SettingRow
                    label="Enable reminders"
                    description="Receive a notification when a COD balance is approaching its collection date."
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Toggle value={balanceDueReminders} onChange={setBalanceDueReminders} />
                        <span style={{ fontSize: "13px", color: "#6d7175" }}>
                            {balanceDueReminders ? "Enabled" : "Disabled"}
                        </span>
                    </div>
                </SettingRow>
                {balanceDueReminders && (
                    <SettingRow
                        label="Reminder timing"
                        description="How many days before the balance is due to send a reminder."
                        last
                    >
                        <NumberInput
                            value={reminderDays}
                            onChange={setReminderDays}
                            min={1}
                            max={30}
                            suffix="days before balance is due"
                        />
                    </SettingRow>
                )}
                {!balanceDueReminders && (
                    <div style={{ height: "4px" }} />
                )}
            </SectionCard>

            {/* Support */}
            <SectionCard title="Support">
                <SettingRow
                    label="Need help?"
                    description="Reach out and we will get back to you within 24 hours."
                >
                    <a
                        href="mailto:support@lockdin.app"
                        style={{
                            fontSize: "13px",
                            color: "#202223",
                            fontWeight: "600",
                            textDecoration: "none",
                            borderBottom: "1px solid #202223",
                        }}
                    >
                        support@lockdin.app
                    </a>
                </SettingRow>
                <SettingRow label="App version" last>
                    <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        backgroundColor: "#f6f6f7",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#202223",
                    }}>
                        <span style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#1a7f37",
                            display: "inline-block",
                        }} />
                        v1.0.0 — development
                    </div>
                </SettingRow>
            </SectionCard>
        </s-page>
    );
}

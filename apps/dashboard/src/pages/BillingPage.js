import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
export function BillingPage() {
    const api = useApi();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const subscriptionQuery = useQuery({
        queryKey: ['subscription'],
        queryFn: () => api.get('/api/billing/subscription'),
    });
    const plansQuery = useQuery({
        queryKey: ['plans'],
        queryFn: () => api.get('/api/billing/plans'),
    });
    const createCheckoutSession = useMutation({
        mutationFn: (planId) => api.post('/api/billing/create-checkout-session', {
            planId,
        }),
        onSuccess: (data) => {
            // Redirect to Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            }
        },
    });
    const createPortalSession = useMutation({
        mutationFn: () => api.post('/api/billing/create-portal-session', {}),
        onSuccess: (data) => {
            // Redirect to Stripe Customer Portal
            if (data.url) {
                window.location.href = data.url;
            }
        },
    });
    const cancelSubscription = useMutation({
        mutationFn: () => api.post('/api/billing/cancel-subscription', {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
            alert('Your subscription will be canceled at the end of the billing period.');
        },
    });
    const handleUpgrade = async (planId) => {
        setLoading(true);
        try {
            await createCheckoutSession.mutateAsync(planId);
        }
        catch (error) {
            console.error('Error creating checkout session:', error);
            alert('Failed to initiate checkout. Please try again.');
            setLoading(false);
        }
    };
    const handleManageBilling = async () => {
        setLoading(true);
        try {
            await createPortalSession.mutateAsync();
        }
        catch (error) {
            console.error('Error creating portal session:', error);
            alert('Failed to open billing portal. Please try again.');
            setLoading(false);
        }
    };
    const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };
    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleDateString();
    };
    const calculateUsagePercentage = (used, limit) => {
        return Math.min((used / limit) * 100, 100);
    };
    const subscription = subscriptionQuery.data;
    const plans = plansQuery.data?.plans || [];
    if (subscriptionQuery.isLoading || plansQuery.isLoading) {
        return (_jsx("div", { className: "p-8", children: _jsx("div", { className: "text-center", children: "Loading..." }) }));
    }
    return (_jsxs("div", { className: "p-8 max-w-7xl mx-auto", children: [_jsx("h1", { className: "text-3xl font-bold mb-8", children: "Billing & Subscription" }), _jsxs("div", { className: "bg-white rounded-lg shadow-md p-6 mb-8", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-2xl font-semibold", children: [subscription?.currentPlan.name, " Plan"] }), _jsx("p", { className: "text-gray-600 mt-1", children: subscription?.currentPlan.description })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-3xl font-bold", children: subscription && formatCurrency(subscription.currentPlan.price, subscription.currentPlan.currency) }), _jsxs("div", { className: "text-gray-600", children: ["per ", subscription?.currentPlan.interval] })] })] }), _jsxs("div", { className: "mt-4 p-4 bg-gray-50 rounded", children: [_jsxs("p", { className: "text-sm text-gray-700", children: ["Status: ", _jsx("span", { className: "font-semibold capitalize", children: subscription?.subscriptionStatus })] }), subscription?.stripeSubscription && (_jsxs("p", { className: "text-sm text-gray-700 mt-1", children: ["Next billing date: ", formatDate(subscription.stripeSubscription.currentPeriodEnd)] })), subscription?.stripeSubscription?.cancelAtPeriodEnd && (_jsxs("p", { className: "text-sm text-red-600 mt-1 font-semibold", children: ["Subscription will be canceled on ", formatDate(subscription.stripeSubscription.currentPeriodEnd)] }))] }), _jsx("div", { className: "mt-4", children: subscription?.stripeSubscription && (_jsx("button", { onClick: handleManageBilling, disabled: loading, className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: "Manage Billing" })) })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-md p-6 mb-8", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Current Usage" }), _jsx("div", { className: "space-y-4", children: subscription && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-sm mb-1", children: [_jsx("span", { children: "Conversations" }), _jsxs("span", { children: [subscription.usage.conversations, " / ", subscription.currentPlan.limits.conversations] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full", style: {
                                                    width: `${calculateUsagePercentage(subscription.usage.conversations, subscription.currentPlan.limits.conversations)}%`,
                                                } }) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-sm mb-1", children: [_jsx("span", { children: "Documents" }), _jsxs("span", { children: [subscription.usage.documents, " / ", subscription.currentPlan.limits.documents] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full", style: {
                                                    width: `${calculateUsagePercentage(subscription.usage.documents, subscription.currentPlan.limits.documents)}%`,
                                                } }) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-sm mb-1", children: [_jsx("span", { children: "Messages This Month" }), _jsxs("span", { children: [subscription.usage.messages, " / ", subscription.currentPlan.limits.messagesPerMonth] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full", style: {
                                                    width: `${calculateUsagePercentage(subscription.usage.messages, subscription.currentPlan.limits.messagesPerMonth)}%`,
                                                } }) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-sm mb-1", children: [_jsx("span", { children: "API Calls This Month" }), _jsxs("span", { children: [subscription.usage.apiCalls, " / ", subscription.currentPlan.limits.apiCallsPerMonth] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full", style: {
                                                    width: `${calculateUsagePercentage(subscription.usage.apiCalls, subscription.currentPlan.limits.apiCallsPerMonth)}%`,
                                                } }) })] })] })) })] }), _jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold mb-4", children: "Available Plans" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: plans.map((plan) => (_jsxs("div", { className: `bg-white rounded-lg shadow-md p-6 ${plan.popular ? 'ring-2 ring-blue-500' : ''} ${subscription?.currentPlan.id === plan.id ? 'bg-blue-50' : ''}`, children: [plan.popular && (_jsx("div", { className: "text-blue-600 text-sm font-semibold mb-2", children: "POPULAR" })), _jsx("h3", { className: "text-xl font-bold mb-2", children: plan.name }), _jsx("p", { className: "text-gray-600 mb-4 text-sm", children: plan.description }), _jsxs("div", { className: "text-3xl font-bold mb-4", children: [formatCurrency(plan.price, plan.currency), _jsxs("span", { className: "text-sm text-gray-600 font-normal", children: ["/", plan.interval] })] }), _jsx("ul", { className: "space-y-2 mb-6", children: plan.features.map((feature, idx) => (_jsxs("li", { className: "text-sm flex items-start", children: [_jsx("span", { className: "text-green-500 mr-2", children: "\u2713" }), _jsx("span", { children: feature })] }, idx))) }), subscription?.currentPlan.id === plan.id ? (_jsx("button", { disabled: true, className: "w-full px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed", children: "Current Plan" })) : plan.id === 'free' ? (_jsx("button", { disabled: true, className: "w-full px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed", children: "Free Plan" })) : (_jsx("button", { onClick: () => handleUpgrade(plan.id), disabled: loading, className: "w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: loading ? 'Processing...' : 'Upgrade' }))] }, plan.id))) })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Invoice History" }), subscription?.invoices && subscription.invoices.length > 0 ? (_jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 text-left text-sm font-medium text-gray-700", children: "Date" }), _jsx("th", { className: "px-4 py-2 text-left text-sm font-medium text-gray-700", children: "Amount" }), _jsx("th", { className: "px-4 py-2 text-left text-sm font-medium text-gray-700", children: "Status" }), _jsx("th", { className: "px-4 py-2 text-left text-sm font-medium text-gray-700", children: "Period" }), _jsx("th", { className: "px-4 py-2 text-left text-sm font-medium text-gray-700", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: subscription.invoices.map((invoice) => (_jsxs("tr", { children: [_jsx("td", { className: "px-4 py-2 text-sm", children: formatDate(invoice.created) }), _jsx("td", { className: "px-4 py-2 text-sm font-semibold", children: formatCurrency(invoice.amountPaid, invoice.currency) }), _jsx("td", { className: "px-4 py-2 text-sm", children: _jsx("span", { className: `px-2 py-1 rounded text-xs ${invoice.status === 'paid'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'}`, children: invoice.status }) }), _jsxs("td", { className: "px-4 py-2 text-sm", children: [formatDate(invoice.periodStart), " - ", formatDate(invoice.periodEnd)] }), _jsxs("td", { className: "px-4 py-2 text-sm", children: [invoice.hostedInvoiceUrl && (_jsx("a", { href: invoice.hostedInvoiceUrl, target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:underline", children: "View" })), invoice.invoicePdf && (_jsx("a", { href: invoice.invoicePdf, target: "_blank", rel: "noopener noreferrer", className: "ml-4 text-blue-600 hover:underline", children: "PDF" }))] })] }, invoice.id))) })] })) : (_jsx("p", { className: "text-gray-600", children: "No invoices yet." }))] })] }));
}
//# sourceMappingURL=BillingPage.js.map
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  limits: {
    conversations: number;
    documents: number;
    teamMembers: number;
    messagesPerMonth: number;
    apiCallsPerMonth: number;
  };
  features: string[];
  popular?: boolean;
}

interface Usage {
  conversations: number;
  documents: number;
  teamMembers: number;
  messages: number;
  apiCalls: number;
}

interface Invoice {
  id: string;
  amountPaid: number;
  currency: string;
  status: string;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  created: number;
  periodStart: number;
  periodEnd: number;
}

interface SubscriptionData {
  currentPlan: Plan;
  subscriptionStatus: string;
  usage: Usage;
  stripeSubscription: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  } | null;
  invoices: Invoice[];
}

export function BillingPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get<SubscriptionData>('/api/billing/subscription'),
  });

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<{ plans: Plan[] }>('/api/billing/plans'),
  });

  const createCheckoutSession = useMutation({
    mutationFn: (planId: string) =>
      api.post<{ sessionId: string; url: string }>('/api/billing/create-checkout-session', {
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
    mutationFn: () => api.post<{ url: string }>('/api/billing/create-portal-session', {}),
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

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    try {
      await createCheckoutSession.mutateAsync(planId);
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to initiate checkout. Please try again.');
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      await createPortalSession.mutateAsync();
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('Failed to open billing portal. Please try again.');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const calculateUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const subscription = subscriptionQuery.data;
  const plans = plansQuery.data?.plans || [];

  if (subscriptionQuery.isLoading || plansQuery.isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>

      {/* Current Plan Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-semibold">{subscription?.currentPlan.name} Plan</h2>
            <p className="text-gray-600 mt-1">{subscription?.currentPlan.description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {subscription && formatCurrency(subscription.currentPlan.price, subscription.currentPlan.currency)}
            </div>
            <div className="text-gray-600">per {subscription?.currentPlan.interval}</div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-700">
            Status: <span className="font-semibold capitalize">{subscription?.subscriptionStatus}</span>
          </p>
          {subscription?.stripeSubscription && (
            <p className="text-sm text-gray-700 mt-1">
              Next billing date: {formatDate(subscription.stripeSubscription.currentPeriodEnd)}
            </p>
          )}
          {subscription?.stripeSubscription?.cancelAtPeriodEnd && (
            <p className="text-sm text-red-600 mt-1 font-semibold">
              Subscription will be canceled on {formatDate(subscription.stripeSubscription.currentPeriodEnd)}
            </p>
          )}
        </div>

        <div className="mt-4">
          {subscription?.stripeSubscription && (
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Manage Billing
            </button>
          )}
        </div>
      </div>

      {/* Usage Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Current Usage</h2>
        <div className="space-y-4">
          {subscription && (
            <>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Conversations</span>
                  <span>{subscription.usage.conversations} / {subscription.currentPlan.limits.conversations}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${calculateUsagePercentage(
                        subscription.usage.conversations,
                        subscription.currentPlan.limits.conversations
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Documents</span>
                  <span>{subscription.usage.documents} / {subscription.currentPlan.limits.documents}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${calculateUsagePercentage(
                        subscription.usage.documents,
                        subscription.currentPlan.limits.documents
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Messages This Month</span>
                  <span>{subscription.usage.messages} / {subscription.currentPlan.limits.messagesPerMonth}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${calculateUsagePercentage(
                        subscription.usage.messages,
                        subscription.currentPlan.limits.messagesPerMonth
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>API Calls This Month</span>
                  <span>{subscription.usage.apiCalls} / {subscription.currentPlan.limits.apiCallsPerMonth}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${calculateUsagePercentage(
                        subscription.usage.apiCalls,
                        subscription.currentPlan.limits.apiCallsPerMonth
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Available Plans */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-md p-6 ${
                plan.popular ? 'ring-2 ring-blue-500' : ''
              } ${
                subscription?.currentPlan.id === plan.id ? 'bg-blue-50' : ''
              }`}
            >
              {plan.popular && (
                <div className="text-blue-600 text-sm font-semibold mb-2">POPULAR</div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-4 text-sm">{plan.description}</p>
              <div className="text-3xl font-bold mb-4">
                {formatCurrency(plan.price, plan.currency)}
                <span className="text-sm text-gray-600 font-normal">/{plan.interval}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="text-sm flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {subscription?.currentPlan.id === plan.id ? (
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : plan.id === 'free' ? (
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed"
                >
                  Free Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Invoice History</h2>
        {subscription?.invoices && subscription.invoices.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Period</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscription.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-2 text-sm">{formatDate(invoice.created)}</td>
                  <td className="px-4 py-2 text-sm font-semibold">
                    {formatCurrency(invoice.amountPaid, invoice.currency)}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {invoice.hostedInvoiceUrl && (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    )}
                    {invoice.invoicePdf && (
                      <a
                        href={invoice.invoicePdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-blue-600 hover:underline"
                      >
                        PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-600">No invoices yet.</p>
        )}
      </div>
    </div>
  );
}

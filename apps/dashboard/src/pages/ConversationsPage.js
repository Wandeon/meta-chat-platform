import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import DOMPurify from 'dompurify';
export function ConversationsPage() {
    const api = useApi();
    const queryClient = useQueryClient();
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    // Fetch all conversations
    const conversationsQuery = useQuery({
        queryKey: ['conversations', statusFilter],
        queryFn: () => {
            const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
            return api.get(`/api/conversations${params}`);
        },
    });
    // Fetch tenants for display
    const tenantsQuery = useQuery({
        queryKey: ['tenants'],
        queryFn: () => api.get('/api/tenants'),
    });
    // Fetch selected conversation with messages
    const conversationDetailQuery = useQuery({
        queryKey: ['conversation', selectedConversation],
        queryFn: () => api.get(`/api/conversations/${selectedConversation}`),
        enabled: !!selectedConversation,
    });
    // Update conversation status mutation
    const updateConversation = useMutation({
        mutationFn: ({ id, status }) => api.put(`/api/conversations/${id}`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversation] });
        },
    });
    const getTenantName = (tenantId) => {
        const tenant = tenantsQuery.data?.find((t) => t.id === tenantId);
        return tenant?.name || tenantId.slice(0, 8) + '...';
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return { bg: '#d1fae5', color: '#065f46' };
            case 'assigned_human':
                return { bg: '#fef3c7', color: '#92400e' };
            case 'closed':
                return { bg: '#f1f5f9', color: '#475569' };
            default:
                return { bg: '#e0e7ff', color: '#3730a3' };
        }
    };
    const handleMarkAsResolved = (conversationId) => {
        if (confirm('Mark this conversation as resolved and close it?')) {
            updateConversation.mutate({ id: conversationId, status: 'closed' });
            setSelectedConversation(null);
        }
    };
    const handoffConversations = conversationsQuery.data?.filter((c) => c.status === 'assigned_human') || [];
    const activeConversations = conversationsQuery.data?.filter((c) => c.status === 'active') || [];
    return (_jsxs("section", { className: "dashboard-section", children: [_jsx("h1", { children: "Conversations" }), _jsx("p", { style: { margin: '8px 0 24px 0', color: '#64748b' }, children: "Monitor active conversations and respond to human handoff requests" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }, children: [_jsxs("div", { style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }, children: [_jsx("h3", { style: { margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }, children: "Needs Human Attention" }), _jsx("p", { style: { fontSize: '2.5rem', margin: 0, fontWeight: 700, color: '#f59e0b' }, children: handoffConversations.length })] }), _jsxs("div", { style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }, children: [_jsx("h3", { style: { margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }, children: "Active (AI Handling)" }), _jsx("p", { style: { fontSize: '2.5rem', margin: 0, fontWeight: 700, color: '#10b981' }, children: activeConversations.length })] }), _jsxs("div", { style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }, children: [_jsx("h3", { style: { margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }, children: "Total Conversations" }), _jsx("p", { style: { fontSize: '2.5rem', margin: 0, fontWeight: 700, color: '#3b82f6' }, children: conversationsQuery.data?.length || 0 })] })] }), _jsxs("div", { style: { marginBottom: '16px', display: 'flex', gap: '8px' }, children: [_jsx("button", { onClick: () => setStatusFilter('all'), className: statusFilter === 'all' ? 'primary-button' : 'secondary-button', style: { fontSize: '14px', padding: '8px 16px' }, children: "All" }), _jsx("button", { onClick: () => setStatusFilter('assigned_human'), className: statusFilter === 'assigned_human' ? 'primary-button' : 'secondary-button', style: { fontSize: '14px', padding: '8px 16px' }, children: "Needs Human" }), _jsx("button", { onClick: () => setStatusFilter('active'), className: statusFilter === 'active' ? 'primary-button' : 'secondary-button', style: { fontSize: '14px', padding: '8px 16px' }, children: "Active" }), _jsx("button", { onClick: () => setStatusFilter('closed'), className: statusFilter === 'closed' ? 'primary-button' : 'secondary-button', style: { fontSize: '14px', padding: '8px 16px' }, children: "Closed" })] }), conversationsQuery.isLoading ? (_jsx("p", { children: "Loading conversations..." })) : conversationsQuery.error ? (_jsxs("p", { style: { color: '#dc2626' }, children: ["Error: ", conversationsQuery.error.message] })) : conversationsQuery.data && conversationsQuery.data.length === 0 ? (_jsx("div", { style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '48px', textAlign: 'center' }, children: _jsx("p", { style: { margin: 0, color: '#64748b' }, children: "No conversations found" }) })) : (_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Tenant" }), _jsx("th", { children: "Channel" }), _jsx("th", { children: "User ID" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Handoff Reason" }), _jsx("th", { children: "Last Message" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: conversationsQuery.data?.map((conversation) => {
                            const statusStyle = getStatusColor(conversation.status);
                            const metadata = conversation.metadata || {};
                            const handoffReason = metadata.handoffReason || '-';
                            const triggeredKeyword = metadata.triggeredKeyword || '';
                            return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: getTenantName(conversation.tenantId) }) }), _jsx("td", { children: _jsx("span", { style: {
                                                fontSize: '13px',
                                                padding: '2px 8px',
                                                background: '#f1f5f9',
                                                borderRadius: '4px',
                                                fontFamily: 'monospace',
                                            }, children: conversation.channelType }) }), _jsxs("td", { style: { fontSize: '13px', fontFamily: 'monospace' }, children: [conversation.userId.slice(0, 12), "..."] }), _jsx("td", { children: _jsx("span", { style: {
                                                fontSize: '11px',
                                                padding: '4px 8px',
                                                background: statusStyle.bg,
                                                color: statusStyle.color,
                                                borderRadius: '4px',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                            }, children: conversation.status }) }), _jsxs("td", { style: { fontSize: '13px' }, children: [handoffReason !== '-' && (_jsxs("span", { children: [handoffReason, triggeredKeyword && (_jsxs("code", { style: {
                                                            marginLeft: '6px',
                                                            background: '#fef3c7',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            color: '#92400e',
                                                        }, children: ["\"", triggeredKeyword, "\""] }))] })), handoffReason === '-' && '-'] }), _jsx("td", { style: { fontSize: '13px', color: '#64748b' }, children: new Date(conversation.lastMessageAt).toLocaleString() }), _jsx("td", { children: _jsx("button", { onClick: () => setSelectedConversation(conversation.id), className: "secondary-button", style: { fontSize: '13px', padding: '6px 12px' }, children: "View" }) })] }, conversation.id));
                        }) })] })), selectedConversation && (_jsx("div", { style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }, children: _jsxs("div", { style: {
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '0',
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                    }, children: [_jsxs("div", { style: { padding: '24px', borderBottom: '1px solid #e2e8f0' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("h2", { style: { margin: 0, fontSize: '20px', fontWeight: 600 }, children: "Conversation Details" }), _jsx("button", { onClick: () => setSelectedConversation(null), style: {
                                                background: 'transparent',
                                                border: 'none',
                                                fontSize: '24px',
                                                cursor: 'pointer',
                                                color: '#64748b',
                                            }, children: "\u00D7" })] }), conversationDetailQuery.data && (_jsxs("div", { style: { marginTop: '12px', display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }, children: [_jsxs("span", { children: ["Tenant: ", _jsx("strong", { children: getTenantName(conversationDetailQuery.data.tenantId) })] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Channel: ", _jsx("strong", { children: conversationDetailQuery.data.channelType })] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Status: ", _jsx("strong", { style: { color: getStatusColor(conversationDetailQuery.data.status).color }, children: conversationDetailQuery.data.status })] })] }))] }), _jsx("div", { style: { flex: 1, overflow: 'auto', padding: '24px', background: '#f8fafc' }, children: conversationDetailQuery.isLoading ? (_jsx("p", { children: "Loading messages..." })) : conversationDetailQuery.error ? (_jsx("p", { style: { color: '#dc2626' }, children: "Error loading messages" })) : conversationDetailQuery.data?.messages && conversationDetailQuery.data.messages.length === 0 ? (_jsx("p", { style: { color: '#64748b' }, children: "No messages yet" })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: conversationDetailQuery.data?.messages.map((message) => {
                                    const isUser = message.direction === 'inbound';
                                    const messageText = typeof message.content === 'object'
                                        ? (message.content.text || JSON.stringify(message.content))
                                        : String(message.content);
                                    const isHandoffMessage = message.metadata?.humanHandoffTriggered;
                                    // Sanitize message content to prevent XSS attacks
                                    const sanitizedMessageText = DOMPurify.sanitize(messageText, {
                                        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
                                        ALLOWED_ATTR: ['href', 'target', 'rel']
                                    });
                                    return (_jsx("div", { style: {
                                            display: 'flex',
                                            justifyContent: isUser ? 'flex-start' : 'flex-end',
                                        }, children: _jsxs("div", { style: {
                                                maxWidth: '70%',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                background: isUser ? '#fff' : isHandoffMessage ? '#fef3c7' : '#e0e7ff',
                                                border: isUser ? '1px solid #e2e8f0' : 'none',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            }, children: [_jsx("div", { style: { fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }, children: isUser ? 'User' : message.from === 'system' ? 'System' : 'AI Assistant' }), _jsx("div", { style: { fontSize: '14px', color: '#1e293b', whiteSpace: 'pre-wrap' }, dangerouslySetInnerHTML: { __html: sanitizedMessageText } }), _jsx("div", { style: { fontSize: '11px', color: '#94a3b8', marginTop: '6px' }, children: new Date(message.timestamp).toLocaleString() }), isHandoffMessage && (_jsxs("div", { style: {
                                                        marginTop: '8px',
                                                        fontSize: '11px',
                                                        color: '#92400e',
                                                        background: '#fef9c3',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                    }, children: ["\u26A0\uFE0F Human handoff triggered: \"", DOMPurify.sanitize(message.metadata.triggeredKeyword), "\""] }))] }) }, message.id));
                                }) })) }), conversationDetailQuery.data?.status === 'assigned_human' && (_jsxs("div", { style: { padding: '24px', borderTop: '1px solid #e2e8f0', background: '#fef3c7' }, children: [_jsx("p", { style: { margin: '0 0 12px 0', fontSize: '14px', color: '#92400e', fontWeight: 500 }, children: "\u26A0\uFE0F This conversation needs human attention" }), _jsx("button", { onClick: () => handleMarkAsResolved(selectedConversation), disabled: updateConversation.isPending, className: "primary-button", style: { fontSize: '14px' }, children: updateConversation.isPending ? 'Updating...' : 'Mark as Resolved & Close' })] }))] }) }))] }));
}
//# sourceMappingURL=ConversationsPage.js.map
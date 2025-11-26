import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
export function TestingPage() {
    const api = useApi();
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastMetadata, setLastMetadata] = useState(null);
    // Fetch selected tenant details
    const tenantQuery = useQuery({
        queryKey: ['tenant', selectedTenantId],
        queryFn: () => api.get(`/api/tenants/${selectedTenantId}`),
        enabled: !!selectedTenantId,
    });
    // Fetch tenant API key for making chat requests
    const apiKeysQuery = useQuery({
        queryKey: ['tenant-api-keys', selectedTenantId],
        queryFn: async () => {
            // This assumes there's an endpoint to get tenant API keys
            // If not, we'll need to use the admin key and pass tenantId
            return null;
        },
        enabled: !!selectedTenantId,
    });
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !selectedTenantId)
            return;
        const userMessage = {
            role: 'user',
            content: inputMessage,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);
        setError(null);
        try {
            // Make chat request - this will need to be adjusted based on your actual chat endpoint
            const startTime = Date.now();
            const response = await api.post('/api/chat', {
                message: inputMessage,
                conversationId: conversationId,
                tenantId: selectedTenantId,
            });
            const latency = Date.now() - startTime;
            const assistantMessage = {
                role: 'assistant',
                content: response.message || 'No response',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            if (response.conversationId) {
                setConversationId(response.conversationId);
            }
            setLastMetadata({
                ...response.metadata,
                latency,
            });
        }
        catch (err) {
            setError(err.message || 'Failed to send message');
            console.error('Chat error:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleClearChat = () => {
        setMessages([]);
        setConversationId(null);
        setLastMetadata(null);
        setError(null);
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };
    return (_jsxs("section", { className: "dashboard-section", children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { children: "Chat Testing" }), _jsx("p", { style: { margin: '8px 0 0 0', color: '#64748b' }, children: "Test AI responses for different tenants in real-time" })] }), _jsxs("div", { style: { marginBottom: 24, maxWidth: 400 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 8, fontWeight: 500 }, children: "Select Tenant" }), _jsx(TenantSelector, { value: selectedTenantId, onChange: setSelectedTenantId, placeholder: "Choose a tenant to test..." }), selectedTenantId && tenantQuery.data && (_jsxs("div", { style: {
                            marginTop: 8,
                            padding: 12,
                            background: '#f8fafc',
                            borderRadius: 8,
                            fontSize: '13px',
                        }, children: [_jsxs("div", { children: [_jsx("strong", { children: "Provider:" }), " ", tenantQuery.data.settings?.llm?.provider || 'openai'] }), _jsxs("div", { children: [_jsx("strong", { children: "Model:" }), " ", tenantQuery.data.settings?.llm?.model || 'gpt-4o'] }), conversationId && (_jsxs("div", { style: { marginTop: 4, color: '#64748b' }, children: [_jsx("strong", { children: "Conversation ID:" }), " ", conversationId] }))] }))] }), selectedTenantId && (_jsxs("div", { className: "testing-layout", children: [_jsxs("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            height: '600px',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            overflow: 'hidden',
                        }, children: [_jsxs("div", { style: {
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: 16,
                                    background: '#fafafa',
                                }, children: [messages.length === 0 && (_jsxs("div", { style: {
                                            textAlign: 'center',
                                            color: '#94a3b8',
                                            padding: '40px 20px',
                                        }, children: [_jsx("p", { style: { fontSize: '18px', marginBottom: 8 }, children: "\uD83D\uDC4B Start a conversation" }), _jsx("p", { style: { fontSize: '14px' }, children: "Type a message below to test the AI assistant" })] })), messages.map((msg, idx) => (_jsx("div", { style: {
                                            marginBottom: 16,
                                            display: 'flex',
                                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        }, children: _jsxs("div", { style: {
                                                maxWidth: '70%',
                                                padding: '10px 14px',
                                                borderRadius: 12,
                                                background: msg.role === 'user' ? '#4f46e5' : '#fff',
                                                color: msg.role === 'user' ? '#fff' : '#0f172a',
                                                boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                            }, children: [_jsx("div", { style: { fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }, children: msg.content }), _jsx("div", { style: {
                                                        fontSize: '11px',
                                                        marginTop: 4,
                                                        opacity: 0.7,
                                                    }, children: msg.timestamp.toLocaleTimeString() })] }) }, idx))), isLoading && (_jsx("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'flex-start',
                                            marginBottom: 16,
                                        }, children: _jsx("div", { style: {
                                                padding: '10px 14px',
                                                borderRadius: 12,
                                                background: '#fff',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            }, children: _jsxs("div", { style: { fontSize: '14px', color: '#64748b' }, children: [_jsx("span", { className: "dot", children: "\u25CF" }), _jsx("span", { className: "dot", children: "\u25CF" }), _jsx("span", { className: "dot", children: "\u25CF" })] }) }) })), error && (_jsxs("div", { style: {
                                            padding: 12,
                                            background: '#fee2e2',
                                            border: '1px solid #fca5a5',
                                            borderRadius: 8,
                                            color: '#991b1b',
                                            fontSize: '14px',
                                            marginBottom: 16,
                                        }, children: [_jsx("strong", { children: "Error:" }), " ", error] }))] }), _jsx("div", { style: {
                                    padding: 16,
                                    borderTop: '1px solid #e2e8f0',
                                    background: '#fff',
                                }, children: _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("textarea", { value: inputMessage, onChange: (e) => setInputMessage(e.target.value), onKeyPress: handleKeyPress, placeholder: "Type your message... (Shift+Enter for new line)", disabled: isLoading, rows: 3, style: {
                                                flex: 1,
                                                padding: '10px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: 8,
                                                fontSize: '14px',
                                                resize: 'none',
                                                fontFamily: 'inherit',
                                            } }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: _jsx("button", { onClick: handleSendMessage, disabled: isLoading || !inputMessage.trim(), className: "primary-button", style: { height: '100%', minWidth: 80 }, children: isLoading ? '...' : 'Send' }) })] }) })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: '600px' }, children: [_jsxs("div", { style: {
                                    padding: 16,
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 12,
                                }, children: [_jsx("h3", { style: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }, children: "Response Metadata" }), lastMetadata ? (_jsxs("div", { style: { fontSize: '13px', lineHeight: '1.6' }, children: [lastMetadata.model && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { children: "Model:" }), " ", lastMetadata.model] })), lastMetadata.latency && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { children: "Latency:" }), " ", lastMetadata.latency, "ms"] })), lastMetadata.tokens && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { children: "Tokens:" }), _jsxs("div", { style: { marginLeft: 12, marginTop: 4 }, children: [lastMetadata.tokens.prompt && _jsxs("div", { children: ["Prompt: ", lastMetadata.tokens.prompt] }), lastMetadata.tokens.completion && _jsxs("div", { children: ["Completion: ", lastMetadata.tokens.completion] }), lastMetadata.tokens.total && _jsxs("div", { children: ["Total: ", lastMetadata.tokens.total] })] })] })), lastMetadata.ragEnabled !== undefined && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { children: "RAG Enabled:" }), " ", lastMetadata.ragEnabled ? 'Yes' : 'No'] })), lastMetadata.contextUsed !== undefined && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { children: "RAG Context Used:" }), " ", lastMetadata.contextUsed ? 'Yes' : 'No'] })), lastMetadata.toolsUsed !== undefined && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { children: "Tools Used:" }), " ", lastMetadata.toolsUsed ? 'Yes' : 'No'] }))] })) : (_jsx("p", { style: { margin: 0, color: '#94a3b8', fontSize: '13px' }, children: "Send a message to see response metadata" }))] }), lastMetadata?.debug && (_jsxs("div", { style: {
                                    padding: 16,
                                    background: '#fef3c7',
                                    border: '1px solid #fbbf24',
                                    borderRadius: 12,
                                }, children: [_jsx("h3", { style: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#92400e' }, children: "\uD83D\uDD0D Debug Information" }), _jsxs("div", { style: { fontSize: '12px', lineHeight: '1.6', color: '#78350f' }, children: [lastMetadata.debug.systemPrompt && (_jsxs("details", { style: { marginBottom: 12 }, children: [_jsxs("summary", { style: { cursor: 'pointer', fontWeight: 600, marginBottom: 8 }, children: ["System Prompt (", lastMetadata.debug.systemPrompt.length, " chars)"] }), _jsx("pre", { style: {
                                                            background: '#fff',
                                                            padding: 8,
                                                            borderRadius: 6,
                                                            fontSize: '11px',
                                                            overflow: 'auto',
                                                            maxHeight: '200px',
                                                            whiteSpace: 'pre-wrap',
                                                            wordWrap: 'break-word',
                                                        }, children: lastMetadata.debug.systemPrompt.fullPrompt })] })), lastMetadata.debug.messages && (_jsxs("details", { style: { marginBottom: 12 }, children: [_jsxs("summary", { style: { cursor: 'pointer', fontWeight: 600, marginBottom: 8 }, children: ["Messages Array (", lastMetadata.debug.messages.messageCount, " messages)"] }), _jsx("div", { style: { background: '#fff', padding: 8, borderRadius: 6, fontSize: '11px' }, children: lastMetadata.debug.messages.fullMessages.map((msg, idx) => (_jsxs("div", { style: { marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }, children: [_jsxs("div", { style: { fontWeight: 600, color: '#1e40af' }, children: ["[", idx, "] ", msg.role] }), _jsx("pre", { style: {
                                                                        margin: '4px 0 0 0',
                                                                        whiteSpace: 'pre-wrap',
                                                                        wordWrap: 'break-word',
                                                                    }, children: msg.content })] }, idx))) })] })), lastMetadata.debug.ragContext && (_jsxs("details", { style: { marginBottom: 12 }, children: [_jsx("summary", { style: { cursor: 'pointer', fontWeight: 600, marginBottom: 8 }, children: "RAG Context" }), _jsx("pre", { style: {
                                                            background: '#fff',
                                                            padding: 8,
                                                            borderRadius: 6,
                                                            fontSize: '11px',
                                                            overflow: 'auto',
                                                            maxHeight: '200px',
                                                            whiteSpace: 'pre-wrap',
                                                            wordWrap: 'break-word',
                                                        }, children: JSON.stringify(lastMetadata.debug.ragContext, null, 2) })] })), lastMetadata.debug.mcpTools && (_jsxs("details", { style: { marginBottom: 12 }, children: [_jsxs("summary", { style: { cursor: 'pointer', fontWeight: 600, marginBottom: 8 }, children: ["MCP Tools (", lastMetadata.debug.mcpTools.toolCount, " tools)"] }), _jsx("pre", { style: {
                                                            background: '#fff',
                                                            padding: 8,
                                                            borderRadius: 6,
                                                            fontSize: '11px',
                                                            overflow: 'auto',
                                                            maxHeight: '200px',
                                                            whiteSpace: 'pre-wrap',
                                                            wordWrap: 'break-word',
                                                        }, children: JSON.stringify(lastMetadata.debug.mcpTools, null, 2) })] })), lastMetadata.debug.llmConfig && (_jsxs("details", { style: { marginBottom: 12 }, children: [_jsx("summary", { style: { cursor: 'pointer', fontWeight: 600, marginBottom: 8 }, children: "LLM Configuration" }), _jsx("pre", { style: {
                                                            background: '#fff',
                                                            padding: 8,
                                                            borderRadius: 6,
                                                            fontSize: '11px',
                                                            overflow: 'auto',
                                                            maxHeight: '200px',
                                                            whiteSpace: 'pre-wrap',
                                                            wordWrap: 'break-word',
                                                        }, children: JSON.stringify(lastMetadata.debug.llmConfig, null, 2) })] })), lastMetadata.debug.llmResponse && (_jsxs("details", { style: { marginBottom: 12 }, children: [_jsx("summary", { style: { cursor: 'pointer', fontWeight: 600, marginBottom: 8 }, children: "Raw LLM Response" }), _jsx("pre", { style: {
                                                            background: '#fff',
                                                            padding: 8,
                                                            borderRadius: 6,
                                                            fontSize: '11px',
                                                            overflow: 'auto',
                                                            maxHeight: '200px',
                                                            whiteSpace: 'pre-wrap',
                                                            wordWrap: 'break-word',
                                                        }, children: lastMetadata.debug.llmResponse.fullMessage })] })), lastMetadata.debug.finalResponse && (_jsxs("details", { style: { marginBottom: 12 }, children: [_jsx("summary", { style: { cursor: 'pointer', fontWeight: 600, marginBottom: 8 }, children: "Final Response to User" }), _jsx("pre", { style: {
                                                            background: '#fff',
                                                            padding: 8,
                                                            borderRadius: 6,
                                                            fontSize: '11px',
                                                            overflow: 'auto',
                                                            maxHeight: '200px',
                                                            whiteSpace: 'pre-wrap',
                                                            wordWrap: 'break-word',
                                                        }, children: lastMetadata.debug.finalResponse.fullMessage })] }))] })] })), _jsxs("div", { style: {
                                    padding: 16,
                                    background: '#fef3c7',
                                    border: '1px solid #fbbf24',
                                    borderRadius: 12,
                                    fontSize: '13px',
                                }, children: [_jsx("h3", { style: { margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#92400e' }, children: "\uD83D\uDCA1 Tips" }), _jsxs("ul", { style: { margin: 0, paddingLeft: 20, color: '#78350f' }, children: [_jsx("li", { children: "Each message continues the conversation" }), _jsx("li", { children: "Press Enter to send, Shift+Enter for new line" }), _jsx("li", { children: "Clear chat to start fresh" }), _jsx("li", { children: "Check metadata for token usage" })] })] }), _jsx("button", { onClick: handleClearChat, className: "secondary-button", disabled: messages.length === 0, children: "Clear Chat" })] })] })), !selectedTenantId && (_jsx("div", { style: {
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#94a3b8',
                }, children: _jsx("p", { style: { fontSize: '16px' }, children: "Select a tenant above to start testing" }) }))] }));
}
//# sourceMappingURL=TestingPage.js.map
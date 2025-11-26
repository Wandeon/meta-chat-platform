import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
export function WidgetPage() {
    const { tenantId } = useParams();
    const api = useApi();
    const queryClient = useQueryClient();
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    // Fetch tenant data
    const tenantQuery = useQuery({
        queryKey: ['tenant', tenantId],
        queryFn: () => api.get(`/api/tenants/${tenantId}`),
        enabled: !!tenantId,
    });
    const tenant = tenantQuery.data;
    const widgetConfigData = tenant?.widgetConfig || {};
    const [config, setConfig] = useState({
        primaryColor: widgetConfigData.primaryColor || '#4f46e5',
        backgroundColor: widgetConfigData.backgroundColor || '#ffffff',
        textColor: widgetConfigData.textColor || '#0f172a',
        borderRadius: widgetConfigData.borderRadius || 12,
        showBranding: widgetConfigData.showBranding !== false,
        brandName: widgetConfigData.brandName || tenant?.name || 'Meta Chat',
        agentName: widgetConfigData.agentName || 'Assistant',
        initialMessage: widgetConfigData.initialMessage || 'Hi! How can I help you today?',
        composerPlaceholder: widgetConfigData.composerPlaceholder || 'Type your message...',
        quickReplies: widgetConfigData.quickReplies || '',
    });
    // Update config when tenant data loads
    useEffect(() => {
        if (tenant) {
            const wc = tenant.widgetConfig || {};
            setConfig({
                primaryColor: wc.primaryColor || '#4f46e5',
                backgroundColor: wc.backgroundColor || '#ffffff',
                textColor: wc.textColor || '#0f172a',
                borderRadius: wc.borderRadius || 12,
                showBranding: wc.showBranding !== false,
                brandName: wc.brandName || tenant.name || 'Meta Chat',
                agentName: wc.agentName || 'Assistant',
                initialMessage: wc.initialMessage || 'Hi! How can I help you today?',
                composerPlaceholder: wc.composerPlaceholder || 'Type your message...',
                quickReplies: wc.quickReplies || '',
            });
        }
    }, [tenant]);
    // Save widget config mutation
    const saveConfig = useMutation({
        mutationFn: (widgetConfig) => api.patch(`/api/tenants/${tenantId}`, {
            widgetConfig: widgetConfig,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
    });
    const handleSave = () => {
        saveConfig.mutate(config);
    };
    const apiBaseUrl = window.location.origin;
    const widgetUrl = `${apiBaseUrl}/widget.js`;
    const installCode = `<!-- Meta Chat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${widgetUrl}';
    script.async = true;
    script.onload = function() {
      window.MetaChatWidget({
        configUrl: '${apiBaseUrl}/api/public/widget/config?tenantId=${tenantId}'
      });
    };
    document.head.appendChild(script);
  })();
</script>`;
    const copyToClipboard = () => {
        navigator.clipboard.writeText(installCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    if (tenantQuery.isLoading) {
        return (_jsx("div", { className: "p-8", children: _jsx("div", { className: "text-gray-500", children: "Loading widget configuration..." }) }));
    }
    if (tenantQuery.isError) {
        return (_jsx("div", { className: "p-8", children: _jsx("div", { className: "text-red-500", children: "Error loading widget configuration" }) }));
    }
    return (_jsxs("div", { className: "p-8 max-w-7xl mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Widget Installer" }), _jsx("p", { className: "text-gray-600 mt-2", children: "Customize your chat widget appearance and install it on your website" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-900", children: "Theme Settings" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Primary Color" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "color", value: config.primaryColor, onChange: (e) => setConfig({ ...config, primaryColor: e.target.value }), className: "h-10 w-20 rounded border border-gray-300 cursor-pointer" }), _jsx("input", { type: "text", value: config.primaryColor, onChange: (e) => setConfig({ ...config, primaryColor: e.target.value }), className: "flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm", placeholder: "#4f46e5" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Background Color" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "color", value: config.backgroundColor, onChange: (e) => setConfig({ ...config, backgroundColor: e.target.value }), className: "h-10 w-20 rounded border border-gray-300 cursor-pointer" }), _jsx("input", { type: "text", value: config.backgroundColor, onChange: (e) => setConfig({ ...config, backgroundColor: e.target.value }), className: "flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm", placeholder: "#ffffff" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Text Color" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "color", value: config.textColor, onChange: (e) => setConfig({ ...config, textColor: e.target.value }), className: "h-10 w-20 rounded border border-gray-300 cursor-pointer" }), _jsx("input", { type: "text", value: config.textColor, onChange: (e) => setConfig({ ...config, textColor: e.target.value }), className: "flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm", placeholder: "#0f172a" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Border Radius (px)" }), _jsx("input", { type: "range", min: "0", max: "24", value: config.borderRadius, onChange: (e) => setConfig({ ...config, borderRadius: parseInt(e.target.value) }), className: "w-full" }), _jsxs("div", { className: "text-sm text-gray-600 mt-1", children: [config.borderRadius, "px"] })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "showBranding", checked: config.showBranding, onChange: (e) => setConfig({ ...config, showBranding: e.target.checked }), className: "h-4 w-4 text-indigo-600 border-gray-300 rounded" }), _jsx("label", { htmlFor: "showBranding", className: "ml-2 block text-sm text-gray-700", children: "Show Meta Chat branding" })] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-900", children: "Content Settings" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Brand Name" }), _jsx("input", { type: "text", value: config.brandName, onChange: (e) => setConfig({ ...config, brandName: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md", placeholder: "Meta Chat" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Agent Name" }), _jsx("input", { type: "text", value: config.agentName, onChange: (e) => setConfig({ ...config, agentName: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md", placeholder: "Assistant" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Initial Message" }), _jsx("textarea", { value: config.initialMessage, onChange: (e) => setConfig({ ...config, initialMessage: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md", rows: 3, placeholder: "Hi! How can I help you today?" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Composer Placeholder" }), _jsx("input", { type: "text", value: config.composerPlaceholder, onChange: (e) => setConfig({ ...config, composerPlaceholder: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md", placeholder: "Type your message..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Quick Replies (separated by |)" }), _jsx("input", { type: "text", value: config.quickReplies, onChange: (e) => setConfig({ ...config, quickReplies: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-md", placeholder: "What can you do?|Connect me to sales" })] })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: handleSave, disabled: saveConfig.isPending, className: "px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50", children: saveConfig.isPending ? 'Saving...' : 'Save Configuration' }), saveSuccess && (_jsxs("div", { className: "flex items-center text-green-600 text-sm", children: [_jsx("svg", { className: "w-5 h-5 mr-1", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }), "Configuration saved!"] }))] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-900", children: "Live Preview" }), _jsx("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: _jsxs("div", { className: "mx-auto max-w-sm shadow-lg overflow-hidden", style: {
                                                backgroundColor: config.backgroundColor,
                                                borderRadius: `${config.borderRadius}px`,
                                            }, children: [_jsxs("div", { className: "p-4 text-white", style: { backgroundColor: config.primaryColor }, children: [_jsx("div", { className: "font-semibold", children: config.brandName }), _jsxs("div", { className: "text-sm opacity-90", children: ["Chat with ", config.agentName] })] }), _jsxs("div", { className: "p-4 space-y-3", style: { color: config.textColor }, children: [_jsx("div", { className: "flex justify-start", children: _jsx("div", { className: "max-w-[80%] px-3 py-2 text-sm", style: {
                                                                    backgroundColor: `${config.primaryColor}15`,
                                                                    borderRadius: `${config.borderRadius}px`,
                                                                }, children: config.initialMessage }) }), config.quickReplies && (_jsx("div", { className: "flex gap-2 flex-wrap", children: config.quickReplies.split('|').map((reply, idx) => (_jsx("button", { className: "px-3 py-1 text-xs rounded-full border", style: {
                                                                    borderColor: config.primaryColor,
                                                                    color: config.primaryColor,
                                                                    borderRadius: `${config.borderRadius * 2}px`,
                                                                }, children: reply.trim() }, idx))) }))] }), _jsx("div", { className: "p-4 border-t border-gray-200", children: _jsx("div", { className: "px-3 py-2 border border-gray-300 text-sm", style: {
                                                            borderRadius: `${config.borderRadius}px`,
                                                            color: config.textColor,
                                                        }, children: config.composerPlaceholder }) }), config.showBranding && (_jsx("div", { className: "px-4 pb-3 text-center text-xs text-gray-400", children: "Powered by Meta Chat" }))] }) })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-900", children: "Installation Code" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Copy and paste this code into your website HTML, just before the closing body tag:" }), _jsxs("div", { className: "relative", children: [_jsx("pre", { className: "bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto", children: _jsx("code", { children: installCode }) }), _jsx("button", { onClick: copyToClipboard, className: "absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded", children: copied ? 'Copied!' : 'Copy' })] })] }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-semibold text-blue-900 mb-2", children: "Installation Steps" }), _jsxs("ol", { className: "list-decimal list-inside space-y-1 text-sm text-blue-800", children: [_jsx("li", { children: "Configure your widget appearance above" }), _jsx("li", { children: "Click Save Configuration" }), _jsx("li", { children: "Copy the installation code" }), _jsx("li", { children: "Paste it into your website HTML" }), _jsx("li", { children: "The widget will appear automatically on your site" })] })] })] })] })] }));
}
//# sourceMappingURL=WidgetPage.js.map
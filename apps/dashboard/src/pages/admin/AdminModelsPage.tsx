import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../api/client';

interface OllamaModel {
  name: string;
}

interface OllamaModelsResponse {
  models: OllamaModel[];
}

export function AdminModelsPage() {
  const api = useApi();
  const [ollamaUrl, setOllamaUrl] = useState('http://100.64.0.1:11434');
  const [openaiKey, setOpenaiKey] = useState('');

  const ollamaModels = useQuery<OllamaModelsResponse>({
    queryKey: ['ollama-models', ollamaUrl],
    queryFn: () => api.get<OllamaModelsResponse>(`/api/ollama/models?baseUrl=${encodeURIComponent(ollamaUrl)}`),
    enabled: !!ollamaUrl,
  });

  return (
    <section className="dashboard-section">
      <h1>AI Models</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Configure AI model providers and endpoints.
      </p>

      <div className="settings-section" style={{ marginBottom: '24px' }}>
        <h2>Ollama (Self-Hosted)</h2>
        <div className="form-grid">
          <label>
            Ollama URL
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://gpu-01:11434"
            />
            <small style={{ color: '#64748b' }}>Tailscale IP of GPU-01</small>
          </label>
        </div>
        {ollamaModels.isLoading && <p style={{ marginTop: '16px' }}>Loading models...</p>}
        {ollamaModels.error && <p style={{ marginTop: '16px', color: '#dc2626' }}>Failed to fetch models</p>}
        {ollamaModels.data && (
          <div style={{ marginTop: '16px' }}>
            <strong>Available Models:</strong>
            <ul style={{ marginTop: '8px', listStyle: 'none', padding: 0 }}>
              {(ollamaModels.data.models || []).map((m: OllamaModel) => (
                <li key={m.name} style={{ padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                  {m.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>OpenAI</h2>
        <div className="form-grid">
          <label>
            API Key
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
            <small style={{ color: '#64748b' }}>Your OpenAI API key for GPT models</small>
          </label>
        </div>
        <button className="primary-button" style={{ marginTop: '16px' }} disabled>
          Save OpenAI Settings
        </button>
      </div>
    </section>
  );
}

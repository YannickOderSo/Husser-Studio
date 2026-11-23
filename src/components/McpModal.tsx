import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Play,
  Plug,
  Terminal,
  X,
} from 'lucide-react';
import { McpActivityEntry } from '../types/workbench';

interface McpModalProps {
  open: boolean;
  onClose: () => void;
  connected: boolean;
  logs: McpActivityEntry[];
}

export const McpModal: React.FC<McpModalProps> = ({ open, onClose, connected, logs }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  if (!open) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const streamableUrl = `${origin}/mcp`;
  const sseUrl = `${origin}/mcp/sse`;

  const clientConfig = JSON.stringify(
    {
      mcpServers: {
        'huss-workbench': {
          url: streamableUrl,
          ...(bearerToken ? { headers: { Authorization: `Bearer ${bearerToken}` } } : {}),
        },
      },
    },
    null,
    2
  );

  const curlSnippet = `curl -X POST ${streamableUrl} \\\n  -H "Content-Type: application/json"${
    bearerToken ? ` \\\n  -H "Authorization: Bearer ${bearerToken}"` : ''
  } \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const toggleTokenAuth = async () => {
    const next = !authEnabled;
    const res = await fetch('/api/mcp/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable: next }),
    });
    const data = await res.json();
    setAuthEnabled(Boolean(data.authEnabled));
    setBearerToken(data.token ?? null);
  };

  const runLiveMcpSelfTest = async () => {
    setTesting(true);
    setTestOutput(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
      const res = await fetch('/mcp', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/list' }),
      });
      const json = await res.json();
      const tools = json?.result?.tools ?? [];
      setTestOutput(
        `MCP OK · ${tools.length} tools ready: ${tools.map((t: { name: string }) => t.name).join(', ')}`
      );
    } catch (err) {
      setTestOutput(err instanceof Error ? err.message : 'MCP ping failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Direct MCP Connection"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
    >
      <div className="w-full max-w-3xl max-h-[88vh] bg-[#131720] border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Plug className={`w-4 h-4 ${connected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <h2 className="text-base font-bold text-white">Direct MCP Server Connection</h2>
              <p className="text-xs text-slate-400">
                Connect local AI agents (Claude Desktop, Cursor, Windsurf, CLI) directly to this live 3D workbench.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close MCP modal"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Live Status & Endpoints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#181E2B] border border-slate-800 rounded-md p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-400">
                  Streamable HTTP (Recommended)
                </span>
                <button
                  type="button"
                  onClick={() => copyText('http', streamableUrl)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
                >
                  {copiedKey === 'http' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <code className="block text-xs font-mono text-slate-100 bg-[#0C0F16] px-2.5 py-1.5 rounded border border-slate-800 truncate">
                {streamableUrl}
              </code>
            </div>

            <div className="bg-[#181E2B] border border-slate-800 rounded-md p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-sky-400">
                  Legacy SSE Transport
                </span>
                <button
                  type="button"
                  onClick={() => copyText('sse', sseUrl)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
                >
                  {copiedKey === 'sse' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <code className="block text-xs font-mono text-slate-100 bg-[#0C0F16] px-2.5 py-1.5 rounded border border-slate-800 truncate">
                {sseUrl}
              </code>
            </div>
          </div>

          {/* Auth Token Toggle & Live Self-Test */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#171D29] border border-slate-800 rounded-md p-3">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <span className="font-semibold text-slate-200">Optional Bearer Token</span>
                <span className="text-slate-400 ml-2">
                  {authEnabled ? 'Required on /mcp requests' : 'Open for local agents'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTokenAuth}
                className="px-3 py-1 rounded text-xs font-medium bg-[#10141D] border border-slate-700 text-slate-200 hover:border-slate-500"
              >
                {authEnabled ? 'Disable Token' : 'Generate Token'}
              </button>
              <button
                type="button"
                disabled={testing}
                onClick={runLiveMcpSelfTest}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
              >
                <Play className="w-3.5 h-3.5" />
                {testing ? 'Testing...' : 'Test tools/list'}
              </button>
            </div>
          </div>

          {testOutput && (
            <div
              data-testid="mcp-test-result"
              className="flex items-start gap-2 p-3 rounded-md bg-emerald-950/50 border border-emerald-700/70 text-xs font-mono text-emerald-200"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="break-all">{testOutput}</span>
            </div>
          )}

          {/* Client Config Snippet (Claude Desktop / Cursor / Windsurf) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Cursor / Claude Desktop / Local Agent Config (mcp.json)
              </span>
              <button
                type="button"
                onClick={() => copyText('cfg', clientConfig)}
                className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
              >
                {copiedKey === 'cfg' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'cfg' ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="bg-[#0B0E14] border border-slate-800 rounded-md p-3 text-xs font-mono text-slate-200 overflow-x-auto">
              {clientConfig}
            </pre>
          </div>

          {/* Quick CLI curl test */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                Quick Terminal Test
              </span>
              <button
                type="button"
                onClick={() => copyText('curl', curlSnippet)}
                className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
              >
                {copiedKey === 'curl' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy curl
              </button>
            </div>
            <pre className="bg-[#0B0E14] border border-slate-800 rounded-md p-3 text-[11px] font-mono text-sky-200 overflow-x-auto">
              {curlSnippet}
            </pre>
          </div>

          {/* Live Incoming Agent Tool Calls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Live MCP Agent Activity ({logs.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Live browser sync: {connected ? 'Connected' : 'Reconnecting...'}
              </span>
            </div>
            <div className="bg-[#0B0E14] border border-slate-800 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-800/70">
              {logs.length === 0 ? (
                <div className="p-3 text-xs text-slate-500">
                  No agent tool calls yet. Click &ldquo;Test tools/list&rdquo; or connect a local agent to /mcp.
                </div>
              ) : (
                logs.map((entry) => (
                  <div key={entry.id} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="font-mono text-amber-400">
                        {entry.toolName ?? entry.method}
                      </span>
                      <span className="text-slate-300 ml-2">{entry.summary}</span>
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-slate-500 shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

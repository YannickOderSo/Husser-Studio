import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  createInitialWorkbenchState,
  handleMcpJsonRpc,
  JsonRpcRequest,
  LiveWorkbenchState,
} from './src/engine/mcpProtocol';
import { estimatePeakBudget } from './src/engine/vfxMath';
import { McpActivityEntry } from './src/types/workbench';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

// Shared live workbench state synchronized between browser tabs and external local MCP agents
const liveState: LiveWorkbenchState = createInitialWorkbenchState();
const mcpLogs: McpActivityEntry[] = [];
const browserSseClients = new Set<Response>();
const mcpSseClients = new Map<string, Response>();
let mcpAuthToken: string | null = null;

function pushMcpLog(entry: McpActivityEntry) {
  mcpLogs.unshift(entry);
  if (mcpLogs.length > 40) mcpLogs.pop();
  broadcastToBrowsers('mcp_log', entry);
}

function broadcastToBrowsers(event: string, payload: unknown) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of browserSseClients) {
    try {
      res.write(data);
    } catch {
      browserSseClients.delete(res);
    }
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractJsonFromText(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

async function callGeminiJson(systemInstruction: string, prompt: string): Promise<unknown> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  return extractJsonFromText(text);
}

const STUD_VOXEL_SCHEMA_GUIDE = `
Game: "Feed The Hussers" (Roblox). Visual Style: "Stud Voxel" — chunky Lego-studded blocks, crisp black ink outlines, bold saturated colors, blocky cubes, rings, light pillars, and star/spark particles. NO realism, NO neon floor glow. Mobile budget target: < 150 simultaneous particles + cubes.

VFX Effect JSON format:
{
  "name": "Effect_Name",
  "duration": 2.2,
  "elements": [
    {
      "id": "unique_id",
      "name": "Element_Name",
      "type": "ParticleEmitter" | "Beam" | "Trail" | "CubeBurst" | "Ring" | "Pillar" | "Flash" | "CameraShake" | "SlowMo",
      "enabled": true,
      "start": 0.15,
      "duration": 1.2,
      "props": { ...exact properties for that type... }
    }
  ]
}

Exact props by type:
- ParticleEmitter: { TextureName, PreviewShape ("Circle"|"Star"|"Spark"|"Cube"|"Ring"), Color: [{t,r,g,b}], Size: [{t,value,envelope}], Transparency: [{t,value,envelope}], Lifetime: {min,max}, Rate, BurstCount, Speed: {min,max}, SpreadAngle: {x,y}, Acceleration: {x,y,z}, Drag, Rotation: {min,max}, RotSpeed: {min,max}, LightEmission (0..1), LightInfluence (0..1), ZOffset, Shape ("Box"|"Sphere"|"Disc"), ShapeRadius, EmissionDirection ("Top"|"Bottom"|"Front"|"Back"|"Left"|"Right"), LockedToPart (boolean), FlipbookLayout ("None"|"Grid2x2"|"Grid4x4"|"Grid8x8"), Offset: {x,y,z} }
- CubeBurst: { Count (integer), SpeedMin, SpeedMax, Gravity, SpinSpeed, SizeMin, SizeMax, Colors: ["#HEX",...], Lifetime, SpreadAngle, StudsOnTop: true, Offset: {x,y,z} }
- Ring: { StartRadius, EndRadius, Thickness, Curve ("Linear"|"QuadOut"|"CubicOut"|"BackOut"|"SineOut"), Color: [{t,r,g,b}], Transparency: [{t,value,envelope}], YOffset, TiltX, Segments: 32 }
- Pillar: { Radius, Height, Color: [{t,r,g,b}], Transparency: [{t,value,envelope}], PulseSpeed, TopFlare, Offset: {x,y,z} }
- Beam: { TextureName, Width0, Width1, Segments, CurveSize0, CurveSize1, Color: [{t,r,g,b}], Transparency: [{t,value,envelope}], TextureSpeed, LightEmission, Attachment0: {x,y,z}, Attachment1: {x,y,z} }
- Trail: { TextureName, Lifetime, MinLength, WidthScale: [{t,value,envelope}], Color: [{t,r,g,b}], Transparency: [{t,value,envelope}], LightEmission, OrbitRadius, OrbitSpeed, HeightOffset }
- Flash: { Color: "#HEX", MaxOpacity (0..0.8), FadeIn (0..1), FadeOut (0..1) }
- CameraShake: { Intensity (0.1..2.5), Frequency (8..40), Decay (0.5..5) }
- SlowMo: { TimeScale (0.1..0.8) }

Animation Clip JSON format:
{
  "name": "Anim_Name",
  "rig": "Husser" | "R15",
  "length": 1.2,
  "keys": [
    {
      "id": "k1",
      "t": 0.0,
      "ease": "Linear"|"Sine"|"Quad"|"Back"|"Elastic"|"Bounce",
      "dir": "In"|"Out"|"InOut",
      "pose": {
        "Body": { "rx": 0, "ry": 0, "rz": 0, "px": 0, "py": 0, "pz": 0, "sx": 1, "sy": 1, "sz": 1 }
      }
    }
  ]
}
Husser joints: Body, Head, Jaw, Tongue, ArmL, ArmR, LegL, LegR, Tail.
R15 joints: Root, Waist, Neck, RightShoulder, RightElbow, RightWrist, LeftShoulder, LeftElbow, LeftWrist, RightHip, RightKnee, LeftHip, LeftKnee.
`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // CORS for local MCP agents connecting from localhost tools / Claude / Cursor
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // --- Browser <-> Server Live MCP State Sync ---

  app.get('/api/mcp/status', (_req: Request, res: Response) => {
    res.json({
      connectedBrowsers: browserSseClients.size,
      connectedMcpSseAgents: mcpSseClients.size,
      revision: liveState.revision,
      authEnabled: Boolean(mcpAuthToken),
      logs: mcpLogs,
      budget: estimatePeakBudget(liveState.vfxEffect),
    });
  });

  app.post('/api/mcp/auth-token', (req: Request, res: Response) => {
    const enable = Boolean(req.body?.enable);
    if (enable) {
      mcpAuthToken = `huss_mcp_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
    } else {
      mcpAuthToken = null;
    }
    res.json({ authEnabled: Boolean(mcpAuthToken), token: mcpAuthToken });
  });

  app.get('/api/mcp/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    browserSseClients.add(res);
    res.write(`event: init\ndata: ${JSON.stringify({ revision: liveState.revision, logs: mcpLogs })}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      browserSseClients.delete(res);
    });
  });

  app.post('/api/mcp/sync', (req: Request, res: Response) => {
    const body = req.body as Partial<LiveWorkbenchState>;
    if (body.mode === 'vfx' || body.mode === 'animation') {
      liveState.mode = body.mode;
    }
    if (body.vfxEffect && typeof body.vfxEffect === 'object') {
      liveState.vfxEffect = body.vfxEffect;
    }
    if (body.animation && typeof body.animation === 'object') {
      liveState.animation = body.animation;
    }
    if (body.playback && typeof body.playback === 'object') {
      liveState.playback = { ...liveState.playback, ...body.playback };
    }
    res.json({ ok: true, revision: liveState.revision });
  });

  // --- Direct MCP Server Endpoints (Streamable HTTP + Legacy SSE) ---

  const checkMcpAuth = (req: Request, res: Response): boolean => {
    if (!mcpAuthToken) return true;
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token !== mcpAuthToken) {
      res.status(401).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32001, message: 'Unauthorized: invalid or missing MCP Bearer token.' },
      });
      return false;
    }
    return true;
  };

  // Streamable HTTP MCP Endpoint (POST /mcp)
  app.post('/mcp', (req: Request, res: Response) => {
    if (!checkMcpAuth(req, res)) return;
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Invalid JSON-RPC request body.' },
      });
      return;
    }

    const requests: JsonRpcRequest[] = Array.isArray(payload) ? payload : [payload];
    const responses = [];
    let anyMutated = false;

    for (const rpcReq of requests) {
      const result = handleMcpJsonRpc(rpcReq, liveState);
      if (result.logEntry) pushMcpLog(result.logEntry);
      if (result.mutated) anyMutated = true;
      if (result.response) responses.push(result.response);
    }

    if (anyMutated) {
      broadcastToBrowsers('state_update', liveState);
    }

    if (responses.length === 0) {
      res.status(202).end();
      return;
    }
    res.json(Array.isArray(payload) ? responses : responses[0]);
  });

  // GET /mcp metadata info for health checks & discovery
  app.get('/mcp', (_req: Request, res: Response) => {
    res.json({
      name: 'huss-vfx-animation-workbench',
      protocol: 'MCP Streamable HTTP (JSON-RPC 2.0)',
      endpoints: {
        streamableHttp: '/mcp',
        sse: '/mcp/sse',
        messages: '/mcp/messages',
      },
      status: 'ready',
    });
  });

  // Legacy SSE MCP Transport (GET /mcp/sse + POST /mcp/messages) for older local agents
  app.get('/mcp/sse', (req: Request, res: Response) => {
    if (!checkMcpAuth(req, res)) return;
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    mcpSseClients.set(sessionId, res);
    res.write(`event: endpoint\ndata: /mcp/messages?sessionId=${sessionId}\n\n`);

    pushMcpLog({
      id: `mcp_sse_${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: 'sse/connect',
      summary: `Local MCP agent connected via SSE (${sessionId})`,
      status: 'ok',
    });

    req.on('close', () => {
      mcpSseClients.delete(sessionId);
    });
  });

  app.post('/mcp/messages', (req: Request, res: Response) => {
    if (!checkMcpAuth(req, res)) return;
    const sessionId = String(req.query.sessionId ?? '');
    const client = mcpSseClients.get(sessionId);
    const result = handleMcpJsonRpc(req.body as JsonRpcRequest, liveState);
    if (result.logEntry) pushMcpLog(result.logEntry);
    if (result.mutated) {
      broadcastToBrowsers('state_update', liveState);
    }
    if (client && result.response) {
      client.write(`event: message\ndata: ${JSON.stringify(result.response)}\n\n`);
    }
    res.status(202).json(result.response ?? { ok: true });
  });

  // --- Gemini AI Assistant API Routes ---

  app.post('/api/gemini/describe', async (req: Request, res: Response) => {
    try {
      const prompt = String(req.body?.prompt ?? '').trim();
      const mode = req.body?.mode === 'animation' ? 'animation' : 'vfx';
      const rig = req.body?.rig === 'R15' ? 'R15' : 'Husser';

      if (!prompt) {
        res.status(400).json({ error: 'Please describe the VFX or Animation you want to generate.' });
        return;
      }

      const systemInstruction = `You are a senior Roblox Technical Artist & Animator for "Feed The Hussers".
${STUD_VOXEL_SCHEMA_GUIDE}
Return ONLY a valid JSON object matching:
${
  mode === 'vfx'
    ? `{ "summary": "short crisp explanation of the effect", "vfxEffect": <VFX Effect JSON with 3-6 punchy layered elements staying under 140 peak particles/cubes> }`
    : `{ "summary": "short crisp explanation of the animation", "animation": <Animation Clip JSON for rig="${rig}" with 4-6 expressive keyframes using anticipation, overshoot, and squash&stretch> }`
}`;

      const data = await callGeminiJson(
        systemInstruction,
        `Create a Stud Voxel ${mode === 'vfx' ? 'VFX effect' : `${rig} rig animation`} for: "${prompt}".`
      );
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate from Gemini.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/gemini/juicier', async (req: Request, res: Response) => {
    try {
      const mode = req.body?.mode === 'animation' ? 'animation' : 'vfx';
      const payload = mode === 'vfx' ? req.body?.vfxEffect : req.body?.animation;

      if (!payload) {
        res.status(400).json({ error: 'Missing active timeline payload to analyze.' });
        return;
      }

      const systemInstruction = `You are a Principal Roblox VFX & Animation Director auditing a "Feed The Hussers" timeline.
${STUD_VOXEL_SCHEMA_GUIDE}
Analyze the submitted ${mode.toUpperCase()} timeline against these 7 exact principles:
1. Anticipation
2. Overshoot
3. Squash & Stretch
4. Follow-through
5. Timing Contrast
6. Mobile Readability
7. Performance Budget

Return ONLY valid JSON with this exact schema:
{
  "summary": "2-sentence sharp artistic diagnosis.",
  "criteria": [
    { "name": "Anticipation", "score": 7, "note": "concise specific feedback" },
    { "name": "Overshoot", "score": 6, "note": "..." },
    { "name": "Squash & Stretch", "score": 8, "note": "..." },
    { "name": "Follow-through", "score": 6, "note": "..." },
    { "name": "Timing Contrast", "score": 7, "note": "..." },
    { "name": "Mobile Readability", "score": 8, "note": "..." },
    { "name": "Performance Budget", "score": 9, "note": "..." }
  ],
  "suggestions": [
    {
      "id": "sug_1",
      "title": "Actionable 4-8 word title (e.g., Add Pre-Chomp Anticipation Crouch)",
      "principle": "Anticipation" | "Overshoot" | "Squash & Stretch" | "Follow-through" | "Timing Contrast" | "Mobile Readability" | "Performance Budget",
      "impact": "High" | "Medium" | "Low",
      "rationale": "1-2 sentences explaining the exact change and why it feels juicier in Roblox.",
      "patch": {
        "mode": "${mode}",
        ${mode === 'vfx' ? '"vfxEffect": <COMPLETE updated VfxEffect JSON with this suggestion applied>' : '"animation": <COMPLETE updated AnimationClip JSON with this suggestion applied>'}
      }
    }
  ]
}
Provide 3 to 4 concrete, distinct, directly applicable suggestions. Keep VFX mobile peak under 150 where possible.`;

      const data = await callGeminiJson(
        systemInstruction,
        `Audit and make this ${mode} timeline juicier:\n${JSON.stringify(payload)}`
      );
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze timeline with Gemini.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/gemini/variants', async (req: Request, res: Response) => {
    try {
      const vfxEffect = req.body?.vfxEffect;
      if (!vfxEffect) {
        res.status(400).json({ error: 'Missing active VFX effect to generate rarity tiers.' });
        return;
      }

      const systemInstruction = `You are a Principal Roblox VFX Designer for "Feed The Hussers".
${STUD_VOXEL_SCHEMA_GUIDE}
Take the user's base VFX effect and generate exactly 5 escalating rarity tier variants in order:
1. "Rare" (accentHex "#3B82F6", clean crisp pop, budget ~45-75)
2. "Legend" (accentHex "#F59E0B", bolder golden stud cubes + ring, budget ~75-105)
3. "Mythic" (accentHex "#EC4899", dramatic pillar + double shockwave + trail/beam, budget ~100-130)
4. "Husstastic" (accentHex "#8B5CF6", multi-beat anticipation + slowmo hitstop + big voxel burst + camera shake, budget ~120-145)
5. "Impossible" (accentHex "#10B981", ultimate jaw-dropping multi-stage crescendo with Flash, SlowMo, Pillar, Beams, Rings, and stud fireworks — still crafted cleanly around 140-185 max!)

Return ONLY valid JSON:
{
  "variants": [
    {
      "tier": "Rare" | "Legend" | "Mythic" | "Husstastic" | "Impossible",
      "accentHex": "#HEX",
      "tagline": "short 6-10 word description of this tier's upgrade",
      "effect": <Complete VfxEffect JSON>
    }
  ]
}`;

      const data = (await callGeminiJson(
        systemInstruction,
        `Generate 5 escalating rarity tier variants from this base Stud Voxel VFX:\n${JSON.stringify(vfxEffect)}`
      )) as { variants?: Array<{ tier: string; accentHex: string; tagline: string; effect: LiveWorkbenchState['vfxEffect'] }> };

      const enriched = (data.variants ?? []).map((v) => ({
        ...v,
        estimatedPeak: v.effect ? estimatePeakBudget(v.effect).estimatedPeakTotal : 0,
      }));
      res.json({ variants: enriched });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate 5-tier variants.';
      res.status(500).json({ error: message });
    }
  });

  // --- Vite Dev Middleware / Production Static Serving ---
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'));
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Huss VFX & Animation Workbench listening on http://localhost:${PORT}`);
    console.log(`Direct MCP Streamable HTTP endpoint: http://localhost:${PORT}/mcp`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

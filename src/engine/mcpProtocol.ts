import { ANIMATION_PRESETS, createR15Preset, createVfxElement, VFX_PRESETS } from '../data/presets';
import {
  AnimationClip,
  AnimationKeyframe,
  McpActivityEntry,
  RigType,
  VfxEffect,
  VfxElement,
  VfxElementType,
  WorkbenchMode,
} from '../types/workbench';
import {
  estimatePeakBudget,
  exportAnimationToLuau,
  exportVfxToLuau,
  validateAndParseAnimationJson,
  validateAndParseVfxJson,
} from './vfxMath';

export interface LiveWorkbenchState {
  mode: WorkbenchMode;
  vfxEffect: VfxEffect;
  animation: AnimationClip;
  playback: {
    playing: boolean;
    time: number;
    loop: boolean;
    quarterSpeed: boolean;
  };
  revision: number;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export function createInitialWorkbenchState(): LiveWorkbenchState {
  return {
    mode: 'vfx',
    vfxEffect: structuredClone(VFX_PRESETS[0]),
    animation: structuredClone(ANIMATION_PRESETS['Huss Run']),
    playback: {
      playing: true,
      time: 0,
      loop: true,
      quarterSpeed: false,
    },
    revision: 1,
  };
}

export const MCP_SERVER_INFO = {
  name: 'huss-vfx-animation-workbench',
  version: '1.0.0',
  title: 'Huss VFX & Animation Workbench MCP Server',
};

export const MCP_TOOLS = [
  {
    name: 'get_workbench_state',
    description:
      'Read the live Huss VFX & Animation Workbench state including active mode, VFX timeline elements, Animation clip keyframes, playback state, and Mobile particle budget.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'set_mode',
    description: 'Switch the live 3D workbench between VFX Editor ("vfx") and Animation Editor ("animation").',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['vfx', 'animation'] },
      },
      required: ['mode'],
    },
  },
  {
    name: 'set_vfx_effect',
    description: 'Load or replace the complete VFX timeline effect in the live 3D viewport.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        duration: { type: 'number' },
        elements: { type: 'array', items: { type: 'object' } },
      },
      required: ['name', 'duration', 'elements'],
    },
  },
  {
    name: 'upsert_vfx_element',
    description:
      'Add a new VFX element (ParticleEmitter, Beam, Trail, CubeBurst, Ring, Pillar, Flash, CameraShake, SlowMo) or update an existing element by id/name.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: [
            'ParticleEmitter',
            'Beam',
            'Trail',
            'CubeBurst',
            'Ring',
            'Pillar',
            'Flash',
            'CameraShake',
            'SlowMo',
          ],
        },
        start: { type: 'number' },
        duration: { type: 'number' },
        enabled: { type: 'boolean' },
        props: { type: 'object' },
      },
      required: ['type'],
    },
  },
  {
    name: 'delete_vfx_element',
    description: 'Remove a VFX element from the timeline by id or name.',
    inputSchema: {
      type: 'object',
      properties: {
        idOrName: { type: 'string' },
      },
      required: ['idOrName'],
    },
  },
  {
    name: 'set_animation',
    description: 'Load or replace the complete Animation clip (Husser or R15 rig) with keyframes and poses.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        rig: { type: 'string', enum: ['Husser', 'R15'] },
        length: { type: 'number' },
        keys: { type: 'array', items: { type: 'object' } },
      },
      required: ['name', 'rig', 'length', 'keys'],
    },
  },
  {
    name: 'upsert_keyframe',
    description:
      'Insert or update an animation keyframe at time t with Roblox EasingStyle, EasingDirection, and per-joint {rx,ry,rz,px,py,pz,sx,sy,sz} transforms.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        t: { type: 'number' },
        ease: { type: 'string', enum: ['Linear', 'Sine', 'Quad', 'Back', 'Elastic', 'Bounce'] },
        dir: { type: 'string', enum: ['In', 'Out', 'InOut'] },
        pose: { type: 'object' },
      },
      required: ['t', 'pose'],
    },
  },
  {
    name: 'load_animation_preset',
    description: 'Load one of the built-in Feed The Hussers animation templates onto the active rig.',
    inputSchema: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['Huss Run', 'Idle Pant', 'Celebrate', 'Chomp', 'Startle'],
        },
        rig: { type: 'string', enum: ['Husser', 'R15'] },
      },
      required: ['preset'],
    },
  },
  {
    name: 'control_playback',
    description: 'Control live 3D playback: play/pause, scrub to time t, toggle loop, or toggle 1/4x slow-motion preview.',
    inputSchema: {
      type: 'object',
      properties: {
        playing: { type: 'boolean' },
        time: { type: 'number' },
        loop: { type: 'boolean' },
        quarterSpeed: { type: 'boolean' },
      },
    },
  },
  {
    name: 'export_luau',
    description: 'Compile and return the ready-to-paste Roblox Luau ModuleScript for the current VFX or Animation.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', enum: ['vfx', 'animation', 'active'] },
      },
    },
  },
  {
    name: 'get_mobile_budget',
    description: 'Analyze simultaneous particle and stud-cube count against the Feed The Hussers Mobile budget (< 150 green).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export const MCP_RESOURCES = [
  {
    uri: 'huss://workbench/state',
    name: 'Live Workbench State (JSON)',
    description: 'Current VFX effect, Animation clip, playback state, and Mobile budget metrics.',
    mimeType: 'application/json',
  },
  {
    uri: 'huss://workbench/vfx.luau',
    name: 'Active VFX ModuleScript (Luau)',
    description: 'Compiled Roblox Luau ModuleScript for the active VFX timeline.',
    mimeType: 'text/plain',
  },
  {
    uri: 'huss://workbench/animation.luau',
    name: 'Active Animation ModuleScript (Luau)',
    description: 'Compiled Roblox Luau ModuleScript for the active Animation clip.',
    mimeType: 'text/plain',
  },
];

export interface McpHandleResult {
  response: JsonRpcResponse | null;
  mutated: boolean;
  logEntry?: McpActivityEntry;
}

export function handleMcpJsonRpc(
  req: JsonRpcRequest,
  state: LiveWorkbenchState
): McpHandleResult {
  const id = req.id ?? null;
  const makeLog = (summary: string, status: 'ok' | 'error', toolName?: string): McpActivityEntry => ({
    id: `mcp_${Date.now().toString(36)}_${Math.floor(Math.random() * 999)}`,
    timestamp: new Date().toISOString(),
    method: req.method,
    toolName,
    summary,
    status,
  });

  if (req.method === 'notifications/initialized') {
    return { response: null, mutated: false };
  }

  if (req.method === 'initialize') {
    return {
      mutated: false,
      logEntry: makeLog('Client initialized MCP session', 'ok'),
      response: {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
          serverInfo: MCP_SERVER_INFO,
          instructions:
            'Connected to Huss VFX & Animation Workbench for Feed The Hussers. Use tools to inspect/edit Stud Voxel VFX timelines, animate Husser/R15 rigs, check Mobile <150 particle budgets, and export Roblox Luau ModuleScripts.',
        },
      },
    };
  }

  if (req.method === 'ping') {
    return {
      mutated: false,
      response: { jsonrpc: '2.0', id, result: {} },
    };
  }

  if (req.method === 'tools/list') {
    return {
      mutated: false,
      logEntry: makeLog(`Listed ${MCP_TOOLS.length} workbench tools`, 'ok'),
      response: {
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS },
      },
    };
  }

  if (req.method === 'resources/list') {
    return {
      mutated: false,
      logEntry: makeLog(`Listed ${MCP_RESOURCES.length} workbench resources`, 'ok'),
      response: {
        jsonrpc: '2.0',
        id,
        result: { resources: MCP_RESOURCES },
      },
    };
  }

  if (req.method === 'resources/read') {
    const uri = String(req.params?.uri ?? '');
    if (uri === 'huss://workbench/state') {
      return {
        mutated: false,
        logEntry: makeLog('Read resource huss://workbench/state', 'ok'),
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(
                  { ...state, budget: estimatePeakBudget(state.vfxEffect) },
                  null,
                  2
                ),
              },
            ],
          },
        },
      };
    }
    if (uri === 'huss://workbench/vfx.luau') {
      return {
        mutated: false,
        logEntry: makeLog('Read resource huss://workbench/vfx.luau', 'ok'),
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'text/plain', text: exportVfxToLuau(state.vfxEffect) }],
          },
        },
      };
    }
    if (uri === 'huss://workbench/animation.luau') {
      return {
        mutated: false,
        logEntry: makeLog('Read resource huss://workbench/animation.luau', 'ok'),
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'text/plain', text: exportAnimationToLuau(state.animation) }],
          },
        },
      };
    }
    return {
      mutated: false,
      logEntry: makeLog(`Unknown resource URI: ${uri}`, 'error'),
      response: {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Unknown resource URI: ${uri}` },
      },
    };
  }

  if (req.method === 'tools/call') {
    const toolName = String(req.params?.name ?? '');
    const args = (req.params?.arguments ?? {}) as Record<string, unknown>;

    const okText = (payload: unknown, summary: string, mutated = false): McpHandleResult => {
      if (mutated) state.revision += 1;
      return {
        mutated,
        logEntry: makeLog(summary, 'ok', toolName),
        response: {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
              },
            ],
            isError: false,
          },
        },
      };
    };

    const errText = (message: string): McpHandleResult => ({
      mutated: false,
      logEntry: makeLog(message, 'error', toolName),
      response: {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: message }],
          isError: true,
        },
      },
    });

    switch (toolName) {
      case 'get_workbench_state': {
        const budget = estimatePeakBudget(state.vfxEffect);
        return okText(
          {
            mode: state.mode,
            revision: state.revision,
            playback: state.playback,
            budget,
            vfxEffect: state.vfxEffect,
            animation: state.animation,
          },
          `Read state (${state.mode}, ${state.vfxEffect.elements.length} VFX elements, ${state.animation.keys.length} anim keys)`
        );
      }

      case 'set_mode': {
        const mode = args.mode;
        if (mode !== 'vfx' && mode !== 'animation') {
          return errText('Parameter "mode" must be "vfx" or "animation".');
        }
        state.mode = mode;
        return okText({ ok: true, mode }, `Switched workbench mode to ${mode}`, true);
      }

      case 'set_vfx_effect': {
        const parsed = validateAndParseVfxJson(JSON.stringify(args));
        if (!parsed.ok) {
          return errText(`Invalid VFX payload: ${parsed.error}`);
        }
        state.vfxEffect = parsed.data;
        state.mode = 'vfx';
        const budget = estimatePeakBudget(state.vfxEffect);
        return okText(
          { ok: true, name: state.vfxEffect.name, elementCount: state.vfxEffect.elements.length, budget },
          `Loaded VFX "${state.vfxEffect.name}" (${state.vfxEffect.elements.length} elements)`,
          true
        );
      }

      case 'upsert_vfx_element': {
        const type = String(args.type ?? '') as VfxElementType;
        const base = createVfxElement(type);
        if (!base) {
          return errText(`Unsupported VFX element type "${type}".`);
        }
        const existingIdx = state.vfxEffect.elements.findIndex(
          (e) => (args.id && e.id === args.id) || (args.name && e.name === args.name)
        );
        const mergedProps = {
          ...(existingIdx >= 0 ? state.vfxEffect.elements[existingIdx].props : base.props),
          ...((args.props as Record<string, unknown>) ?? {}),
        };
        const updated: VfxElement = {
          id: existingIdx >= 0 ? state.vfxEffect.elements[existingIdx].id : String(args.id || base.id),
          name: String(args.name ?? (existingIdx >= 0 ? state.vfxEffect.elements[existingIdx].name : base.name)),
          type,
          enabled: args.enabled !== undefined ? Boolean(args.enabled) : true,
          start: args.start !== undefined ? Math.max(0, Number(args.start)) : existingIdx >= 0 ? state.vfxEffect.elements[existingIdx].start : base.start,
          duration:
            args.duration !== undefined
              ? Math.max(0.05, Number(args.duration))
              : existingIdx >= 0
                ? state.vfxEffect.elements[existingIdx].duration
                : base.duration,
          props: mergedProps as VfxElement['props'],
        };

        if (existingIdx >= 0) {
          state.vfxEffect.elements[existingIdx] = updated;
        } else {
          state.vfxEffect.elements.push(updated);
        }
        const end = updated.start + updated.duration;
        if (end > state.vfxEffect.duration) {
          state.vfxEffect.duration = Math.ceil(end * 10) / 10;
        }
        state.mode = 'vfx';
        return okText(
          { ok: true, element: updated, budget: estimatePeakBudget(state.vfxEffect) },
          `${existingIdx >= 0 ? 'Updated' : 'Added'} ${updated.type} "${updated.name}"`,
          true
        );
      }

      case 'delete_vfx_element': {
        const target = String(args.idOrName ?? '');
        const before = state.vfxEffect.elements.length;
        state.vfxEffect.elements = state.vfxEffect.elements.filter(
          (e) => e.id !== target && e.name !== target
        );
        if (state.vfxEffect.elements.length === before) {
          return errText(`No VFX element matched "${target}".`);
        }
        return okText({ ok: true, remaining: state.vfxEffect.elements.length }, `Deleted VFX element "${target}"`, true);
      }

      case 'set_animation': {
        const parsed = validateAndParseAnimationJson(JSON.stringify(args));
        if (!parsed.ok) {
          return errText(`Invalid Animation payload: ${parsed.error}`);
        }
        state.animation = parsed.data;
        state.mode = 'animation';
        return okText(
          { ok: true, name: state.animation.name, rig: state.animation.rig, keys: state.animation.keys.length },
          `Loaded ${state.animation.rig} animation "${state.animation.name}" (${state.animation.keys.length} keys)`,
          true
        );
      }

      case 'upsert_keyframe': {
        const t = Math.max(0, Number(args.t ?? 0));
        const existingIdx = state.animation.keys.findIndex(
          (k) => (args.id && k.id === args.id) || Math.abs(k.t - t) < 0.02
        );
        const key: AnimationKeyframe = {
          id: existingIdx >= 0 ? state.animation.keys[existingIdx].id : String(args.id || `mcp_k_${Date.now()}`),
          t,
          ease: (args.ease as AnimationKeyframe['ease']) ?? (existingIdx >= 0 ? state.animation.keys[existingIdx].ease : 'Back'),
          dir: (args.dir as AnimationKeyframe['dir']) ?? (existingIdx >= 0 ? state.animation.keys[existingIdx].dir : 'Out'),
          pose: {
            ...(existingIdx >= 0 ? state.animation.keys[existingIdx].pose : {}),
            ...((args.pose as AnimationKeyframe['pose']) ?? {}),
          },
        };
        if (existingIdx >= 0) {
          state.animation.keys[existingIdx] = key;
        } else {
          state.animation.keys.push(key);
        }
        state.animation.keys.sort((a, b) => a.t - b.t);
        if (t > state.animation.length) {
          state.animation.length = Math.ceil(t * 10) / 10;
        }
        state.mode = 'animation';
        return okText({ ok: true, keyframe: key }, `Upserted keyframe at t=${t.toFixed(2)}s`, true);
      }

      case 'load_animation_preset': {
        const presetName = String(args.preset ?? 'Huss Run');
        const rig = (args.rig as RigType | undefined) ?? state.animation.rig;
        if (rig === 'R15') {
          state.animation = structuredClone(createR15Preset(presetName));
        } else {
          const found = ANIMATION_PRESETS[presetName];
          if (!found) {
            return errText(`Unknown preset "${presetName}". Available: ${Object.keys(ANIMATION_PRESETS).join(', ')}`);
          }
          state.animation = structuredClone(found);
        }
        state.mode = 'animation';
        return okText(
          { ok: true, name: state.animation.name, rig: state.animation.rig },
          `Loaded ${rig} preset "${presetName}"`,
          true
        );
      }

      case 'control_playback': {
        if (typeof args.playing === 'boolean') state.playback.playing = args.playing;
        if (typeof args.time === 'number' && Number.isFinite(args.time)) {
          state.playback.time = Math.max(0, args.time);
        }
        if (typeof args.loop === 'boolean') state.playback.loop = args.loop;
        if (typeof args.quarterSpeed === 'boolean') state.playback.quarterSpeed = args.quarterSpeed;
        return okText({ ok: true, playback: state.playback }, 'Updated playback controls', true);
      }

      case 'export_luau': {
        const target = String(args.target ?? 'active');
        const effective = target === 'active' ? state.mode : target;
        const luau =
          effective === 'animation'
            ? exportAnimationToLuau(state.animation)
            : exportVfxToLuau(state.vfxEffect);
        return okText(luau, `Exported ${effective} Luau ModuleScript (${luau.length} chars)`);
      }

      case 'get_mobile_budget': {
        const budget = estimatePeakBudget(state.vfxEffect);
        return okText(budget, `Mobile budget: ${budget.estimatedPeakTotal} peak (${budget.mobileStatus})`);
      }

      default:
        return {
          mutated: false,
          logEntry: makeLog(`Unknown tool "${toolName}"`, 'error', toolName),
          response: {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Unknown tool: ${toolName}` },
          },
        };
    }
  }

  return {
    mutated: false,
    logEntry: makeLog(`Method not found: ${req.method}`, 'error'),
    response: {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${req.method}` },
    },
  };
}

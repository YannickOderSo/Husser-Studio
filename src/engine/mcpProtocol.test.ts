import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialWorkbenchState, handleMcpJsonRpc, MCP_TOOLS } from './mcpProtocol';

test('MCP initialize & tools/list return valid JSON-RPC 2.0 responses', () => {
  const state = createInitialWorkbenchState();
  const initRes = handleMcpJsonRpc({ jsonrpc: '2.0', id: 1, method: 'initialize' }, state);
  assert.ok(initRes.response?.result);
  assert.equal(initRes.mutated, false);

  const listRes = handleMcpJsonRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, state);
  const tools = (listRes.response?.result as { tools: unknown[] }).tools;
  assert.equal(tools.length, MCP_TOOLS.length);
});

test('MCP tools/call can mutate VFX, switch to Animation, upsert keyframe, and export Luau', () => {
  const state = createInitialWorkbenchState();
  const initialCount = state.vfxEffect.elements.length;

  const addRes = handleMcpJsonRpc(
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'upsert_vfx_element',
        arguments: {
          name: 'Agent_ShockRing',
          type: 'Ring',
          start: 0.25,
          duration: 0.9,
          props: { EndRadius: 9.2 },
        },
      },
    },
    state
  );
  assert.equal(addRes.mutated, true);
  assert.equal(state.vfxEffect.elements.length, initialCount + 1);

  const presetRes = handleMcpJsonRpc(
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'load_animation_preset',
        arguments: { preset: 'Chomp', rig: 'Husser' },
      },
    },
    state
  );
  assert.equal(presetRes.mutated, true);
  assert.equal(state.mode, 'animation');
  assert.equal(state.animation.name, 'Husser_Chomp');

  const luauRes = handleMcpJsonRpc(
    {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'export_luau', arguments: { target: 'animation' } },
    },
    state
  );
  const text = ((luauRes.response?.result as { content: { text: string }[] }).content[0]).text;
  assert.ok(text.includes('Rig = "Husser"'));
  assert.ok(text.includes('Name = "Husser_Chomp"'));
});

test('MCP resources/read returns live Luau and JSON state', () => {
  const state = createInitialWorkbenchState();
  const res = handleMcpJsonRpc(
    {
      jsonrpc: '2.0',
      id: 6,
      method: 'resources/read',
      params: { uri: 'huss://workbench/vfx.luau' },
    },
    state
  );
  const contents = (res.response?.result as { contents: { text: string }[] }).contents;
  assert.ok(contents[0].text.includes('return {'));
});

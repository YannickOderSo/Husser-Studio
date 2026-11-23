import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMATION_PRESETS, VFX_PRESETS } from '../data/presets';
import {
  applySquashStretchValue,
  classifyMobileBudget,
  estimatePeakBudget,
  evaluateAnimationPose,
  evaluateColorSequence,
  evaluateEasing,
  evaluateNumberSequence,
  exportAnimationToLuau,
  exportVfxToLuau,
  validateAndParseAnimationJson,
  validateAndParseVfxJson,
} from './vfxMath';

test('ColorSequence interpolates unsorted keypoints accurately', () => {
  const seq = [
    { t: 1, r: 0, g: 0, b: 1 },
    { t: 0, r: 1, g: 0, b: 0 },
  ];
  const mid = evaluateColorSequence(seq, 0.5);
  assert.equal(mid.r, 0.5);
  assert.equal(mid.g, 0);
  assert.equal(mid.b, 0.5);
});

test('NumberSequence evaluates value plus envelope seed', () => {
  const seq = [
    { t: 0, value: 1.0, envelope: 0.2 },
    { t: 1, value: 3.0, envelope: 0.4 },
  ];
  assert.ok(Math.abs(evaluateNumberSequence(seq, 0.5, 0) - 2.0) < 1e-6);
  assert.ok(Math.abs(evaluateNumberSequence(seq, 0.5, 1) - 2.3) < 1e-6);
  assert.ok(Math.abs(evaluateNumberSequence(seq, 0.5, -1) - 1.7) < 1e-6);
});

test('Roblox Easing curves respect endpoints and BackOut overshoot', () => {
  assert.equal(evaluateEasing('Linear', 'Out', 0.4), 0.4);
  assert.equal(evaluateEasing('Quad', 'In', 0), 0);
  assert.equal(evaluateEasing('Quad', 'Out', 1), 1);
  // Back Out overshoots > 1 around t=0.6
  assert.ok(evaluateEasing('Back', 'Out', 0.6) > 1.0);
  assert.ok(Math.abs(evaluateEasing('Bounce', 'Out', 1) - 1) < 1e-6);
});

test('Volume-preserving Squash & Stretch preserves approximate volume', () => {
  const stretched = applySquashStretchValue(0.4);
  assert.ok(stretched.sy > 1.3);
  assert.ok(stretched.sx < 1);
  assert.ok(Math.abs(stretched.sx * stretched.sy * stretched.sz - 1) < 0.02);

  const squashed = applySquashStretchValue(-0.3);
  assert.ok(squashed.sy < 0.8);
  assert.ok(squashed.sx > 1);
});

test('Animation pose evaluator interpolates Husser joints smoothly', () => {
  const clip = ANIMATION_PRESETS['Chomp'];
  const poseAtPeak = evaluateAnimationPose(clip, 0.28);
  assert.ok(poseAtPeak.Jaw.rx > 60);
  const poseAtBite = evaluateAnimationPose(clip, 0.44);
  assert.ok(poseAtBite.Jaw.rx <= 0);
  assert.ok(poseAtBite.Body.pz > 0.5);
});

test('Mobile budget traffic light classifies <150 green, 150-299 amber, >=300 red', () => {
  assert.equal(classifyMobileBudget(149).status, 'green');
  assert.equal(classifyMobileBudget(150).status, 'amber');
  assert.equal(classifyMobileBudget(299).status, 'amber');
  assert.equal(classifyMobileBudget(300).status, 'red');

  const presetBudget = estimatePeakBudget(VFX_PRESETS[0]);
  assert.ok(presetBudget.estimatedPeakTotal > 0);
  assert.equal(presetBudget.mobileStatus, 'green');
});

test('VFX Luau export matches required Roblox ModuleScript structure', () => {
  const luau = exportVfxToLuau(VFX_PRESETS[0]);
  assert.ok(luau.includes('return {'));
  assert.ok(luau.includes('Name = "Huss_Chomp_Burst"'));
  assert.ok(luau.includes('Duration = 2.2'));
  assert.ok(luau.includes('Type = "ParticleEmitter"'));
  assert.ok(luau.includes('Type = "CubeBurst"'));
  assert.ok(luau.includes('envelope ='));
});

test('Animation Luau export matches required Roblox ModuleScript structure', () => {
  const luau = exportAnimationToLuau(ANIMATION_PRESETS['Huss Run']);
  assert.ok(luau.includes('return {'));
  assert.ok(luau.includes('Name = "Huss_Run"'));
  assert.ok(luau.includes('Rig = "Husser"'));
  assert.ok(luau.includes('Length = 0.8'));
  assert.ok(luau.includes('Ease = "Back"'));
  assert.ok(luau.includes('Jaw = { rx ='));
});

test('JSON import/export round-trips VFX and Animation cleanly and rejects invalid inputs', () => {
  const vfxParsed = validateAndParseVfxJson(JSON.stringify(VFX_PRESETS[0]));
  assert.equal(vfxParsed.ok, true);
  if (vfxParsed.ok) {
    assert.equal(vfxParsed.data.name, VFX_PRESETS[0].name);
    assert.equal(vfxParsed.data.elements.length, VFX_PRESETS[0].elements.length);
  }

  const badVfx = validateAndParseVfxJson(JSON.stringify({ name: '', duration: -1, elements: [] }));
  assert.equal(badVfx.ok, false);

  const animParsed = validateAndParseAnimationJson(JSON.stringify(ANIMATION_PRESETS['Celebrate']));
  assert.equal(animParsed.ok, true);
  if (animParsed.ok) {
    assert.equal(animParsed.data.rig, 'Husser');
    assert.equal(animParsed.data.keys.length, ANIMATION_PRESETS['Celebrate'].keys.length);
  }

  const badAnim = validateAndParseAnimationJson('{"name":"X","rig":"Unknown","length":1,"keys":[]}');
  assert.equal(badAnim.ok, false);
});

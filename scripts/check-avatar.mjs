import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readGlb(path) {
  const bytes = readFileSync(new URL(path, import.meta.url));
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  const jsonLength = bytes.readUInt32LE(12);
  return { bytes: bytes.length, json: JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength)) };
}

const source = readGlb("../public/avatar-lady.glb");
const optimized = readGlb("../public/avatar-lady-optimized.glb");
assert.ok(optimized.bytes < source.bytes * 0.4, "Avatar must stay below 40% of the original size");
const meshes = (asset) => asset.json.meshes.map(mesh => ({
  name: mesh.name,
  morphs: mesh.primitives.map(p => p.targets?.length ?? 0),
  targetNames: mesh.extras?.targetNames,
}));
assert.deepEqual(meshes(optimized), meshes(source), "Preserve named meshes and all facial targets");
for (const name of ["Head", "Neck", "Spine1", "LeftEye", "RightEye", "LeftArm", "RightArm", "LeftForeArm", "RightForeArm", "LeftHand", "RightHand"]) {
  assert.ok(optimized.json.nodes.some(node => node.name === name), `Missing animation bone: ${name}`);
}
assert.ok(optimized.json.extensionsUsed.includes("EXT_meshopt_compression"));
assert.ok(optimized.json.extensionsUsed.includes("EXT_texture_webp"));
console.log(`Avatar contract passed. ${source.bytes} → ${optimized.bytes} bytes; meshes, morph targets and animation bones retained.`);

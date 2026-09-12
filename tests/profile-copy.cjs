/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test harness for transpiled browser modules. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run the real browser-side tool dispatcher without a Gemini connection.
let storedProfile;
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => name.startsWith('.')
      ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name),
    window: {},
    localStorage: { getItem: () => storedProfile },
    performance,
  }, { filename: file });
  return exports;
}
const root = path.resolve(__dirname, '..');
const { dispatchToolCall } = load(path.join(root, 'lib/tools.ts'));
const { SAMPLE_PROFILE, EMPTY_PROFILE } = load(path.join(root, 'lib/profile.ts'));
let chip;
function provide(field_hint, text) {
  chip = undefined;
  const result = dispatchToolCall('provide_text', { field_hint, text }, {
    onProvideText: (item) => { chip = item; },
  });
  return result;
}

provide('AADHAAR NUMBER (आधार नंबर)', 'Aadhaar is available locally as a copy chip.');
assert.equal(chip.text, SAMPLE_PROFILE.aadhaar);
provide('आधार नंबर', '');
assert.equal(chip.text, SAMPLE_PROFILE.aadhaar);
for (const [field, key] of [['Mobile', 'mobile'], ['Full name', 'fullName'],
  ['Name (native script)', 'nameNative'], ['Email', 'email'], ['Address', 'address'],
  ['Gender', 'gender']]) {
  provide(field, 'model explanation');
  assert.equal(chip.text, SAMPLE_PROFILE[key]);
}
storedProfile = JSON.stringify({ ...EMPTY_PROFILE, aadhaar: '123456789012', mobile: '9876543210', age: '30', pan: 'TESTVALUE' });
for (const [field, value] of [['Aadhaar', '123456789012'], ['Mobile', '9876543210'], ['Age', '30'], ['PAN', 'TESTVALUE']]) {
  provide(field, 'incorrect generated value');
  assert.equal(chip.text, value);
}
provide('Complaint description', 'My supplied description');
assert.equal(chip.text, 'My supplied description');
provide('Father name', 'User supplied father');
assert.equal(chip.text, 'User supplied father');
provide('Mobile OTP', '');
assert.equal(chip, undefined);
storedProfile = JSON.stringify(EMPTY_PROFILE);
assert.equal(provide('Aadhaar', 'explanatory prose').shown, false);
assert.equal(chip, undefined);
console.log('Profile copy regression checks passed.');

storedProfile = undefined;
const field = { visible_text: 'Aadhaar', instruction: 'Copy into Aadhaar',
  target_kind: 'text_field', ymin: 100, xmin: 100, ymax: 200, xmax: 400 };
let highlighted = 0;
const ui = { onHighlight: () => highlighted++, onInstruction: () => {},
  onProvideText: (item) => { chip = item; }, checkRegion: () => 20 };
const success = dispatchToolCall('highlight_region', field, ui);
assert.equal(success.copy_shown, true);
assert.equal(chip.text, SAMPLE_PROFILE.aadhaar);
chip = undefined;
dispatchToolCall('highlight_region', field, { ...ui, checkRegion: () => 0 });
assert.equal(chip, undefined);
assert.equal(highlighted, 1);

const { JanSewakLive } = load(path.join(root, 'lib/live-client.ts'));
let captures = 0;
let response;
let texture = 0;
const client = new JanSewakLive({ ...ui, checkRegion: () => texture,
  onHighlightRetry: () => captures++, onTranscript: () => {} });
client.session = { sendToolResponse: (message) => { response = message.functionResponses[0].response; } };
const call = () => client.handleMessage({ toolCall: { functionCalls: [
  { id: 'highlight-test', name: 'highlight_region', args: field },
] } });
call();
assert.equal(response.retry, true);
call();
assert.equal(response.retry, true);
call();
assert.equal(response.retry, false);
assert.equal(captures, 2);
texture = 20;
call();
assert.equal(response.highlighted, true);
texture = 0;
call();
assert.equal(response.retry, true);
client.handleMessage({ serverContent: { inputTranscription: { text: 'Try the next field' } } });
call();
assert.equal(client.highlightFailures, 1);
console.log('Highlight copy and bounded retry checks passed.');

const { loadProfile, profileToPromptText, profileValueForField } = load(path.join(root, 'lib/profile.ts'));
storedProfile = JSON.stringify({ mobile: SAMPLE_PROFILE.mobile, email: SAMPLE_PROFILE.email,
  address: '42 Demo Nagar, Jaipur, Rajasthan - 302001' });
assert.equal(loadProfile().state, 'Bihar');
assert.equal(loadProfile().registrationNumber, SAMPLE_PROFILE.registrationNumber);
assert.match(loadProfile().address, /Patna, Bihar/);
storedProfile = JSON.stringify({ ...SAMPLE_PROFILE, state: 'Kerala', registrationNumber: 'USER-123' });
assert.equal(loadProfile().state, 'Kerala');
assert.equal(loadProfile().registrationNumber, 'USER-123');
assert.equal(profileValueForField('Registration number', loadProfile()), 'USER-123');
assert.match(profileToPromptText(loadProfile()), /Vault.*USER-123/);
storedProfile = undefined;
assert.equal(profileValueForField('State name', loadProfile()), 'Bihar');
chip = undefined;
const dropdown = { ...field, visible_text: 'State', target_kind: 'dropdown',
  instruction: 'राज्य के ड्रॉपडाउन में Bihar ढूँढकर क्लिक कीजिए।' };
const selection = dispatchToolCall('highlight_region', dropdown, ui);
assert.equal(selection.highlighted, true);
assert.equal(selection.copy_shown, false);
assert.equal(chip, undefined);
assert.match(selection.note, /Bihar/);
texture = 20;
client.handleMessage({ toolCall: { functionCalls: [{ id: 'state', name: 'highlight_region', args: dropdown }] } });
client.handleMessage({ toolCall: { functionCalls: [{ id: 'copy', name: 'provide_text', args: { field_hint: 'State', text: 'Bihar' } }] } });
assert.equal(response.shown, false);
assert.equal(chip, undefined);
client.handleMessage({ toolCall: { functionCalls: [{ id: 'vault', name: 'highlight_region',
  args: { ...field, visible_text: 'Registration number' } }] } });
assert.equal(response.copy_shown, true);
assert.equal(chip.text, SAMPLE_PROFILE.registrationNumber);
console.log('State migration, Vault and dropdown guidance checks passed.');

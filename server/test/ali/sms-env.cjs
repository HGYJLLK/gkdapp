const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const dotenv = require(process.env.DOTENV_PATH || 'dotenv');
const root = path.resolve(__dirname, '../..');
const file = path.join(root, 'src/utils/sms-env.ts');
const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2018, module: ts.ModuleKind.CommonJS } }).outputText;
const exports_ = {};
vm.runInNewContext(output, { exports: exports_, process: { env: {} }, __dirname: path.dirname(file), require: name => name === 'dotenv' ? dotenv : require(name) });
const { readSmsEnv } = exports_;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-env-'));
let count = 0;
function check(name, run) { run(); count++; console.log('PASS ' + name); }
try {
  const fixture = path.join(temp, '.env');
  const data = 'ALIYUN_ACCESS_KEY_ID=TEST_ID\nALIYUN_ACCESS_KEY_SECRET="TEST_SECRET"\nALIYUN_SMS_SIGN_NAME="测试签名" # comment\nALIYUN_SMS_TEMPLATE_CODE=SMS_123\n';
  fs.writeFileSync(fixture, data, { mode: 0o600 });
  check('local file parsing', () => assert.equal(readSmsEnv({ NODE_ENV: 'local' }, fixture).smsTemplateCode, 'SMS_123'));
  check('production does not auto-load file', () => { for (const NODE_ENV of ['prod','production','test']) assert.equal(readSmsEnv({ NODE_ENV }, fixture), null); });
  check('explicit file in production', () => assert.equal(readSmsEnv({ NODE_ENV: 'prod', SMS_ENV_FILE: fixture }).smsSignName, '测试签名'));
  check('missing default falls back', () => assert.equal(readSmsEnv({ NODE_ENV: 'local' }, path.join(temp, 'absent')), null));
  check('explicit missing file fails', () => assert.throws(() => readSmsEnv({ SMS_ENV_FILE: path.join(temp, 'absent') }), /读取失败/));
  check('process profile takes precedence', () => assert.equal(readSmsEnv({ ...dotenv.parse(data), ALIYUN_SMS_TEMPLATE_CODE: 'SMS_456', SMS_ENV_FILE: fixture }).smsTemplateCode, 'SMS_456'));
  check('partial process profile never mixes credentials', () => assert.throws(() => readSmsEnv({ ALIYUN_ACCESS_KEY_ID: 'TEST_ID', SMS_ENV_FILE: fixture }), /不完整/));
  fs.writeFileSync(fixture, 'ALIYUN_ACCESS_KEY_ID=TEST_ID');
  check('partial file fails', () => assert.throws(() => readSmsEnv({ SMS_ENV_FILE: fixture }), /不完整/));
  check('real local file loaded without exposing secrets', () => {
    const actual = readSmsEnv({ NODE_ENV: 'local' });
    const raw = dotenv.parse(fs.readFileSync(path.resolve(root, '../.env')));
    assert.equal(actual.accessKeyId, raw.ALIYUN_ACCESS_KEY_ID);
    assert.equal(actual.accessKeySecret, raw.ALIYUN_ACCESS_KEY_SECRET);
    assert.equal(actual.smsTemplateCode, 'SMS_298580469');
  });
  console.log(`TOTAL ${count}/9 passed; no network calls`);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }

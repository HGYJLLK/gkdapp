// Offline regression: no app bootstrap, database, Redis or network calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../..'));
let reply, failure, calls;
let envConfig = null;
const config = { accessKeyId: 'TEST_KEY', accessKeySecret: 'TEST_SECRET', smsSignName: '测试签名', smsTemplateCode: 'SMS_TEST' };
const decorator = () => () => {};
class Base { responseSuccess(msg, data) { return { code: 200, msg, data }; } }
class Core {
  constructor(options) { assert.equal(options.endpoint, 'https://dysmsapi.aliyuncs.com'); }
  async request(action, params, options) {
    calls.push({ action, params, options });
    if (failure) throw failure;
    return reply;
  }
}
function load(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const result = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2018, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } });
  assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const exports = {};
  vm.runInNewContext(result.outputText, { exports, console: { log() {} }, require(name) {
    if (name.includes('utils/sms-env')) return { readSmsEnv: () => envConfig };
    if (name === 'crypto') return require('node:crypto');
    if (name === '@alicloud/pop-core') return Core;
    if (name === '@midwayjs/decorator') return new Proxy({}, { get: () => decorator });
    if (name.includes('base.service')) return { BaseService: Base };
    if (name.includes('base.controller')) return { BaseController: Base };
    if (name.includes('default.error')) return { DefaultError: Error };
    if (name.includes('constant')) return { CONFIG_ALI: 'ali' };
    return {};
  } }, { filename: file });
  return exports;
}
const { AliSmsService } = load('src/service/ali/sms.service.ts');
const { SmsController } = load('src/controller/api/sms.controller.ts');
const service = new AliSmsService();
service.configService = { getConfig: async () => config };
const controller = new SmsController();
controller.smsService = service;
let writes;
service.getSendVerifyCodeCount = async () => ({ count: 0 });
service.setSendVerifyRecord = async code => { assert.match(code, /^\d{6}$/); writes++; };
service.addSendVerifyCodeCount = async () => { writes++; };
const scenarios = [
  ['accepted', { Code: 'OK', BizId: 'TEST_BIZ' }, null, false],
  ['business rejection', { Code: 'isv.SMS_SIGNATURE_ILLEGAL' }, null, true],
  ['transport rejection', null, new Error('TEST_SECRET'), true],
  ['empty response', null, null, true],
];
(async () => {
  let failed = 0;
  for (const [name, response, error, reject] of scenarios) {
    reply = response; failure = error; calls = []; writes = 0;
    try {
      let caught;
      try { await controller.getSmsCode({ mobileNumber: '13800000000' }); } catch (e) { caught = e; }
      assert.equal(Boolean(caught), reject, 'must reject failed send');
      assert.equal(writes, reject ? 0 : 2, 'failed send must not save code/count');
      assert.equal(calls[0].action, 'SendSms');
      assert.equal(calls[0].params.SignName, config.smsSignName);
      assert.equal(calls[0].params.TemplateCode, config.smsTemplateCode);
      assert.match(JSON.parse(calls[0].params.TemplateParam).code, /^\d{6}$/);
      if (caught) assert.ok(!caught.message.includes('TEST_SECRET'));
      console.log('PASS ' + name);
    } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); }
  }
  service.configService.getConfig = async () => null;
  calls = [];
  try { await assert.rejects(() => service.sendSmsVerifyCode('13800000000', '123456'), /请先配置/); assert.equal(calls.length, 0); console.log('PASS missing configuration'); }
  catch (e) { failed++; console.log('FAIL missing configuration: ' + e.message); }
  envConfig = config;
  service.configService.getConfig = async () => { throw new Error('Database must not be accessed for env profile'); };
  reply = { Code: 'OK' }; failure = null; calls = [];
  try { await service.sendSmsVerifyCode('13800000000', '123456'); assert.equal(calls.length, 1); console.log('PASS environment profile bypasses database'); }
  catch (e) { failed++; console.log('FAIL environment profile: ' + e.message); }
  console.log(`TOTAL ${6 - failed}/6 passed (mock transport; zero real SMS)`);
  process.exitCode = failed ? 1 : 0;
})();

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'dotenv';

const fields = {
  accessKeyId: 'ALIYUN_ACCESS_KEY_ID',
  accessKeySecret: 'ALIYUN_ACCESS_KEY_SECRET',
  smsSignName: 'ALIYUN_SMS_SIGN_NAME',
  smsTemplateCode: 'ALIYUN_SMS_TEMPLATE_CODE',
};

// Each source is a complete profile: never mix keys/accounts with database values.
export function readSmsEnv(
  env: NodeJS.ProcessEnv = process.env,
  defaultPath = resolve(__dirname, '../../../.env')
) {
  const fromProcess = Object.values(fields).some(key => Boolean(env[key]?.trim()));
  let source: { [key: string]: string } = env;
  if (!fromProcess) {
    const local = !env.NODE_ENV || ['local', 'dev', 'development', 'mac'].includes(env.NODE_ENV);
    const file = env.SMS_ENV_FILE || (local ? defaultPath : undefined);
    if (!file) return null;
    try {
      source = parse(readFileSync(file));
    } catch (error) {
      if (error.code === 'ENOENT' && !env.SMS_ENV_FILE) return null;
      throw new Error('短信环境配置文件读取失败，请检查 SMS_ENV_FILE 路径和权限');
    }
  }
  if (!Object.values(fields).some(key => Boolean(source[key]?.trim()))) return null;
  if (!Object.values(fields).every(key => Boolean(source[key]?.trim()))) {
    throw new Error('短信环境配置不完整，请填写 AccessKey ID、Secret、签名和模板 CODE');
  }
  return {
    accessKeyId: source[fields.accessKeyId].trim(),
    accessKeySecret: source[fields.accessKeySecret].trim(),
    smsSignName: source[fields.smsSignName].trim(),
    smsTemplateCode: source[fields.smsTemplateCode].trim(),
  };
}

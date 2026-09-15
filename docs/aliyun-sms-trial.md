# 阿里云短信试接

## 分支与范围
- 基线：4c5c7db69e64e6d75c39c823587bdab0bfe604cd。
- 只读查询 GitHub origin：只有 master；本地 claude/local-deployment-review-b545db 指向相同提交。
- 试接分支：codex/aliyun-sms-trial；未提交、推送、部署或发送真实短信。
- 保留此前手机号注册、微信手机号费用和品牌提交。

## 现有入口
小程序获取验证码 → POST /api/sms/code → AliSmsService → SendSms。
原实现将 SDK 异常 resolve，并且没有检查返回 Code，导致失败仍保存验证码并返回成功。
现在只有 Code=OK 才继续记录；OK 代表平台受理，不代表送达。
验证码改为 crypto.randomInt 生成固定六位数字。

## 配置与实测准备
短信配置读取已接通（仅短信模块，不影响微信、数据库或 OSS 配置）：
- 优先使用进程环境中完整的四项 ALIYUN_* 短信变量。
- 未设置上述变量时，本地模式自动读取项目根目录 `.env`；与启动工作目录无关。
- prod / production 默认不自动读文件，可通过 SMS_ENV_FILE 指定私有文件路径。
- 未设置环境短信配置时才回退管理后台；若只填一部分则报错，避免混用不同账号的密钥/签名。
- 当前根目录 `.env` 的四项配置已从 Claude 工作树复制，以后维护根目录这份；密钥文件被 Git 忽略，权限 600。
- 新增 dotenv 依赖，安装 server 依赖后生效。文件在发送请求时读取，进程环境变更需要重启。

配置字段（不要把 AccessKey 写入源码或提交）：
- accessKeyId / accessKeySecret：具备短信发送权限的服务端凭据。
- smsSignName：广州极创云构技术有限公司（以控制台实际审核通过名称为准，无需加括号）。
- smsTemplateCode：审核通过的 SMS_... 模板，变量必须为 ${code}。
已有表单还包含 OSS/STS 字段；保留已有值，本次不改配置存储结构。

用户粘贴表格显示三家运营商报备中，签名审核栏信息不足。报备中可能影响送达；0.00% 不足以判断发送失败，需结合发送总数与回执。
CreateSmsSign 是申请签名，不用于发送验证码，本次不重复申请。
待配置齐全，从本地测试客户端向自己的手机号手动触发一次；核对接口结果，并在阿里云控制台发送记录查看最终回执。不要循环发送或自动重试。
注意小程序现有 API 地址曾被提交改为生产域名；本地试验先检查地址，勿误触生产。

## 离线回归
安装项目依赖后，在 server 目录运行：
```sh
node test/ali/sms-trial.cjs
node test/ali/sms-env.cjs
```
若使用已有外部 TypeScript 安装，设置 TYPESCRIPT_PATH 指向其包目录。
用真实服务/控制器源码进行转译，隔离框架与 SDK、Redis；覆盖正常受理、业务失败、网络失败、空返回、配置缺失。测试不连接网络。
新增环境读取测试覆盖本地文件、进程优先、后台回退、缺项拒绝和生产隔离。
这不是全项目类型检查或端到端送达测试。当前工作区未安装服务端依赖。
原有验证码计数、缓存隔离、消费机制及并发限流未在本次小范围试接中重构，正式放量前需单独检查。

## 官方资料
- https://help.aliyun.com/zh/sms/developer-reference/api-dysmsapi-2017-05-25-createsmssign
- https://help.aliyun.com/zh/sms/user-guide/sms-signature-faq
- https://help.aliyun.com/zh/sms/user-guide/message-delivery-faq

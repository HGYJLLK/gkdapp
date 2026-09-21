/**
 * 清理 users 表里被误存成本地临时文件路径的 avatarUrl 历史脏数据
 * (491dd01 修复前，"首页设置头像"入口会把 wxfile://.../tempFilePath
 *  或开发者工具本地映射路径 http://127.0.0.1:xxxxx/__tmp__/xxx.jpeg
 *  直接落库，而不是先上传拿到远程 OSS/七牛 URL)。
 *
 * 用法（在 Mac mini 上，server/ 目录下）：
 *   node scripts/cleanup-stale-avatar-url.js            // 只打印会受影响的行，不修改
 *   node scripts/cleanup-stale-avatar-url.js --apply    // 真正执行清空
 *
 * 数据库连接信息通过环境变量传入，默认值取自 config.env.ts.bak 里的开发库配置，
 * 生产环境请显式传入，例如：
 *   DB_HOST=xxx DB_PORT=3306 DB_USER=xxx DB_PASSWORD=xxx DB_NAME=xxx \
 *     node scripts/cleanup-stale-avatar-url.js --apply
 */
const mysql = require('mysql2/promise');

const APPLY = process.argv.includes('--apply');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'ddrunv2-free',
  charset: 'utf8mb4',
};

// 真正的 OSS/七牛 URL 一定以 http(s):// 开头，且不会包含本地回环地址或
// 微信临时文件协议；命中下面任一条件即视为脏数据。
const STALE_AVATAR_WHERE = `
  avatarUrl IS NOT NULL
  AND avatarUrl != ''
  AND (
    avatarUrl NOT LIKE 'http://%'
    AND avatarUrl NOT LIKE 'https://%'
    OR avatarUrl LIKE '%127.0.0.1%'
    OR avatarUrl LIKE '%__tmp__%'
    OR avatarUrl LIKE 'wxfile://%'
  )
`;

async function main() {
  const conn = await mysql.createConnection(config);
  try {
    const [rows] = await conn.execute(
      `SELECT id, userNo, nickName, avatarUrl FROM users WHERE ${STALE_AVATAR_WHERE}`
    );

    if (rows.length === 0) {
      console.log('没有发现脏数据，avatarUrl 字段都是正常的远程 URL。');
      return;
    }

    console.log(`发现 ${rows.length} 条脏数据：`);
    rows.forEach((row) => {
      console.log(`  id=${row.id} userNo=${row.userNo} nickName=${row.nickName} avatarUrl=${row.avatarUrl}`);
    });

    if (!APPLY) {
      console.log('\n以上是预览（dry-run），未修改数据库。确认无误后加 --apply 参数重新执行。');
      return;
    }

    const [result] = await conn.execute(
      `UPDATE users SET avatarUrl = NULL WHERE ${STALE_AVATAR_WHERE}`
    );
    console.log(`\n已清空 ${result.affectedRows} 条记录的 avatarUrl。`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('执行失败:', err);
  process.exit(1);
});

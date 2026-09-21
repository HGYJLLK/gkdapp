/**
 * 只读排查：已取消(status=-2)、确实付过款(payType=wxpay 且有 payTime)、
 * 但 refundStatus 仍为 0（微信退款回调没打过来 / 没退成功）的历史订单。
 * 不做任何写操作。
 *
 * 用法（在 Mac mini 上，server/ 目录下）：
 *   DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=ddapp DB_PASSWORD=xxx DB_NAME=ddrunv2-free \
 *     node scripts/check-unrefunded-cancelled-orders.js
 */
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'ddrunv2-free',
  charset: 'utf8mb4',
};

async function main() {
  const conn = await mysql.createConnection(config);
  try {
    const [rows] = await conn.execute(`
      SELECT orderNo, userNo, status, payType, payTime, totalPrice,
             refundStatus, refundAmount, refundTime, cancelTime, cancelBy, cancelReason
      FROM school_orders
      WHERE status = -2
        AND payType = 'wxpay'
        AND payTime IS NOT NULL
        AND refundStatus = 0
      ORDER BY cancelTime DESC
    `);

    if (rows.length === 0) {
      console.log('没有发现"已取消但未退款"的历史订单。');
      return;
    }

    console.log(`发现 ${rows.length} 条已取消但退款状态仍为0的订单：`);
    rows.forEach((row) => {
      console.log(
        `  orderNo=${row.orderNo} userNo=${row.userNo} totalPrice=${row.totalPrice} payTime=${row.payTime} cancelTime=${row.cancelTime} cancelBy=${row.cancelBy} cancelReason=${row.cancelReason}`
      );
    });
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('查询失败:', err);
  process.exit(1);
});

import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

// Neon 数据库配置
const neonConnectionString = 'postgresql://neondb_owner:npg_SY1PHWJKaRo8@ep-bitter-term-aovgl52h-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

console.log('Neon 数据库初始化');

// 创建 Neon SQL 标签模板客户端（用于静态SQL）
export const sql = neon(neonConnectionString);

// 创建连接池（用于动态SQL查询）
const pool = new Pool({ connectionString: neonConnectionString });

// 动态SQL查询 - 用于需要拼接SQL的场景
export async function dynamicQuery(queryText: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(queryText, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// 测试连接
export async function testConnection() {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM facilities`;
    console.log('Neon 连接测试成功:', result);
    return { data: result, error: null };
  } catch (error) {
    console.error('Neon 连接测试失败:', error);
    return { data: null, error };
  }
}

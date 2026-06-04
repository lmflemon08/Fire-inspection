import { neon } from '@neondatabase/serverless';

// Neon 数据库连接 - 优先使用环境变量
declare const import_meta_env: Record<string, string>;
const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env 
  ? (import.meta as any).env.VITE_NEON_DATABASE_URL 
  : undefined;

const neonConnectionString = envUrl 
  || 'postgresql://neondb_owner:npg_SY1PHWJKaRo8@ep-bitter-term-aovgl52h-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

console.log('Neon 数据库初始化', neonConnectionString ? '连接字符串已配置' : '缺少连接字符串');

// 创建 Neon SQL 标签模板客户端，禁用浏览器警告
export const sql = neon(neonConnectionString, {
  disableWarningInBrowsers: true,
});

// SQL 参数转义
function escapeParam(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  // 字符串 - 单引号转义
  return "'" + String(value).replace(/'/g, "''") + "'";
}

// 动态SQL查询 - 在浏览器端使用 sql.unsafe
export async function dynamicQuery(queryText: string, params: any[] = []): Promise<any[]> {
  // 将 $1, $2 等参数占位符替换为实际值
  let finalQuery = queryText;
  params.forEach((param, i) => {
    const placeholder = '$' + (i + 1);
    finalQuery = finalQuery.replace(placeholder, escapeParam(param));
  });
  
  // 使用 sql.unsafe 执行动态SQL
  const result = await (sql as any).unsafe(finalQuery);
  return Array.isArray(result) ? result : [];
}

// 测试连接
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('Neon 数据库连接成功:', result);
    return true;
  } catch (error) {
    console.error('Neon 数据库连接失败:', error);
    return false;
  }
}

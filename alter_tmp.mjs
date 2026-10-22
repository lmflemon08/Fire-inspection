import { neon } from '@neondatabase/serverless';

const conn = 'postgresql://neondb_owner:npg_SY1PHWJKaRo8@ep-bitter-term-aovgl52h.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(conn);

async function main() {
  const result = await sql.transaction([
    sql`ALTER TABLE inspection_records ADD COLUMN IF NOT EXISTS issue_status TEXT DEFAULT 'pending'`,
    sql`ALTER TABLE inspection_records ADD COLUMN IF NOT EXISTS resolution_notes TEXT`,
    sql`ALTER TABLE inspection_records ADD COLUMN IF NOT EXISTS resolved_date DATE`,
    sql`UPDATE inspection_records SET issue_status = 'pending' WHERE status = 'abnormal'`,
    sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'inspection_records' ORDER BY ordinal_position`,
  ]);

  const cols = result[4];
  console.log('columns in tx:', cols.map(c => c.column_name).join(', '));

  // 清理临时测试列
  await sql`ALTER TABLE inspection_records DROP COLUMN IF EXISTS issue_status_test`;
  console.log('dropped test column');

  const rows = await sql`SELECT issue_status, COUNT(*) as cnt FROM inspection_records WHERE status = 'abnormal' GROUP BY issue_status`;
  console.log('abnormal issue_status:', JSON.stringify(rows));
}

main().catch(e => { console.error('TX error:', e.message); process.exit(1); });

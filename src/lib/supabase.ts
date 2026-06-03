import { createClient } from '@supabase/supabase-js';

// Supabase 配置 - 直接配置，无需环境变量（anon key 是公开密钥，安全）
const supabaseUrl = 'https://aouclrkkjaedccdwryzz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvdWNscmtramFlZGNjZHdyeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5Nzc2OTcsImV4cCI6MjA4OTU1MzY5N30.RAqSEjUgJ0F0HdQDktXYgtdtZ5XVFMAJHhC3t_VPisc';

console.log('Supabase 初始化:', supabaseUrl);

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试连接
export async function testConnection() {
  const { data, error } = await supabase.from('facilities').select('count');
  console.log('测试连接结果:', { data, error });
  return { data, error };
}

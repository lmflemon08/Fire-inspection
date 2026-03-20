import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aouclrkkjaedccdwryzz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (前20字符):', supabaseAnonKey?.substring(0, 20));

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试连接
export async function testConnection() {
  const { data, error } = await supabase.from('facilities').select('count');
  console.log('测试连接结果:', { data, error });
  return { data, error };
}

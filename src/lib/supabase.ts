import { createClient } from '@supabase/supabase-js';

// Supabase 配置
// 优先使用环境变量，否则使用默认值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aouclrkkjaedccdwryzz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_YHtIIqhCis7ro9fWD51ckQ_G4SefFX8';

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

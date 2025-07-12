import { supabase } from '../lib/supabase';

export const checkUserRole = async (email: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, role, created_at')
    .eq('email', email)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

export const updateUserRole = async (email: string, role: 'user' | 'admin' | 'super_admin') => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase
    .from('user_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('email', email);
  
  if (error) throw error;
};

export const getAllUsersWithRoles = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}; 
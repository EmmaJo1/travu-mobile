import { supabase } from '@/lib/supabase';

export function getCurrentSession() {
  return supabase.auth.getSession();
}

export function getCurrentUser() {
  return supabase.auth.getUser();
}

export function signOut() {
  return supabase.auth.signOut();
}

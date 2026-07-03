import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

export function getLatestPhotoImportJob(userId: string) {
  return supabase
    .from('photo_import_jobs')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export function createPhotoImportJob(input: TablesInsert<'photo_import_jobs'>) {
  return supabase
    .from('photo_import_jobs')
    .insert(input)
    .select()
    .single();
}

export function updatePhotoImportJob(
  jobId: string,
  patch: TablesUpdate<'photo_import_jobs'>,
) {
  return supabase
    .from('photo_import_jobs')
    .update(patch)
    .eq('id', jobId)
    .select()
    .single();
}

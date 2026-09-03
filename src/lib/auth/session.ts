import crypto from 'node:crypto';
import { supabaseAdmin } from './db';

export const SESSION_COOKIE_NAME = 'journalku_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface LocalUser {
  id: string;
  sso_user_id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: number; // 1 = user, 2 = admin, 3 = editor
  created_at: string;
  updated_at: string;
}

/**
 * Hash raw session token using SHA-256
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Map role string dari Web B ("admin", "editor", "user", atau angka string "2", "3", "1") ke integer Database B
 */
export function mapRoleStringToInt(roleStr: string | number): number {
  if (typeof roleStr === 'number') return roleStr;
  const lower = String(roleStr || '').trim().toLowerCase();
  if (lower === '2' || lower === 'admin' || lower === 'administrator') return 2;
  if (lower === '3' || lower === 'editor') return 3;
  if (lower === '1' || lower === 'user') return 1;
  const parsed = parseInt(lower, 10);
  if (!isNaN(parsed) && [1, 2, 3].includes(parsed)) return parsed;
  return 1; // default user
}

/**
 * Map integer role Database B ke string
 */
export function mapRoleIntToString(roleInt: number | string): string {
  const num = typeof roleInt === 'number' ? roleInt : parseInt(String(roleInt), 10);
  if (num === 2) return 'admin';
  if (num === 3) return 'editor';
  return 'user';
}

/**
 * Upsert user dari Web B ke tabel public.users Database B berdasarkan sso_user_id
 */
export async function upsertSsoUser(payloadUser: {
  id: string;
  email: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  role?: string | number;
}): Promise<LocalUser> {
  const roleInt = mapRoleStringToInt(payloadUser.role || 'user');
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        sso_user_id: payloadUser.id,
        email: payloadUser.email,
        display_name: payloadUser.display_name || payloadUser.email.split('@')[0],
        username: payloadUser.username || payloadUser.email.split('@')[0],
        avatar_url: payloadUser.avatar_url || null,
        role: roleInt,
        updated_at: nowIso,
      },
      {
        onConflict: 'sso_user_id',
      }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert user in Database B: ${error?.message || 'Unknown error'}`);
  }

  return data as LocalUser;
}

/**
 * Buat session baru di tabel public.sessions (Database B)
 * Menyimpan hash token dan mengembalikan raw token untuk disimpan di HttpOnly cookie
 */
export async function createLocalSession(userId: string): Promise<string> {
  // 32-byte cryptographically secure random token (256 bits)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const { error } = await supabaseAdmin
    .from('sessions')
    .insert([
      {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      },
    ]);

  if (error) {
    throw new Error(`Failed to create session in Database B: ${error.message}`);
  }

  return rawToken;
}

/**
 * Validasi session dari raw token cookie
 */
export async function validateSessionToken(rawToken: string): Promise<LocalUser | null> {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const tokenHash = hashToken(rawToken);
  const nowIso = new Date().toISOString();

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('id, user_id, expires_at')
    .eq('token_hash', tokenHash)
    .gt('expires_at', nowIso)
    .maybeSingle();

  if (sessionError || !session) {
    return null;
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', session.user_id)
    .maybeSingle();

  if (userError || !user) {
    return null;
  }

  return user as LocalUser;
}

/**
 * Hapus session token saat logout
 */
export async function destroySession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('token_hash', tokenHash);
}

/**
 * Ambil seluruh session aktif milik pengguna
 */
export async function getUserSessions(userId: string, currentTokenRaw?: string) {
  const currentHash = currentTokenRaw ? hashToken(currentTokenRaw) : null;
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('id, user_id, token_hash, expires_at, created_at')
    .eq('user_id', userId)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((s: any) => ({
    id: s.id,
    user_id: s.user_id,
    expires_at: s.expires_at,
    created_at: s.created_at,
    is_current: currentHash ? s.token_hash === currentHash : false,
  }));
}

/**
 * Hapus sesi tertentu milik pengguna berdasarkan session id
 */
export async function deleteUserSession(sessionId: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);
  return !error;
}

/**
 * Hapus seluruh sesi lain milik pengguna kecuali sesi yang sedang aktif saat ini
 */
export async function deleteAllOtherSessions(userId: string, currentTokenRaw: string): Promise<boolean> {
  const currentHash = hashToken(currentTokenRaw);
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('user_id', userId)
    .neq('token_hash', currentHash);
  return !error;
}

/**
 * SupabaseService - Singleton wrapper for Supabase client, auth, and DB helpers.
 *
 * Configure by setting NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * in .env.local.  The service degrades gracefully when keys are absent (offline mode).
 */
import { createClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const ONLINE = Boolean(SUPABASE_URL && SUPABASE_ANON);

// ── Client (null when offline) ────────────────────────────────────────────────
let _client = null;
export function getClient() {
  if (!ONLINE) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return _client;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

/** Register new user with email + password + username */
export async function signUp(email, password, username) {
  const sb = getClient();
  if (!sb) return { error: { message: 'Offline mode — configure Supabase env vars.' } };

  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { username } },
  });
  if (error || !data.user) return { error };

  // Insert player row (ignore conflict — trigger may have done it)
  await sb.from('players').upsert({
    id: data.user.id,
    username,
    hp: 100,
    x: 384, // tile 12 * 32
    y: 384,
  }, { onConflict: 'id' });

  return { data };
}

/** Login with email + password */
export async function signIn(email, password) {
  const sb = getClient();
  if (!sb) return { error: { message: 'Offline mode — configure Supabase env vars.' } };
  return sb.auth.signInWithPassword({ email, password });
}

/** Logout current user */
export async function signOut() {
  const sb = getClient();
  if (!sb) return;
  return sb.auth.signOut();
}

/** Get current session (null if not logged in) */
export async function getSession() {
  const sb = getClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Subscribe to auth state changes */
export function onAuthChange(callback) {
  const sb = getClient();
  if (!sb) return () => {};
  const { data: { subscription } } = sb.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// ── Player data helpers ───────────────────────────────────────────────────────

/** Load player row from DB */
export async function loadPlayer(userId) {
  const sb = getClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from('players')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) { console.warn('loadPlayer error:', error.message); return null; }
  return data;
}

/** Save player position and HP (debounce this in caller) */
export async function savePlayerState(userId, { x, y, hp, username }) {
  const sb = getClient();
  if (!sb) return;
  await sb.from('players').upsert({
    id: userId, x, y, hp,
    ...(username ? { username } : {}),
  }, { onConflict: 'id' });
}

/** Load inventory rows for a player */
export async function loadInventory(playerId) {
  const sb = getClient();
  if (!sb) return [];
  const { data } = await sb
    .from('inventories')
    .select('*')
    .eq('player_id', playerId);
  return data || [];
}

/** Replace all inventory rows for a player */
export async function saveInventory(playerId, slots) {
  const sb = getClient();
  if (!sb) return;
  // Delete existing rows then insert new ones
  await sb.from('inventories').delete().eq('player_id', playerId);
  const rows = slots
    .filter(Boolean)
    .map(slot => ({ player_id: playerId, item_id: slot.itemId, qty: slot.count }));
  if (rows.length) await sb.from('inventories').insert(rows);
}

/** Load equipment rows */
export async function loadEquipment(playerId) {
  const sb = getClient();
  if (!sb) return {};
  const { data } = await sb
    .from('equipments')
    .select('*')
    .eq('player_id', playerId);
  const eq = {};
  for (const row of (data || [])) eq[row.slot] = row.item_id;
  return eq;
}

/** Save equipment slots */
export async function saveEquipment(playerId, equipped) {
  const sb = getClient();
  if (!sb) return;
  await sb.from('equipments').delete().eq('player_id', playerId);
  const rows = Object.entries(equipped)
    .filter(([, itemId]) => itemId)
    .map(([slot, item_id]) => ({ player_id: playerId, slot, item_id }));
  if (rows.length) await sb.from('equipments').insert(rows);
}

export const isOnline = ONLINE;

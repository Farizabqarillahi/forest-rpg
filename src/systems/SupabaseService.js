/**
 * SupabaseService - Auth and DB helpers.
 *
 * Username-only auth: email is synthesised as `username@forestrealm.local`
 * and NEVER exposed in UI. Users only see/type their username.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const ONLINE = Boolean(SUPABASE_URL && SUPABASE_ANON);

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

// ── Auth helpers ──────────────────────────────────────────────────

/**
 * Register with username + password.
 * Email is never shown to the user.
 */
export async function signUp(email, password) {
  const sb = getClient();
  if (!sb) return { error: { message: 'Offline mode — set Supabase env vars in .env.local' } };

  const { data, error } = await sb.auth.signUp({
    email,
    password,
  });
  if (error) return { error };
  if (!data.user) return { error: { message: 'Registration failed — no user returned.' } };

  await sb.from('players').upsert({
    id: data.user.id,
    username: email.split('@')[0], // tetap punya username untuk game
    hp: 100,
    x: 384,
    y: 384,
  }, { onConflict: 'id' });

  return { data };
}

/**
 * Login with username + password.
 * Converts to fake email internally.
 */
export async function signIn(email, password) {
  const sb = getClient();
  if (!sb) return { error: { message: 'Offline mode — set Supabase env vars in .env.local' } };

  return sb.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const sb = getClient();
  if (sb) return sb.auth.signOut();
}

export async function getSession() {
  const sb = getClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

export function onAuthChange(callback) {
  const sb = getClient();
  if (!sb) return () => {};
  const { data: { subscription } } = sb.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// ── Player data helpers ───────────────────────────────────────────

export async function loadPlayer(userId) {
  const sb = getClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from('players').select('*').eq('id', userId).single();
  if (error) { console.warn('loadPlayer:', error.message); return null; }
  return data;
}

export async function savePlayerState(userId, { x, y, hp, username }) {
  const sb = getClient();
  if (!sb) return;
  await sb.from('players').upsert({
    id: userId, x, y, hp,
    ...(username ? { username } : {}),
  }, { onConflict: 'id' });
}

export async function loadInventory(playerId) {
  const sb = getClient();
  if (!sb) return [];
  const { data } = await sb.from('inventories').select('*').eq('player_id', playerId);
  return data || [];
}

export async function saveInventory(playerId, slots) {
  const sb = getClient();
  if (!sb) return;
  await sb.from('inventories').delete().eq('player_id', playerId);
  const rows = slots
    .filter(Boolean)
    .map(s => ({ player_id: playerId, item_id: s.itemId, qty: s.count }));
  if (rows.length) await sb.from('inventories').insert(rows);
}

export async function loadEquipment(playerId) {
  const sb = getClient();
  if (!sb) return {};
  const { data } = await sb.from('equipments').select('*').eq('player_id', playerId);
  const eq = {};
  for (const row of (data || [])) eq[row.slot] = row.item_id;
  return eq;
}

export async function saveEquipment(playerId, equipped) {
  const sb = getClient();
  if (!sb) return;
  await sb.from('equipments').delete().eq('player_id', playerId);
  const rows = Object.entries(equipped)
    .filter(([, id]) => id)
    .map(([slot, item_id]) => ({ player_id: playerId, slot, item_id }));
  if (rows.length) await sb.from('equipments').insert(rows);
}

export const isOnline = ONLINE;

import { parse as parseEnv } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const DEFAULT_USER_ID = 'UKiZh8nZRSbZ8RIhgu6rWc3D7Fm2';
export const SUSHMITA_USER_ID = 'YKJYN0RCB8Uww9c3n3ZNwEa8xc63';
export const MASTER_SPREADSHEET_ID = '1NnSvMimPpmrqrr6AZ1Aw1ikBLXRot7cMxUh1DYrMhMk';
export const DEFAULT_ROLES = [
  'Technical Program Manager', 'Technical Product Manager', 'Technical Project Manager',
  'AI Product Manager', 'Data PM', 'Data Program Manager', 'PMO Lead', 'Delivery Lead',
];
export const SUSHMITA_ROLES = [
  'Sales Excellence Manager', 'Trade Promotion Management Lead', 'TPM Lead',
  'Sales Operations Lead', 'Process Improvement Lead', 'Automation Lead',
  'Customer Operations Lead', 'Audit Lead', 'Program Manager',
];

export type ScoutConfig = {
  projectId: string;
  activeUserId: string;
  spreadsheetId: string;
  sheetTabName: string;
  sheetId: number;
  linkedinStatePath: string;
};

export async function loadEnvFiles(root = process.cwd()) {
  const read = async (path: string) => {
    try { return parseEnv(await readFile(path)); }
    catch (error: any) { if (error.code === 'ENOENT') return {}; throw error; }
  };
  const files = [
    await read(resolve(root, '.env')),
    await read(resolve(root, '.env.local')),
    await read(resolve(root, 'backend/.env')),
    await read(resolve(root, 'backend/.env.local')),
  ];
  for (const vars of files) {
    for (const [key, value] of Object.entries(vars)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
  return { frontend: files[0], frontendLocal: files[1], backend: files[2], backendLocal: files[3] };
}

export function activeUserId() {
  return process.env.ACTIVE_USER_ID || DEFAULT_USER_ID;
}

export function linkedInStatePath(root = process.cwd(), userId = activeUserId()) {
  return resolve(root, process.env.LINKEDIN_STATE_PATH || `.auth/linkedinState_${userId}.json`);
}

export function fallbackLinkedInStatePath(root = process.cwd()) {
  return resolve(root, '.auth/linkedinState.json');
}

export function configuredRoles(userId = activeUserId()) {
  return userId === SUSHMITA_USER_ID ? SUSHMITA_ROLES : DEFAULT_ROLES;
}

export function defaultSheetTabName(userId = activeUserId()) {
  return userId === SUSHMITA_USER_ID ? 'Sushmita' : 'Sahithi';
}

export async function readScoutConfig(root = process.cwd()): Promise<ScoutConfig> {
  const env = await loadEnvFiles(root);
  const projectId = process.env.FIRESTORE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Set FIRESTORE_PROJECT_ID and VITE_FIREBASE_PROJECT_ID to the same Firebase project.');
  if (env.frontend.VITE_FIREBASE_PROJECT_ID && env.frontend.VITE_FIREBASE_PROJECT_ID !== projectId) {
    throw new Error('Backend/scout project differs from root .env VITE_FIREBASE_PROJECT_ID.');
  }
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || MASTER_SPREADSHEET_ID;
  if (!spreadsheetId || !/^[\w-]+$/.test(spreadsheetId)) {
    throw new Error('Set GOOGLE_SHEET_ID to the active user target spreadsheet ID.');
  }
  const userId = activeUserId();
  const sheetTabName = process.env.GOOGLE_SHEET_TAB_NAME || defaultSheetTabName(userId);
  const sheetId = Number(process.env.GOOGLE_SHEETS_TAB_ID ?? '0');
  if (!Number.isSafeInteger(sheetId) || sheetId < 0) throw new Error('GOOGLE_SHEETS_TAB_ID must be a numeric gid (default 0).');
  return {
    projectId,
    activeUserId: userId,
    spreadsheetId,
    sheetTabName,
    sheetId,
    linkedinStatePath: linkedInStatePath(root),
  };
}

export function rolesFromProfile(profile: Record<string, any> | null | undefined, userId = activeUserId()) {
  const fields = [
    profile?.targetRoles, profile?.target_roles, profile?.targetProfiles, profile?.target_profiles,
    profile?.desiredRoles, profile?.desired_roles, profile?.jobTitles, profile?.job_titles,
    profile?.preferences?.targetRoles, profile?.preferences?.target_profiles,
  ];
  const roles = fields.flatMap(value => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(/[,;\n]/);
    return [];
  }).map(value => String(value).trim()).filter(Boolean);
  return [...new Set(roles.length ? roles : configuredRoles(userId))];
}

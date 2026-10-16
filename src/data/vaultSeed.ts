import type { VaultData } from '../types';
import { VAULT_VERSION } from '../config/app';
import { daysFromNow as d } from '../lib/format';

/**
 * Placeholder vault entries. These are names and sizes only —
 * there are no files behind them, and nothing here is encrypted.
 */
export function createSeedVault(): VaultData {
  return {
    version: VAULT_VERSION,
    folders: [
      { id: 'vf_identity', name: 'Identity' },
      { id: 'vf_finance', name: 'Finance' },
      { id: 'vf_contracts', name: 'Contracts' },
      { id: 'vf_health', name: 'Health' },
    ],
    docs: [
      { id: 'vd_1', folderId: 'vf_identity', name: 'Passport — placeholder.pdf', kind: 'pdf', size: 1_200_000, updatedAt: d(-200) },
      { id: 'vd_2', folderId: 'vf_identity', name: 'Residence certificate — placeholder.pdf', kind: 'pdf', size: 640_000, updatedAt: d(-90) },
      { id: 'vd_3', folderId: 'vf_finance', name: 'Tax return 2025 — placeholder.pdf', kind: 'pdf', size: 2_400_000, updatedAt: d(-150) },
      { id: 'vd_4', folderId: 'vf_finance', name: 'Freelance invoices 2026.xlsx', kind: 'sheet', size: 88_000, updatedAt: d(-4) },
      { id: 'vd_5', folderId: 'vf_contracts', name: 'Studio lease — Rue Kervégan.pdf', kind: 'pdf', size: 3_100_000, updatedAt: d(-28) },
      { id: 'vd_6', folderId: 'vf_contracts', name: 'NDA — Atelier Noma.pdf', kind: 'pdf', size: 420_000, updatedAt: d(-46) },
      { id: 'vd_7', folderId: 'vf_health', name: 'Vaccination record — placeholder.jpg', kind: 'image', size: 1_800_000, updatedAt: d(-400) },
      { id: 'vd_8', folderId: 'vf_finance', name: 'Bank details — placeholder.txt', kind: 'text', size: 1_100, updatedAt: d(-60) },
    ],
  };
}

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import s from './vault.module.css';
import { lockVault, useVault } from '../../store/vault';
import { PinGate } from './PinGate';
import { VaultBrowser } from './VaultBrowser';

export function VaultPage() {
  const { unlocked } = useVault();

  // Leaving the Vault re-locks it (demo behaviour).
  useEffect(() => () => lockVault(), []);

  return (
    <div className={s.vault}>
      <div className={s.demoBar} role="note">
        <TriangleAlert size={13} />
        <span>
          <strong>Prototype only — not secure storage.</strong> The PIN is a visual gate checked in your browser. Nothing is encrypted, and entries are placeholder names only. Do not add real personal documents.
        </span>
      </div>
      {unlocked ? <VaultBrowser /> : <PinGate />}
    </div>
  );
}

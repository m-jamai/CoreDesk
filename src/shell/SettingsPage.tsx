import { Database, LockKeyhole, RotateCcw, Sparkles } from 'lucide-react';
import L from '../components/layout/layout.module.css';
import { Button, Field, Input, Notice, Pill, useFeedback } from '../components/ui';
import { patchSettings, resetWorkspace, useWorkspace } from '../store/workspace';
import { lockVault, resetVault } from '../store/vault';
import { PLANS } from '../config/plans';
import { useState } from 'react';

export function SettingsPage() {
  const ws = useWorkspace();
  const { confirm, toast } = useFeedback();
  const [name, setName] = useState(ws.settings.displayName);
  const nameError = name.trim().length < 2 ? 'Enter at least 2 characters.' : null;

  return (
    <div className={L.scroll}>
      <div className={L.innerNarrow}>
        <div className={L.head}>
          <div className={L.headTitle}>
            <h1>Settings</h1>
            <p className={L.headDesc}>Preferences for this local demo workspace.</p>
          </div>
        </div>

        <div className={L.panel}>
          <div className={L.panelHead}><span className="label">Profile</span></div>
          <form
            className={L.panelBody}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}
            onSubmit={(e) => {
              e.preventDefault();
              if (nameError) return;
              patchSettings({ displayName: name.trim() });
              toast('Display name updated');
            }}
          >
            <div style={{ flex: '1 1 260px' }}>
              <Field label="Display name" error={nameError} htmlFor="set-name">
                <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!nameError} maxLength={40} />
              </Field>
            </div>
            <Button type="submit" variant="primary" style={{ marginTop: 22 }} disabled={!!nameError || name.trim() === ws.settings.displayName}>Save</Button>
          </form>
        </div>

        <div className={L.sectionTitle}><span className="label">Work Sharing plan</span></div>
        <div className={L.panel}>
          <div className={L.panelBody} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Pill tone={ws.settings.plan === 'pro' ? 'accent' : 'neutral'} icon={Sparkles}>{PLANS[ws.settings.plan].label}</Pill>
            <span className={L.muted}>{PLANS[ws.settings.plan].tagline} Plans are illustrative; no billing is connected.</span>
          </div>
        </div>

        <div className={L.sectionTitle}><span className="label">Demo data</span></div>
        <div className={L.panel}>
          <div className={L.panelBody} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Notice icon={Database}>
              Changes are saved in this browser's <strong>localStorage</strong> only. Nothing is sent to a server. Clearing site data removes them.
            </Notice>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                icon={RotateCcw}
                variant="danger"
                onClick={async () => {
                  const ok = await confirm({ title: 'Reset workspace demo data?', message: 'Projects, boards, shares and courses return to the original sample content. This cannot be undone.', confirmLabel: 'Reset workspace', danger: true });
                  if (ok) { resetWorkspace(); setName('Camille Laurent'); toast('Workspace demo data restored'); }
                }}
              >
                Reset workspace data
              </Button>
              <Button
                icon={LockKeyhole}
                variant="danger"
                onClick={async () => {
                  const ok = await confirm({ title: 'Reset Vault demo entries?', message: 'Placeholder Vault entries return to the original sample list and the Vault locks.', confirmLabel: 'Reset Vault', danger: true });
                  if (ok) { lockVault(); resetVault(); toast('Vault demo entries restored'); }
                }}
              >
                Reset Vault entries
              </Button>
            </div>
          </div>
        </div>

        <div className={L.sectionTitle}><span className="label">About this prototype</span></div>
        <div className={L.panel}>
          <div className={L.panelBody} style={{ color: 'var(--text-1)', fontSize: 'var(--fs-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p>CoreDesk is a front-end prototype. There is no account system, backend, real sharing, real invitations, payment or encryption.</p>
            <p>The Private Vault PIN is a visual gate only. Do not store real personal documents in this demo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Layers, LockKeyhole, Share2, Shapes, type LucideIcon } from 'lucide-react';

export interface NavDestination {
  id: 'projects' | 'board' | 'sharing' | 'vault';
  label: string;
  icon: LucideIcon;
  path: string;
}

/** The four — and only four — top-level destinations. */
export const NAV: NavDestination[] = [
  { id: 'projects', label: 'Projects', icon: Layers, path: '/projects' },
  { id: 'board', label: 'Board', icon: Shapes, path: '/board' },
  { id: 'sharing', label: 'Work Sharing', icon: Share2, path: '/sharing' },
  { id: 'vault', label: 'Private Vault', icon: LockKeyhole, path: '/vault' },
];

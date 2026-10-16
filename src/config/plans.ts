import type { PlanId } from '../types';

/**
 * Illustrative Work Sharing plans.
 * These limits are for demonstrating the product only — no payments,
 * billing or subscription service is connected. Edit freely.
 *
 * `null` means unlimited.
 */
export interface PlanLimits {
  label: string;
  tagline: string;
  /** Active (non-revoked) shares of projects and boards */
  activeShares: number | null;
  /** Collaborators per individual share */
  collaboratorsPerShare: number | null;
  /** Whether the "editor" access level can be granted */
  editorAccess: boolean;
  /** Courses in Teacher */
  courses: number | null;
  /** Learners per course */
  learnersPerCourse: number | null;
  /** Whether courses can be published publicly (vs. unlisted only) */
  publicPublishing: boolean;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  limited: {
    label: 'Limited',
    tagline: 'For sharing occasional work with a few people.',
    activeShares: 3,
    collaboratorsPerShare: 3,
    editorAccess: false,
    courses: 2,
    learnersPerCourse: 12,
    publicPublishing: false,
  },
  pro: {
    label: 'Pro',
    tagline: 'For ongoing collaboration and teaching at scale.',
    activeShares: null,
    collaboratorsPerShare: 25,
    editorAccess: true,
    courses: null,
    learnersPerCourse: 500,
    publicPublishing: true,
  },
};

export function formatLimit(n: number | null): string {
  return n === null ? 'Unlimited' : String(n);
}

export function withinLimit(count: number, limit: number | null): boolean {
  return limit === null || count < limit;
}

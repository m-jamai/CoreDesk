import { BookOpen, Code2, Database, FileText, Link as LinkIcon, PenTool, Presentation, Radio, Video, type LucideIcon } from 'lucide-react';
import type { Course, CourseVisibility, Learner, LessonKind, ResourceKind } from '../../types';
import type { PillTone } from '../../components/ui';

export const LESSON_KIND: Record<LessonKind, { label: string; icon: LucideIcon }> = {
  reading: { label: 'Reading', icon: BookOpen },
  video: { label: 'Video', icon: Video },
  exercise: { label: 'Exercise', icon: PenTool },
  live: { label: 'Live session', icon: Radio },
};

export const RESOURCE_KIND: Record<ResourceKind, { label: string; icon: LucideIcon }> = {
  pdf: { label: 'PDF', icon: FileText },
  link: { label: 'Link', icon: LinkIcon },
  slides: { label: 'Slides', icon: Presentation },
  code: { label: 'Code', icon: Code2 },
  dataset: { label: 'Dataset', icon: Database },
};

export const VISIBILITY: Record<CourseVisibility, { label: string; tone: PillTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  unlisted: { label: 'Unlisted', tone: 'info' },
  published: { label: 'Published', tone: 'success' },
};

export function lessonIds(course: Course): string[] {
  return course.modules.flatMap((m) => m.lessons.map((l) => l.id));
}

export function courseTotals(course: Course) {
  const lessons = course.modules.flatMap((m) => m.lessons);
  return { lessons: lessons.length, minutes: lessons.reduce((n, l) => n + l.minutes, 0), modules: course.modules.length };
}

/** Progress counts only lessons that still exist in the course. */
export function learnerProgress(course: Course, learner: Learner): { done: number; total: number; pct: number } {
  const ids = new Set(lessonIds(course));
  const done = learner.completedLessonIds.filter((id) => ids.has(id)).length;
  const total = ids.size;
  return { done, total, pct: total ? (done / total) * 100 : 0 };
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

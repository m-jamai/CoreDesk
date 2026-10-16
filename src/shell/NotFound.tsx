import { SearchX } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';
import { navigate } from '../lib/router';

export function NotFound({ what, back }: { what: string; back: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title={`This ${what} doesn't exist`}
      text="It may have been deleted, or the link is out of date."
      action={<Button onClick={() => navigate(back)}>Go back</Button>}
    />
  );
}

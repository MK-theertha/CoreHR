import { StickyNote } from 'lucide-react';

import { EmptyState } from '../ui/empty-state';

export function NotesTab() {
  return <EmptyState icon={StickyNote} title="No notes yet" description="HR notes about this employee will appear here once notes are available." />;
}

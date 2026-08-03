import { Activity } from 'lucide-react';

import { EmptyState } from '../ui/empty-state';

export function ActivityTab() {
  return <EmptyState icon={Activity} title="No recorded activity yet" description="A timeline of account and record changes will appear here once activity tracking is available." />;
}

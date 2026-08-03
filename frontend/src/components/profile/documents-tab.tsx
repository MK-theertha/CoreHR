import { FileText } from 'lucide-react';

import { EmptyState } from '../ui/empty-state';

export function DocumentsTab() {
  return <EmptyState icon={FileText} title="No documents yet" description="Employee documents (contracts, IDs, certifications) will appear here once document management is available." />;
}

import { AppearanceSettings } from '../components/settings/appearance-settings';
import { OrganizationSettingsForm } from '../components/settings/organization-settings-form';
import { PageHeader } from '../components/ui/page-header';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Preferences" title="Settings" description="Manage your appearance and organization preferences." />

      <div className="space-y-6">
        <AppearanceSettings />
        {user.role === 'SUPER_ADMIN' ? <OrganizationSettingsForm /> : null}
      </div>
    </div>
  );
}

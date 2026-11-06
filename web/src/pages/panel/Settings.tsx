import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/Page';
import { EmptyState } from '@/components/ui/Feedback';
import { Tabs } from '@/components/ui/Data';
import { useTab } from '@/features/system/shared';
import { AuditTab, BackupTab, BrandTab, ContactTab, FaqTab, IntegrationsTab, OutboxTab } from '@/features/system/SettingsTabs';

export default function Settings() {
  const { can } = useAuth();
  const admin = can('settings.manage');
  const tabs = [
    ...(admin ? [{ key: 'brand' as const, label: 'Marca' }, { key: 'integrations' as const, label: 'Integraciones' }, { key: 'faqs' as const, label: 'Preguntas frecuentes' }] : []),
    ...(admin || can('users.manage') ? [{ key: 'contact' as const, label: 'Mensajes de contacto' }] : []),
    ...(admin ? [{ key: 'outbox' as const, label: 'Bandeja de correo' }] : []),
    ...(can('audit.read') ? [{ key: 'audit' as const, label: 'Auditoría' }] : []),
    ...(admin ? [{ key: 'backup' as const, label: 'Respaldo' }] : []),
  ];
  const [tab, setTab] = useTab(tabs.map((t) => t.key));
  return (
    <div>
      <PageHeader title="Configuración" description="Marca institucional, integraciones, contenido público, correo, auditoría y respaldos." />
      {tabs.length === 0 ? <EmptyState title="Sin secciones disponibles" description="Tu rol no tiene permisos de configuración." /> : (
        <>
          <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
          {tab === 'brand' && <BrandTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'faqs' && <FaqTab />}
          {tab === 'contact' && <ContactTab />}
          {tab === 'outbox' && <OutboxTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'backup' && <BackupTab />}
        </>
      )}
    </div>
  );
}

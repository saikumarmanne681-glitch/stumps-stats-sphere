import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getFeatureFlags, setFeatureFlag, type FeatureFlagKey } from '@/lib/adminPowerTools';
import { v2api } from '@/lib/v2api';

const AdminPowerToolsPage = () => {
  const [flags, setFlags] = useState(getFeatureFlags());
  const [health, setHealth] = useState<'idle'|'checking'|'ok'|'fail'>('idle');
  const [schemaNotes, setSchemaNotes] = useState<string[]>([]);
  const [healthNotes, setHealthNotes] = useState<string[]>([]);

  useEffect(() => {
    const onChange = () => setFlags(getFeatureFlags());
    window.addEventListener('feature-flags:changed', onChange);
    return () => window.removeEventListener('feature-flags:changed', onChange);
  }, []);

  const maintenanceEnabled = flags.maintenanceMode;

  const runSchemaValidator = async () => {
    const result = await v2api.runSchemaValidationV3();
    if (result?.success) {
      setSchemaNotes(['Schema validation executed in Apps Script. Check SCHEMA_VALIDATION_LOG for full details.']);
      return;
    }
    setSchemaNotes(['Schema validation action failed. Ensure Apps Script v3 pack is deployed.']);
  };

  const checkAppsScriptHealth = async () => {
    setHealth('checking');
    try {
      const result = await v2api.runAppScriptHealthCheckV3();
      if (result?.success) {
        setHealth('ok');
        setHealthNotes(['Apps Script health checks completed.']);
      } else {
        setHealth('fail');
        setHealthNotes(['Health check failed. Deploy v3 Apps Script action runAppScriptHealthCheckV3.']);
      }
    } catch {
      setHealth('fail');
      setHealthNotes(['Health check request failed due to network or endpoint error.']);
    }
  };

  const flagEntries = useMemo(() => Object.entries(flags) as [FeatureFlagKey, boolean][], [flags]);

  return <div className='container py-8 space-y-6'>
    <h1 className='text-2xl font-semibold'>Admin Power Tools</h1>

    <Card>
      <CardHeader><CardTitle>#130 Schema Validator</CardTitle></CardHeader>
      <CardContent className='space-y-3'>
        <Button onClick={runSchemaValidator}>Run Validator</Button>
        {schemaNotes.map((note) => <p key={note} className='text-sm text-muted-foreground'>{note}</p>)}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>#131 Apps Script Health Monitor</CardTitle></CardHeader>
      <CardContent className='space-y-3'>
        <Button onClick={checkAppsScriptHealth} disabled={health === 'checking'}>{health === 'checking' ? 'Checking…' : 'Check Health'}</Button>
        <p className='text-sm text-muted-foreground'>Status: {health}</p>
        {healthNotes.map((note) => <p key={note} className='text-xs text-muted-foreground'>{note}</p>)}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>#133 Feature Flags</CardTitle></CardHeader>
      <CardContent className='space-y-3'>
        {flagEntries.map(([flag, value]) => <div key={flag} className='flex items-center justify-between border rounded-md px-3 py-2'>
          <span className='text-sm font-medium'>{flag}</span>
          <Switch checked={value} onCheckedChange={(checked) => setFlags(setFeatureFlag(flag, Boolean(checked)))} />
        </div>)}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>#134 Maintenance Mode</CardTitle></CardHeader>
      <CardContent>
        <Alert><AlertDescription>
          Maintenance mode is currently <strong>{maintenanceEnabled ? 'ON' : 'OFF'}</strong>. Toggle <code>maintenanceMode</code> in Feature Flags to control banner visibility.
        </AlertDescription></Alert>
      </CardContent>
    </Card>
  </div>;
};

export default AdminPowerToolsPage;

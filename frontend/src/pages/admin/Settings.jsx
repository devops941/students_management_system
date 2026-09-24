import { useEffect, useState } from 'react';
import { Loader2, Save, Settings as SettingsIcon, Bell, Clock, Percent } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then(setSettings).catch((e) => toast.error(e.message));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put('/settings', {
        minAttendancePercent: Number(settings.minAttendancePercent),
        attendanceEditWindowHours: Number(settings.attendanceEditWindowHours),
        enableEmailAlerts: Boolean(settings.enableEmailAlerts),
        enableParentNotifications: Boolean(settings.enableParentNotifications),
        lowAttendanceSeverity: settings.lowAttendanceSeverity,
      });
      setSettings(updated);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div>
        <PageHeader title="Settings" description="Global attendance rules." />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure the minimum attendance requirement and record-editing rules."
      >
        <Badge variant="outline">Admin only</Badge>
      </PageHeader>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-4 w-4" /> Attendance policy
            </CardTitle>
            <CardDescription>
              Students below this percentage appear in the defaulter list and trigger shortage alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="min">Minimum attendance (%)</Label>
              <Input
                id="min"
                type="number"
                min={0}
                max={100}
                value={settings.minAttendancePercent}
                onChange={(e) => setSettings({ ...settings, minAttendancePercent: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 75% for most universities.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Low attendance alert severity</Label>
              <select
                id="severity"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={settings.lowAttendanceSeverity || 'MEDIUM'}
                onChange={(e) => setSettings({ ...settings, lowAttendanceSeverity: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Editing window
            </CardTitle>
            <CardDescription>
              Faculty can correct a marked period within this window. Admins are never restricted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="window">Edit window (hours)</Label>
              <Input
                id="window"
                type="number"
                min={1}
                value={settings.attendanceEditWindowHours}
                onChange={(e) => setSettings({ ...settings, attendanceEditWindowHours: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                A longer window is convenient; a shorter one keeps records tamper-resistant.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
            </CardTitle>
            <CardDescription>
              Control automatic email alerts. When SMTP is unconfigured, emails are logged to the console instead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={Boolean(settings.enableEmailAlerts)}
                onChange={(e) => setSettings({ ...settings, enableEmailAlerts: e.target.checked })}
              />
              <span className="text-sm">Email students and faculty when an alert is raised</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={Boolean(settings.enableParentNotifications)}
                onChange={(e) => setSettings({ ...settings, enableParentNotifications: e.target.checked })}
              />
              <span className="text-sm">Notify guardians of defaulters</span>
            </label>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}

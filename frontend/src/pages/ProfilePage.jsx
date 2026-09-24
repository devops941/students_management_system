import { useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate, formatDateTime, initials } from '@/lib/utils';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const profile = user?.student || user?.faculty || null;

  return (
    <div>
      <PageHeader title="My Profile" description="Your account details and password settings." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Details are managed by the college administrator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{initials(user?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge className="mt-1">{user?.role}</Badge>
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Phone</dt>
                <dd className="text-sm font-medium">{user?.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Account created</dt>
                <dd className="text-sm font-medium">{formatDate(user?.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Last login</dt>
                <dd className="text-sm font-medium">{formatDateTime(user?.lastLoginAt)}</dd>
              </div>
              {profile?.rollNumber && (
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Roll number</dt>
                  <dd className="text-sm font-medium">{profile.rollNumber}</dd>
                </div>
              )}
              {profile?.employeeCode && (
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Employee code</dt>
                  <dd className="text-sm font-medium">{profile.employeeCode}</dd>
                </div>
              )}
              {profile?.class && (
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Class</dt>
                  <dd className="text-sm font-medium">{profile.class.name}-{profile.class.section}</dd>
                </div>
              )}
            </dl>
            <Button variant="outline" size="sm" onClick={() => refresh().then(() => toast.success('Profile refreshed'))}>
              Refresh
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Change password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  required
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  minLength={6}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

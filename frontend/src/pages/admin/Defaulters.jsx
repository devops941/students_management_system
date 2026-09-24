import { useAuth } from '@/context/AuthContext';
import DefaultersPanel from '@/components/shared/DefaultersPanel';

export default function DefaultersPage() {
  const { user } = useAuth();
  return <DefaultersPanel canNotify={user?.role === 'ADMIN' || user?.role === 'FACULTY'} />;
}

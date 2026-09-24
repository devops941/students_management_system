import LeaveRequestsPanel from '@/components/shared/LeaveRequestsPanel';

export default function LeavesPage() {
  return (
    <LeaveRequestsPanel
      title="Leave & On-Duty Requests"
      description="Review student absence requests. Approving a request auto-adjusts attendance for the covered dates."
    />
  );
}

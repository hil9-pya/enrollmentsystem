import PortalPageHeader from './PortalPageHeader';

export default function StaffUnavailablePanel({ title, description, action }) {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <PortalPageHeader title={title} description={description} />
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-700">This area does not require action in this portal.</p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  );
}

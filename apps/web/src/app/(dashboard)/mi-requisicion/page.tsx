import { RequisicionForm } from '@/features/requisiciones/components/RequisicionForm';

export default function MiRequisicionPage(): JSX.Element {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mi Requisicion</h1>
      <RequisicionForm />
    </div>
  );
}

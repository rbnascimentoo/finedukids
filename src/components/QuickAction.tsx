import { type ReactNode } from "react";

type Props = { label: string; icon: ReactNode; onClick?: () => void };

export default function QuickAction({ label, icon, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center h-28 bg-white rounded-2xl border border-gray-100 shadow-card hover:bg-blue-50 active:scale-[0.99] transition"
    >
      <div className="text-blue-600 text-2xl mb-2">{icon}</div>
      <span className="text-[13px] font-medium text-gray-700">{label}</span>
    </button>
  );
}

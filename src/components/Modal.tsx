import { type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

export default function Modal({ open, title, children, onClose, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-[520px] md:mx-auto p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Fechar">✕</button>
          </div>
          <div className="mt-4">{children}</div>
          {footer && <div className="mt-5">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { applySWUpdate, onSWUpdate } from "../registerSW";

export default function UpdateToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // quando o SW novo estiver pronto, mostramos o toast
    const off = onSWUpdate(() => setVisible(true));
    return () => {
      off();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="bg-blue-600 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <span className="text-sm">Uma atualização está disponível.</span>
        <button
          onClick={() => applySWUpdate()}
          className="px-3 py-1 rounded-lg bg-white text-blue-700 text-sm font-semibold"
        >
          Atualizar agora
        </button>
      </div>
    </div>
  );
}

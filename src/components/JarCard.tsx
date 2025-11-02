type JarProps = {
  tipo: "Gastar" | "Guardar" | "Investir";
  valor: number;           // saldo no jarro
  cor?: string;            // opcional para destacar
  onAlocar?: () => void;
};

export default function JarCard({ tipo, valor, cor = "bg-blue-50", onAlocar }: JarProps) {
  return (
    <div className={`rounded-2xl border border-blue-100 ${cor} p-4`}>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-blue-900">{tipo}</h4>
        <span className="text-blue-700 font-bold tabular-nums">R$ {valor.toFixed(2)}</span>
      </div>
      <button
        onClick={onAlocar}
        className="mt-3 w-full rounded-xl bg-blue-600 text-white font-semibold py-2 hover:brightness-105 active:scale-[0.99]"
      >
        Alocar dinheiro
      </button>
    </div>
  );
}

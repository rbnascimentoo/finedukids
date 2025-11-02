type MissionProps = {
  titulo: string;
  recompensa: string; // ex: "+10 pontos" ou "R$ 5"
  descricao?: string;
  onConcluir?: () => void;
};

export default function MissionCard({ titulo, recompensa, descricao, onConcluir }: MissionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h5 className="font-semibold text-gray-900 leading-tight">{titulo}</h5>
          {descricao && <p className="text-sm text-gray-500 mt-1">{descricao}</p>}
        </div>
        <span className="text-blue-600 text-sm font-semibold">{recompensa}</span>
      </div>
      <button
        onClick={onConcluir}
        className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-semibold py-2 hover:bg-blue-100"
      >
        Marcar como concluída
      </button>
    </div>
  );
}

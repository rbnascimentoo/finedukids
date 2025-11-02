type Props = {
  name: string;
  balance: number;
  allowance: string;
  avatar?: string;
  onMenu?: () => void;
};

export default function ChildCard({ name, balance, allowance, avatar, onMenu }: Props) {
  return (
    <div className="flex items-center justify-between bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-card">
      {/* Left: avatar + info */}
      <div className="flex items-center gap-3">
        <img
          src={avatar || "https://i.pravatar.cc/80?img=1"}
          alt={name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold text-gray-900 leading-tight">{name}</p>
          <p className="text-[13px] text-gray-500 mt-0.5">Allowance: {allowance}</p>
        </div>
      </div>

      {/* Right: amount + menu */}
      <div className="flex items-center gap-1">
        <p className="text-blue-600 font-extrabold text-xl tabular-nums">
          ${balance.toFixed(2)}
        </p>
        <button
          aria-label={`More options for ${name}`}
          onClick={onMenu}
          className="ml-1 text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

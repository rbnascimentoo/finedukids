import { useNavigate, Link } from "react-router-dom";

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-8 bg-gradient-to-b from-[#FFD1D9] via-[#FFE9C3] to-[#60E2FF]">
      <div className="w-full max-w-sm">
        {/* Logo / marca */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/80 shadow-sm">
            <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#3D3A35]">
              FinEdu Kids
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold text-[#3D3A35] leading-tight">
            Educação financeira
            <br />
            divertida e gamificada 🪙
          </h1>

          <p className="mt-3 text-sm text-[#5B5550]">
            Missões, desafios e recompensas para crianças e jovens aprenderem
            a lidar com dinheiro de forma leve e colorida.
          </p>
        </div>

        {/* Botões principais */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="w-full rounded-full bg-[#60E2FF] text-[#1A1A1A] font-semibold py-3 text-sm shadow-md active:scale-[0.98] transition-transform"
          >
            Criar conta
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full rounded-full bg-white/90 text-[#3D3A35] font-semibold py-3 text-sm shadow-sm border border-[#3D3A35]/10 active:scale-[0.98] transition-transform"
          >
            Já tenho conta
          </button>
        </div>

        {/* Linha extra opcional */}
        <p className="mt-4 text-center text-[11px] text-[#3D3A35]">
          Responsáveis podem criar contas para seus filhos ou jovens.{" "}
          <Link to="/login" className="underline underline-offset-2">
            Entrar como responsável
          </Link>
        </p>
      </div>
    </div>
  );
}

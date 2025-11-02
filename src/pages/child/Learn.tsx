import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AiOutlineSearch,
  AiOutlineFlag,
  AiOutlinePieChart,
  AiOutlineShoppingCart,
  AiOutlineSafetyCertificate,
} from "react-icons/ai";
import BottomNavChild from "../../components/BottomNavChild";
import { makeAuthRepo, makeKidsRepo } from "../../repository/Factory";

type LanguageLevel = "crianca" | "adolescente" | "jovem";

function calcAge(birthISO?: string | null): number | null {
  if (!birthISO) return null;
  const b = new Date(birthISO);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
function languageFromAge(age: number | null): LanguageLevel {
  if (age === null) return "crianca";
  if (age <= 10) return "crianca";
  if (age <= 14) return "adolescente";
  return "jovem";
}

type Highlight = { id: string; title: string; desc: string; img: string; slug: string };
type QuickLesson = { id: string; title: string; desc: string; icon: React.ReactNode; slug: string; tag: "metas" | "gastos" | "orcamento" | "seguranca" };

const HIGHLIGHTS: Highlight[] = [
  {
    id: "h1",
    title: "Economizando para o Futuro",
    desc: "Aprenda a definir metas financeiras.",
    img: "/images/learn/learn-saving.svg", // coloque a imagem em public/images/learn
    slug: "economizando-para-o-futuro",
  },
  {
    id: "h2",
    title: "Como Ganhar Dinheiro",
    desc: "Missões e ideias para ganhar mesada extra.",
    img: "/images/learn/learn-earning.svg",
    slug: "como-ganhar-dinheiro",
  },
  {
    id: "h3",
    title: "Investindo de Forma Simples",
    desc: "Entenda o básico de investimento.",
    img: "/images/learn/learn-invest.svg",
    slug: "investindo-simples",
  },
];

const QUICK: QuickLesson[] = [
  {
    id: "q1",
    title: "Defina Metas Financeiras",
    desc: "Crie metas realistas e acompanhe o progresso.",
    icon: <AiOutlineFlag className="w-6 h-6 text-blue-600" />,
    slug: "defina-metas",
    tag: "metas",
  },
  {
    id: "q2",
    title: "Acompanhe seus Gastos",
    desc: "Descubra para onde vai o seu dinheiro.",
    icon: <AiOutlinePieChart className="w-6 h-6 text-green-600" />,
    slug: "acompanhe-gastos",
    tag: "gastos",
  },
  {
    id: "q3",
    title: "Noções de Orçamento",
    desc: "Monte um orçamento simples para sua mesada.",
    icon: <AiOutlineShoppingCart className="w-6 h-6 text-indigo-600" />,
    slug: "nocoes-orcamento",
    tag: "orcamento",
  },
  {
    id: "q4",
    title: "Segurança com Dinheiro",
    desc: "Cuidados ao comprar e ao guardar.",
    icon: <AiOutlineSafetyCertificate className="w-6 h-6 text-cyan-600" />,
    slug: "seguranca-financeira",
    tag: "seguranca",
  },
];

export default function ChildLearn() {
  const navigate = useNavigate();
  const auth = useMemo(() => makeAuthRepo(), []);
  const kidsRepo = useMemo(() => makeKidsRepo(), []);

  const [level, setLevel] = useState<LanguageLevel>("crianca");
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.body.setAttribute("data-role", "child"); // aplica tema criança
  }, []);

  // define linguagem por idade da criança logada
  useEffect(() => {
    (async () => {
      const me = await auth.getCurrentUser();
      const age = calcAge(me?.birthdate);
      setLevel(languageFromAge(age));
      // você pode usar kidsRepo.getByUser(me!.id) se quiser personalizar trilhas por saldo/idade etc.
      await kidsRepo.getByUser(me?.id || "");
    })();
  }, [auth, kidsRepo]);

  const filteredQuick = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return QUICK;
    return QUICK.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.desc.toLowerCase().includes(q) ||
        l.tag.toLowerCase().includes(q)
    );
  }, [query]);

  function openLesson(slug: string) {
    // exemplo: rota de detalhe /child/learn/:slug
    navigate(`/child/learn/${slug}`);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {/* Header sticky */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 max-w-full md:max-w-[640px] mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-semibold text-gray-900">
              {level === "crianca" ? "Aprender" : level === "adolescente" ? "Aprender" : "Aprender"}
            </h1>
            <div className="ml-auto relative w-[52%] sm:w-[280px]">
              <AiOutlineSearch className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar lições"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-4 py-4 max-w-full md:max-w-[640px] mx-auto space-y-6">
        {/* Destaques (carrossel) */}
        <section>
          <div className="flex space-x-3 overflow-x-auto scrollbar-hide">
            {HIGHLIGHTS.map((h) => (
              <button
                key={h.id}
                onClick={() => openLesson(h.slug)}
                className="min-w-[240px] rounded-2xl bg-white border border-gray-100 shadow-sm flex-shrink-0 text-left focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <img
                  src={h.img}
                  alt={h.title}
                  className="w-full h-32 object-cover rounded-t-2xl"
                  loading="lazy"
                />
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900">{h.title}</p>
                  <p className="text-xs text-gray-600">{h.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Lições rápidas */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            {level === "crianca" ? "Lições Rápidas" : "Aulas rápidas"}
          </h2>

          <div className="space-y-3">
            {filteredQuick.map((l) => (
              <button
                key={l.id}
                onClick={() => openLesson(l.slug)}
                className="w-full flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <div>
                  <p className="font-medium text-sm text-gray-900">{l.title}</p>
                  <p className="text-xs text-gray-500">{l.desc}</p>
                </div>
                <div className="w-11 h-11 flex items-center justify-center bg-gray-100 rounded-full">
                  {l.icon}
                </div>
              </button>
            ))}

            {filteredQuick.length === 0 && (
              <div className="text-center text-gray-500 text-sm bg-white border border-gray-100 rounded-2xl p-5">
                Nenhuma lição encontrada para “{query}”.
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomNavChild />
    </div>
  );
}

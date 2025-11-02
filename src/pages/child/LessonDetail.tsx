import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AiOutlineArrowLeft, AiOutlineCheckCircle } from "react-icons/ai";
import { makeAuthRepo } from "../../repository/Factory";

// tipos para a página
type LanguageLevel = "crianca" | "adolescente" | "jovem";
type Lesson = {
  slug: string;
  title: string;
  cover: string;
  goals: string[];
  content: string[];
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    feedbackRight: string;
    feedbackWrong: string;
  };
};

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

// Base das lições por "slug"
const LESSON_BASE: Record<string, Omit<Lesson, "title" | "content" | "goals">> = {
  "economizando-para-o-futuro": {
    slug: "economizando-para-o-futuro",
    cover: "/images/learn/learn-saving.svg", // usamos SVG leve (veja seção 3)
    quiz: {
      question: "Qual é um bom jeito de começar a economizar?",
      options: [
        "Gastar tudo e economizar depois",
        "Guardar um pouco da mesada sempre",
        "Nunca anotar os gastos",
        "Comprar por impulso",
      ],
      answerIndex: 1,
      feedbackRight: "Perfeito! Guardar um pouco sempre ajuda a alcançar metas.",
      feedbackWrong: "Quase! Tente guardar um pouco da mesada sempre.",
    },
    // title/goals/content serão definidos por idade
  } as any,
  "como-ganhar-dinheiro": {
    slug: "como-ganhar-dinheiro",
    cover: "/images/learn/learn-earning.svg",
    quiz: {
      question: "Qual é um exemplo de ganhar dinheiro de forma segura?",
      options: [
        "Comprar algo caro sem autorização",
        "Ajudar em tarefas e combinar uma recompensa",
        "Compartilhar senhas por moedas virtuais",
        "Pedir dinheiro para desconhecidos",
      ],
      answerIndex: 1,
      feedbackRight: "Isso aí! Combine com seus responsáveis e registre seus ganhos.",
      feedbackWrong: "Ops! O melhor é ajudar em tarefas e combinar a recompensa.",
    },
  } as any,
  "investindo-simples": {
    slug: "investindo-simples",
    cover: "/images/learn/learn-invest.svg",
    quiz: {
      question: "Investir é…",
      options: [
        "Fazer o dinheiro trabalhar ao longo do tempo",
        "Gastar tudo rapidamente",
        "Guardar debaixo do travesseiro",
        "Algo que só adultos ricos podem fazer",
      ],
      answerIndex: 0,
      feedbackRight: "Acertou! Investir faz o dinheiro trabalhar com o tempo.",
      feedbackWrong: "Não exatamente. Investir é fazer o dinheiro trabalhar.",
    },
  } as any,
};

// Texto por faixa etária
function materialByLevel(slug: string, level: LanguageLevel) {
  switch (slug) {
    case "economizando-para-o-futuro":
      if (level === "crianca") {
        return {
          title: "Economizando para o Futuro",
          goals: ["Entender o que é meta", "Guardar um pouco sempre", "Celebrar pequenas vitórias"],
          content: [
            "Meta é um sonho com data. Ex.: juntar R$ 50 para um brinquedo.",
            "Guarde um pouquinho da sua mesada toda semana.",
            "Acompanhe o que já juntou e comemore cada passo!",
          ],
        };
      } else if (level === "adolescente") {
        return {
          title: "Economize com Metas Inteligentes",
          goals: ["Escolher metas realistas", "Definir prazos", "Acompanhar o progresso"],
          content: [
            "Defina metas com valor e prazo (ex.: R$ 200 em 4 meses).",
            "Reserve uma parte da mesada todo período.",
            "Revise seu progresso e ajuste se necessário.",
          ],
        };
      }
      return {
        title: "Como Construir Reserva com Metas",
        goals: ["Definir objetivos SMART", "Automatizar o hábito", "Medir evolução"],
        content: [
          "Transforme desejos em objetivos SMART (específicos, mensuráveis etc.).",
          "Crie o hábito de separar uma % da mesada sempre.",
          "Acompanhe evolução: gráfico e checkpoints ajudam.",
        ],
      };

    case "como-ganhar-dinheiro":
      if (level === "crianca") {
        return {
          title: "Como Ganhar Dinheiro",
          goals: ["Ajudar em casa", "Ser responsável", "Combinar recompensas"],
          content: [
            "Você pode ajudar em tarefas (ex.: arrumar o quarto).",
            "Seja responsável e cumpra o combinado.",
            "Converse com seus responsáveis sobre recompensas justas.",
          ],
        };
      } else if (level === "adolescente") {
        return {
          title: "Ideias para Ganhar Dinheiro",
          goals: ["Oferecer ajuda", "Criar mini serviços", "Organizar seus ganhos"],
          content: [
            "Ofereça ajuda com tarefas (limpar, cuidar do pet, organizar).",
            "Crie mini serviços: vender algo caseiro com permissão.",
            "Registre ganhos para entender o total no mês.",
          ],
        };
      }
      return {
        title: "Crie Fontes de Renda (com Segurança)",
        goals: ["Serviços simples", "Valorização do tempo", "Segurança digital"],
        content: [
          "Pense em serviços leves e autorizados pela família.",
          "Aprenda a calcular preço vs. tempo gasto.",
          "Nunca compartilhe dados pessoais/financeiros.",
        ],
      };

    case "investindo-simples":
      if (level === "crianca") {
        return {
          title: "Investindo de Forma Simples",
          goals: ["Conhecer a ideia de investir", "Entender tempo x dinheiro", "Guardar com regularidade"],
          content: [
            "Investir é fazer seu dinheiro crescer devagar.",
            "Quanto mais tempo investido, mais ele pode crescer.",
            "Guarde um pouco sempre. O hábito é o segredo!",
          ],
        };
      } else if (level === "adolescente") {
        return {
          title: "Primeiros Passos em Investimentos",
          goals: ["Entender risco x retorno", "Pensar no longo prazo", "Evitar impulsos"],
          content: [
            "Mais retorno costuma significar mais risco.",
            "Foque no longo prazo, não em ganhos rápidos.",
            "Evite decisões por impulso ou 'modas' da internet.",
          ],
        };
      }
      return {
        title: "Investir com Consciência",
        goals: ["Perfil de risco", "Diversificação", "Disciplina"],
        content: [
          "Conheça seu perfil e objetivo antes de investir.",
          "Diversifique para reduzir riscos.",
          "Disciplina vence ansiedade de curto prazo.",
        ],
      };

    default:
      return {
        title: "Lição",
        goals: [],
        content: ["Conteúdo em breve."],
      };
  }
}

export default function LessonDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const auth = useMemo(() => makeAuthRepo(), []);
  const [level, setLevel] = useState<LanguageLevel>("crianca");
  const [checked, setChecked] = useState(false);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const base = LESSON_BASE[slug];
  const content = useMemo(() => materialByLevel(slug, level), [slug, level]);

  // carregar faixa etária e progresso salvo
  useEffect(() => {
    (async () => {
      const me = await auth.getCurrentUser();
      const age = calcAge(me?.birthdate);
      setLevel(languageFromAge(age));

      const done = localStorage.getItem(`lesson_done_${slug}`);
      setChecked(done === "1");
    })();
  }, [auth, slug]);

  if (!base) {
    return (
      <div className="max-w-[640px] mx-auto p-4">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 flex items-center gap-1 mb-3">
          <AiOutlineArrowLeft /> Voltar
        </button>
        <p>Lição não encontrada.</p>
      </div>
    );
  }

  const quiz = base.quiz;

  const correct = submitted && quizChoice === quiz.answerIndex;

  function handleFinishLesson() {
    localStorage.setItem(`lesson_done_${slug}`, "1");
    setChecked(true);
  }

  function handleSubmitQuiz() {
    if (quizChoice === null) return;
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-full md:max-w-[640px] mx-auto px-4 py-3 flex items-center gap-2">
          <button
            className="rounded-xl p-2 hover:bg-gray-100"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
          >
            <AiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-semibold">{content.title}</h1>
          {checked && (
            <span className="ml-auto text-green-600 flex items-center gap-1 text-sm">
              <AiOutlineCheckCircle /> concluída
            </span>
          )}
        </div>
      </header>

      {/* capa */}
      <div className="max-w-full md:max-w-[640px] mx-auto px-4 pt-4">
        <img
          src={base.cover}
          alt={content.title}
          className="w-full h-40 object-cover rounded-2xl border border-gray-100 bg-white"
          loading="lazy"
        />
      </div>

      {/* conteúdo */}
      <main className="max-w-full md:max-w-[640px] mx-auto px-4 pb-28 space-y-6 pt-4">
        {/* metas */}
        {content.goals.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-semibold mb-2">Objetivos da lição</h2>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {content.goals.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </section>
        )}

        {/* passos/conteúdo */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold mb-2">Passo a passo</h2>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-2">
            {content.content.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>

        {/* quiz */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold mb-3">Quiz rápido</h2>
          <p className="text-sm text-gray-800 mb-3">{quiz.question}</p>
          <div className="space-y-2">
            {quiz.options.map((op, idx) => {
              const selected = quizChoice === idx;
              const isRight = submitted && idx === quiz.answerIndex;
              const isWrong = submitted && selected && !isRight;
              return (
                <label
                  key={idx}
                  className={`block rounded-xl border p-3 text-sm cursor-pointer
                  ${selected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"}
                  ${isRight ? "border-green-500 bg-green-50" : ""}
                  ${isWrong ? "border-red-400 bg-red-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="quiz"
                    className="mr-2"
                    checked={selected}
                    onChange={() => setQuizChoice(idx)}
                  />
                  {op}
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSubmitQuiz}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
            >
              Enviar resposta
            </button>
            {submitted && (
              <span
                className={`text-sm ${correct ? "text-green-700" : "text-red-600"}`}
                role="status"
              >
                {correct ? quiz.feedbackRight : quiz.feedbackWrong}
              </span>
            )}
          </div>
        </section>

        {/* concluir */}
        <section className="flex justify-end">
          <button
            onClick={handleFinishLesson}
            className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold"
          >
            Marcar lição como concluída
          </button>
        </section>
      </main>
    </div>
  );
}

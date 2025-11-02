import { NavLink } from "react-router-dom";
import {
  AiOutlineHome,
  AiOutlineTrophy,
  AiOutlineBook,
  AiOutlineStar,
  AiOutlineSetting,
} from "react-icons/ai";

/** Bottom nav com 5 abas: Início, Missões, Aprendizado, Recompensas, Configurações */
export default function BottomNavChild() {
  const items = [
    { to: "/child", label: "Início", icon: AiOutlineHome },
    { to: "/child/missions", label: "Missões", icon: AiOutlineTrophy },
    { to: "/child/learn", label: "Aprendizado", icon: AiOutlineBook },
    { to: "/child/rewards", label: "Recompensas", icon: AiOutlineStar },
    { to: "/child/settings", label: "Config.", icon: AiOutlineSetting },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <ul className="mx-auto max-w-full md:max-w-[640px] grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2.5 text-[11px] ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`
              }
              end={to === "/child"}
              aria-label={label}
            >
              <Icon className="w-6 h-6 mb-0.5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

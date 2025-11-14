import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AiOutlineHome, AiOutlineTeam, AiOutlineBarChart, AiOutlineSetting } from "react-icons/ai";

type ItemProps = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
};

function Item({ to, label, icon, end }: ItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex flex-col items-center justify-center h-14 rounded-xl transition select-none",
          "text-[11px] leading-tight",
          isActive
            ? "text-[#1A1A1A] bg-white shadow-md font-semibold"
            : "text-gray-600 hover:text-gray-800 hover:bg-white/70",
        ].join(" ")
      }
      aria-label={label}
    >
      <div className="text-xl leading-none">{icon}</div>
      <span className="mt-0.5">{label}</span>
    </NavLink>
  );
}


export default function BottomNavParent() {
  return (
    <nav
      role="navigation"
      aria-label="Menu inferior do responsável"
      className="
    fixed bottom-0 inset-x-0 z-40
    bg-white/90 backdrop-blur
    border-t border-white/60
    shadow-[0_-6px_20px_rgba(0,0,0,0.06)]
    px-2 pt-2
    pb-[calc(env(safe-area-inset-bottom)+8px)]
  "
    >
      <div className="mx-auto max-w-full md:max-w-[640px] grid grid-cols-4 gap-2">
        <Item
          to="/parent"
          end
          label="Dashboard"
          icon={<AiOutlineHome className="w-6 h-6" />}
        />
        <Item
          to="/parent/kids"
          label="Crianças"
          icon={<AiOutlineTeam className="w-6 h-6" />}
        />
        <Item
          to="/parent/progress"
          label="Progresso"
          icon={<AiOutlineBarChart className="w-6 h-6" />}
        />
        <Item
          to="/parent/settings"
          label="Configurações"
          icon={<AiOutlineSetting className="w-6 h-6" />}
        />
      </div>
    </nav>
  );
}

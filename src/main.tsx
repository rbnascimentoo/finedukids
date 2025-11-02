import { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";
import { registerSW } from "./registerSW";
import { runWeeklyAutoAllowance } from "./services/autoAllowance";
import { processQueue, installOnlineSync } from "./services/sync";
import { supabase } from "./services/supabase";

function Bootstrapper() {
  useEffect(() => {
    // instala sincronização ao voltar online
    installOnlineSync();

    (async () => {
      // tenta processar fila ao iniciar
      await processQueue();

      // se logado e for 'parent', dispara auto-allowance (nao bloqueia UI)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id && user.user_metadata?.role === "parent") {
        runWeeklyAutoAllowance(user.id).catch(() => {
          /* silencioso, sem travar */
        });
      }
    })();
  }, []);

  return null; // só efeitos
}

registerSW();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Bootstrapper />
    <App />
  </BrowserRouter>,
);

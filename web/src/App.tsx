import { useEffect } from "react";
import { HashRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Toast } from "./components/ui";
import { IconGrid, IconHome, IconPlan, IconPlus, IconSliders } from "./components/Icons";
import { useT } from "./lib/i18n";
import { useStore } from "./lib/store";
import { HomeScreen, LevelScreen, MineScreen } from "./screens/Workouts";
import { WorkoutDetailScreen } from "./screens/WorkoutDetail";
import { PlayerScreen } from "./screens/Player";
import { ExerciseDetailScreen, ExercisesScreen } from "./screens/Exercises";
import { PlanDetailScreen, PlansScreen } from "./screens/Plans";
import { BuilderScreen } from "./screens/Builder";
import { InfoScreen, SettingsScreen, VoicesScreen } from "./screens/Settings";

const NO_TABBAR = ["/play/", "/builder/", "/voices"];

function TabBar() {
  const t = useT();
  const items = [
    { to: "/", label: t("tabHome"), icon: <IconHome /> },
    { to: "/plans", label: t("tabPlans"), icon: <IconPlan /> },
    { to: "/exercises", label: t("tabExercises"), icon: <IconGrid /> },
    { to: "/mine", label: t("tabMine"), icon: <IconPlus /> },
    { to: "/settings", label: t("tabSettings"), icon: <IconSliders /> },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="in">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) => (isActive ? "on" : "")}>
            {i.icon}
            <span>{i.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Shell() {
  const loc = useLocation();
  const lang = useStore((s) => s.settings.language);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const showTabs = !NO_TABBAR.some((p) => loc.pathname.startsWith(p));
  return (
    <>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/level/:lvl" element={<LevelScreen />} />
        <Route path="/mine" element={<MineScreen />} />
        <Route path="/workout/:id" element={<WorkoutDetailScreen />} />
        <Route path="/play/:id" element={<PlayerScreen />} />
        <Route path="/builder/:id" element={<BuilderScreen />} />
        <Route path="/exercises" element={<ExercisesScreen />} />
        <Route path="/exercise/:id" element={<ExerciseDetailScreen />} />
        <Route path="/plans" element={<PlansScreen />} />
        <Route path="/plan/:id" element={<PlanDetailScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/voices" element={<VoicesScreen />} />
        <Route path="/info/:page" element={<InfoScreen />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
      {showTabs && <TabBar />}
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

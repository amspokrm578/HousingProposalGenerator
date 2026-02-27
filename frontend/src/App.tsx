import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HeroPage from "./pages/HeroPage";
import OpportunityMapPage from "./pages/OpportunityMapPage";
import AgentWorkspacePage from "./pages/AgentWorkspacePage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";
import DashboardPage from "./pages/DashboardPage";
import NeighborhoodsPage from "./pages/NeighborhoodsPage";
import ProposalsPage from "./pages/ProposalsPage";
import ProposalDetailPage from "./pages/ProposalDetailPage";
import ProposalBuilderPage from "./pages/ProposalBuilderPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HeroPage />} />
          <Route path="/map" element={<OpportunityMapPage />} />
          <Route path="/workspace" element={<AgentWorkspacePage />} />
          <Route path="/dashboard" element={<AnalyticsDashboardPage />} />
          <Route path="/dashboard/legacy" element={<DashboardPage />} />
          <Route path="/neighborhoods" element={<NeighborhoodsPage />} />
          <Route path="/proposals" element={<ProposalsPage />} />
          <Route path="/proposals/new" element={<ProposalBuilderPage />} />
          <Route path="/proposals/:id" element={<ProposalDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

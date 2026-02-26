import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
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
          <Route path="/" element={<DashboardPage />} />
          <Route path="/neighborhoods" element={<NeighborhoodsPage />} />
          <Route path="/proposals" element={<ProposalsPage />} />
          <Route path="/proposals/new" element={<ProposalBuilderPage />} />
          <Route path="/proposals/:id" element={<ProposalDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

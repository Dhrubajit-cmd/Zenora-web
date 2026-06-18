/*import LoginPage from "./pages/Login/LoginPage"

function App(){
  return <LoginPage />
}

export default App*/

import { BrowserRouter, Routes, Route } from "react-router-dom"

import LoginPage from "./pages/Login/LoginPage"
import DashboardPage from "./pages/Dashboard/DashboardPage";
import TransactionsPage from "./pages/Transactions/TransactionsPage";
import ActivityPage from "./pages/Activity/ActivityPage";
import InvestmentsPage from "./pages/Investments/InvestmentsPage";
import InsightsTab from "./pages/Insights/InsightsTab";



function App() {
  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<LoginPage />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/investments" element={<InvestmentsPage />} />
        <Route path="/insights" element={<InsightsTab />} />


      </Routes>

    </BrowserRouter>

  )
}

export default App
import { createBrowserRouter } from "react-router";
import { Layout } from "./Layout";
import { ErrorPage } from "./pages/ErrorPage";
import { DashboardModern } from "./pages/DashboardModern";
import { Transactions } from "./pages/Transactions";
import { Categories } from "./pages/Categories";
import { Accounts } from "./pages/Accounts";
import { Analytics } from "./pages/Analytics";
import { CategoryDetail } from "./pages/CategoryDetail";
import { Budgets } from "./pages/Budgets";
import { Reports } from "./pages/Reports";
import { Goals } from "./pages/Goals";
import { Settings } from "./pages/Settings";
import { Loans } from "./pages/Loans";
import { Subscriptions } from "./pages/Subscriptions";
import { Forecast } from "./pages/Forecast";
import { Calendar } from "./pages/Calendar";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    errorElement: <ErrorPage />,
    children: [
      { index: true, Component: DashboardModern },
      { path: "transactions", Component: Transactions },
      { path: "categories", Component: Categories },
      { path: "categories/:id", Component: CategoryDetail },
      { path: "accounts", Component: Accounts },
      { path: "analytics", Component: Analytics },
      { path: "budgets", Component: Budgets },
      { path: "reports", Component: Reports },
      { path: "goals", Component: Goals },
      { path: "settings", Component: Settings },
      { path: "loans", Component: Loans },
      { path: "subscriptions", Component: Subscriptions },
      { path: "forecast", Component: Forecast },
      { path: "calendar", Component: Calendar },
    ],
  },
]);

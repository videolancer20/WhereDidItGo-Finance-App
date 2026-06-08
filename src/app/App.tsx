import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { FinanceProvider } from "./data/financeStore";
import { router } from "./routes";

export default function App() {
  return (
    <FinanceProvider>
      <RouterProvider router={router} />
      <Toaster theme="dark" richColors position="bottom-right" />
    </FinanceProvider>
  );
}

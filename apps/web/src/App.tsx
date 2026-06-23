import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Home = lazy(() => import("@/pages/Home"));
const Catalogo = lazy(() => import("@/pages/Catalogo"));
const AuthPage = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Overview = lazy(() => import("@/pages/app/Overview"));
const AgentPage = lazy(() => import("@/pages/app/Agent"));
const AnalyticsPage = lazy(() => import("@/pages/app/Analytics"));
const ChatSim = lazy(() => import("@/pages/app/Chat"));
const Knowledge = lazy(() => import("@/pages/app/Knowledge"));
const ServicesPage = lazy(() => import("@/pages/app/Services"));
const FlowsPage = lazy(() => import("@/pages/app/Flows"));
const AppointmentsPage = lazy(() => import("@/pages/app/Appointments"));
const OrdersPage = lazy(() => import("@/pages/app/Orders"));
const BroadcastPage = lazy(() => import("@/pages/app/Broadcast"));
const MockupsPage = lazy(() => import("@/pages/app/Mockups"));
const BuilderPage = lazy(() => import("@/pages/app/Builder"));
const FormsPage = lazy(() => import("@/pages/app/Forms"));
const TablesPage = lazy(() => import("@/pages/app/Tables"));
const PagesPage = lazy(() => import("@/pages/app/Pages"));
const AutomationsPage = lazy(() => import("@/pages/app/Automations"));
const CRMPage = lazy(() => import("@/pages/app/CRM"));
const ProjectsPage = lazy(() => import("@/pages/app/Projects"));
const ERPPage = lazy(() => import("@/pages/app/ERP"));
const TeamPage = lazy(() => import("@/pages/app/Team"));
const AccountingPage = lazy(() => import("@/pages/app/Accounting"));
const SupportPage = lazy(() => import("@/pages/app/Support"));
const RRHHPage = lazy(() => import("@/pages/app/RRHH"));
const FinanzasPage = lazy(() => import("@/pages/app/Finanzas"));
const CatalogAppPage = lazy(() => import("@/pages/app/Catalog"));
const CuentaPage = lazy(() => import("@/pages/app/Cuenta"));
const ROIPage = lazy(() => import("@/pages/app/ROI"));
const AdminPage = lazy(() => import("@/pages/app/Admin"));
const DocsPage = lazy(() => import("@/pages/app/Docs"));
const ChecklistPage = lazy(() => import("@/pages/app/Checklist"));
const ResearchPage = lazy(() => import("@/pages/app/Research"));
const ProspectorPage = lazy(() => import("@/pages/app/Prospector"));
const PedidoStatusPage = lazy(() => import("@/pages/PedidoStatus"));
const StudioPage = lazy(() => import("@/pages/Studio"));
const StudioAppPage = lazy(() => import("@/pages/app/studio"));
const IntegrationsPage = lazy(() => import("@/pages/app/Integrations"));
const ConnectWhatsAppPage = lazy(() => import("@/pages/app/ConnectWhatsApp"));
const EstrategiaPage = lazy(() => import("@/pages/app/Estrategia"));
const SystemMonitorPage = lazy(() => import("@/pages/app/SystemMonitor"));
const PartnersPage = lazy(() => import("@/pages/app/Partners"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      const msg = (error as Error)?.message ?? "";
      if (msg.startsWith("401") || msg.includes("HTTP 401")) {
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
    },
  }),
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );
}

function AppRoute({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/dashboard">{() => <Redirect to="/app" />}</Route>
        <Route path="/catalogo/:token" component={Catalogo} />
        <Route path="/pedido/:orderId" component={PedidoStatusPage} />
        <Route path="/reset-password" component={ResetPassword} />

        <Route path="/app">
          {() => <AppRoute><Overview /></AppRoute>}
        </Route>
        <Route path="/app/overview">{() => <Redirect to="/app" />}</Route>
        <Route path="/app/agent">
          {() => <AppRoute><AgentPage /></AppRoute>}
        </Route>
        <Route path="/app/analytics">
          {() => <AppRoute><AnalyticsPage /></AppRoute>}
        </Route>
        <Route path="/app/chat">
          {() => <AppRoute><ChatSim /></AppRoute>}
        </Route>
        <Route path="/app/knowledge">
          {() => <AppRoute><Knowledge /></AppRoute>}
        </Route>
        <Route path="/app/services">
          {() => <AppRoute><ServicesPage /></AppRoute>}
        </Route>
        <Route path="/app/flows">
          {() => <AppRoute><FlowsPage /></AppRoute>}
        </Route>
        <Route path="/app/appointments">
          {() => <AppRoute><AppointmentsPage /></AppRoute>}
        </Route>
        <Route path="/app/orders">
          {() => <AppRoute><OrdersPage /></AppRoute>}
        </Route>
        <Route path="/app/broadcast">
          {() => <AppRoute><BroadcastPage /></AppRoute>}
        </Route>
        <Route path="/app/catalog">
          {() => <AppRoute><CatalogAppPage /></AppRoute>}
        </Route>
        <Route path="/app/connect-whatsapp">
          {() => <AppRoute><ConnectWhatsAppPage /></AppRoute>}
        </Route>
        <Route path="/app/mockups">
          {() => <AppRoute><MockupsPage /></AppRoute>}
        </Route>
        <Route path="/app/builder">
          {() => <AppRoute><BuilderPage /></AppRoute>}
        </Route>
        <Route path="/app/forms">
          {() => <AppRoute><FormsPage /></AppRoute>}
        </Route>
        <Route path="/app/tables">
          {() => <AppRoute><TablesPage /></AppRoute>}
        </Route>
        <Route path="/app/pages">
          {() => <AppRoute><PagesPage /></AppRoute>}
        </Route>
        <Route path="/app/automations">
          {() => <AppRoute><AutomationsPage /></AppRoute>}
        </Route>
        <Route path="/app/crm">
          {() => <AppRoute><CRMPage /></AppRoute>}
        </Route>
        <Route path="/app/projects">
          {() => <AppRoute><ProjectsPage /></AppRoute>}
        </Route>
        <Route path="/app/erp">
          {() => <AppRoute><ERPPage /></AppRoute>}
        </Route>
        <Route path="/app/team">
          {() => <AppRoute><TeamPage /></AppRoute>}
        </Route>
        <Route path="/app/accounting">
          {() => <AppRoute><AccountingPage /></AppRoute>}
        </Route>
        <Route path="/app/support">
          {() => <AppRoute><SupportPage /></AppRoute>}
        </Route>
        <Route path="/app/rrhh">
          {() => <AppRoute><RRHHPage /></AppRoute>}
        </Route>
        <Route path="/app/finanzas">
          {() => <AppRoute><FinanzasPage /></AppRoute>}
        </Route>
        <Route path="/app/cuenta">
          {() => <AppRoute><CuentaPage /></AppRoute>}
        </Route>
        <Route path="/app/roi">
          {() => <AppRoute><ROIPage /></AppRoute>}
        </Route>
        <Route path="/app/admin">
          {() => <AppRoute><AdminPage /></AppRoute>}
        </Route>
        <Route path="/app/docs">
          {() => <AppRoute><DocsPage /></AppRoute>}
        </Route>
        <Route path="/app/checklist">
          {() => <AppRoute><ChecklistPage /></AppRoute>}
        </Route>
        <Route path="/app/research">
          {() => <AppRoute><ResearchPage /></AppRoute>}
        </Route>
        <Route path="/app/estrategia">
          {() => <AppRoute><EstrategiaPage /></AppRoute>}
        </Route>
        <Route path="/app/system">
          {() => <AppRoute><SystemMonitorPage /></AppRoute>}
        </Route>
        <Route path="/nosotros">{() => { window.location.replace('/#nosotros'); return null; }}</Route>
        <Route path="/casos">{() => { window.location.replace('/#casos'); return null; }}</Route>
        <Route path="/contacto">{() => { window.location.replace('/#contacto'); return null; }}</Route>
        <Route path="/studio" component={StudioPage} />

        <Route path="/app/prospector">
          {() => <AppRoute><ProspectorPage /></AppRoute>}
        </Route>
        <Route path="/app/integrations">
          {() => <AppRoute><IntegrationsPage /></AppRoute>}
        </Route>
        <Route path="/app/studio">
          {() => <AppRoute><StudioAppPage /></AppRoute>}
        </Route>
        <Route path="/app/partners">
          {() => <AppRoute><PartnersPage /></AppRoute>}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

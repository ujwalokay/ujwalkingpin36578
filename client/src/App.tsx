import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TourProvider, useTour } from "@/contexts/TourContext";
import { Sparkles, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";
import { ShortcutsProvider } from "@/contexts/ShortcutsContext";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import Analytics from "@/pages/Analytics";
import AIMaintenance from "@/pages/AIMaintenance";
import Food from "@/pages/Food";
import Inventory from "@/pages/Inventory";
import Expenses from "@/pages/Expenses";
import Timeline from "@/pages/Timeline";
import History from "@/pages/History";
import ActivityLogs from "@/pages/ActivityLogs";
import TermsAndConditions from "@/pages/TermsAndConditions";
import PublicStatus from "@/pages/PublicStatus";
import Home from "@/pages/Home";
import ConsumerGallery from "@/pages/ConsumerGallery";
import ConsumerFacilities from "@/pages/ConsumerFacilities";
import ConsumerGames from "@/pages/ConsumerGames";
import NotFound from "@/pages/not-found";
import { ConsumerNav } from "@/components/ConsumerNav";
import { CursorTrail } from "@/components/CursorTrail";
import { SplashScreen } from "@/components/SplashScreen";
import { NetworkAlert } from "@/components/NetworkAlert";
import { NotificationCenter } from "@/components/NotificationCenter";
import { InactivityRefreshPrompt } from "@/components/InactivityRefreshPrompt";
import { FlipClock } from "@/components/FlipClock";
import { useState } from "react";
import { useNetworkMonitor } from "@/hooks/useNetworkMonitor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/timeline" component={Timeline} />
      <Route path="/history" component={History} />
      <Route path="/activity-logs" component={ActivityLogs} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/ai-maintenance" component={AIMaintenance} />
      <Route path="/food" component={Food} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/settings" component={Settings} />
      <Route path="/reports" component={Reports} />
      <Route path="/terms" component={TermsAndConditions} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [, setLocation] = useLocation();
  const { showAlert, handleRefresh, handleDismiss} = useNetworkMonitor();

  const style = {
    "--sidebar-width": "16rem",
  };


  // Define global keyboard shortcuts
  const globalShortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcuts(true),
      category: 'General'
    },
    {
      key: 'k',
      ctrlKey: true,
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcuts(true),
      category: 'General'
    },
    {
      key: 't',
      ctrlKey: true,
      description: 'Toggle theme',
      action: () => {
        const themeToggle = document.querySelector('[data-testid="button-toggle-theme"]') as HTMLButtonElement;
        themeToggle?.click();
      },
      category: 'General'
    },
    {
      key: 'b',
      ctrlKey: true,
      description: 'Toggle sidebar',
      action: () => {
        const sidebarToggle = document.querySelector('[data-testid="button-sidebar-toggle"]') as HTMLButtonElement;
        sidebarToggle?.click();
      },
      category: 'General'
    },
    {
      key: '1',
      altKey: true,
      description: 'Go to Dashboard',
      action: () => setLocation('/'),
      category: 'Navigation'
    },
    {
      key: '2',
      altKey: true,
      description: 'Go to Timeline',
      action: () => setLocation('/timeline'),
      category: 'Navigation'
    },
    {
      key: '3',
      altKey: true,
      description: 'Go to History',
      action: () => setLocation('/history'),
      category: 'Navigation'
    },
    {
      key: '4',
      altKey: true,
      description: 'Go to Activity Logs',
      action: () => setLocation('/activity-logs'),
      category: 'Navigation'
    },
    {
      key: '5',
      altKey: true,
      description: 'Go to Analytics',
      action: () => setLocation('/analytics'),
      category: 'Navigation'
    },
    {
      key: '6',
      altKey: true,
      description: 'Go to Food Management',
      action: () => setLocation('/food'),
      category: 'Navigation'
    },
    {
      key: '7',
      altKey: true,
      description: 'Go to Expenses',
      action: () => setLocation('/expenses'),
      category: 'Navigation'
    },
    {
      key: '8',
      altKey: true,
      description: 'Go to Settings',
      action: () => setLocation('/settings'),
      category: 'Navigation'
    },
    {
      key: '9',
      altKey: true,
      description: 'Go to Reports',
      action: () => setLocation('/reports'),
      category: 'Navigation'
    }
  ];

  // Register global shortcuts
  useKeyboardShortcuts(globalShortcuts);

  if (showSplash) {
    return (
      <ThemeProvider>
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ShortcutsProvider globalShortcuts={globalShortcuts}>
          <TourProvider>
            <TooltipProvider>
              <SidebarProvider style={style as React.CSSProperties}>
                <div className="flex h-screen w-full">
                  <AppSidebar />
                  <div className="flex flex-col flex-1 min-w-0">
                    <header className="flex items-center justify-between p-3 md:p-4 border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                      <SidebarTrigger data-testid="button-sidebar-toggle" data-joyride="sidebar-toggle" />
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="text-xs md:text-sm font-medium hidden sm:block" data-testid="text-user-info">
                          Demo Mode
                        </div>
                        <div className="hidden md:block">
                          <FlipClock />
                        </div>
                        <div data-joyride="notification-center">
                          <NotificationCenter />
                        </div>
                        <div data-joyride="theme-toggle">
                          <ThemeToggle />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowShortcuts(true)}
                          data-testid="button-shortcuts"
                          aria-label="Keyboard shortcuts"
                          className="h-8 w-8 md:h-10 md:w-10"
                        >
                          <Keyboard className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                        <TakeTourButton />
                      </div>
                    </header>
                    <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
                      <Router />
                    </main>
                  </div>
                </div>
              </SidebarProvider>
              <KeyboardShortcutsDialog 
                open={showShortcuts} 
                onOpenChange={setShowShortcuts}
              />
              <NetworkAlert 
                open={showAlert}
                onRefresh={handleRefresh}
                onDismiss={handleDismiss}
              />
              <InactivityRefreshPrompt />
              <CursorTrail />
              <Toaster />
            </TooltipProvider>
          </TourProvider>
        </ShortcutsProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function TakeTourButton() {
  const { startTour } = useTour();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={startTour}
      data-testid="button-take-tour"
      data-joyride="take-tour-button"
      aria-label="Take Tour"
      className="hidden sm:flex items-center gap-1"
    >
      <Sparkles className="h-4 w-4" />
      <span className="hidden md:inline">Take Tour</span>
    </Button>
  );
}

export default App;

import { Settings, LayoutDashboard, FileText, UtensilsCrossed, CalendarClock, History, Scale, Wallet, ScrollText, BarChart3, Gamepad2, Sparkles, Brain, Package, Receipt } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/components/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import logoDark from "@assets/airavoto_logo.png";
import logoLight from "@assets/airavoto_logo.png";
import type { FoodItem, Expense } from "@shared/schema";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  countKey?: string;
  hasAI?: boolean;
  adminOnly?: boolean;
  tooltip: string;
}

interface MenuCategory {
  label: string;
  items: MenuItem[];
}

const menuCategories: MenuCategory[] = [
  {
    label: "Main Menu",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
        tooltip: "Manage active bookings, view seat availability, and control gaming sessions",
      },
      {
        title: "Timeline",
        url: "/timeline",
        icon: CalendarClock,
        tooltip: "Visual timeline view of all bookings showing session schedules",
      },
      {
        title: "History",
        url: "/history",
        icon: History,
        tooltip: "View past booking records and completed sessions",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Food",
        url: "/food",
        icon: UtensilsCrossed,
        tooltip: "Manage food menu items, pricing, and categories",
      },
      {
        title: "Inventory",
        url: "/inventory",
        icon: Package,
        countKey: "lowStock",
        tooltip: "Track food stock levels and get low stock alerts",
      },
      {
        title: "Expenses",
        url: "/expenses",
        icon: Wallet,
        tooltip: "Record and manage operational expenses",
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart3,
        hasAI: true,
        tooltip: "View detailed analytics with AI-powered traffic predictions",
      },
      {
        title: "Reports",
        url: "/reports",
        icon: FileText,
        adminOnly: true,
        tooltip: "Generate revenue reports and view booking statistics",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        title: "AI Maintenance",
        url: "/ai-maintenance",
        icon: Brain,
        hasAI: true,
        tooltip: "AI-powered predictive maintenance insights for devices",
      },
      {
        title: "Activity Logs",
        url: "/activity-logs",
        icon: ScrollText,
        tooltip: "View all administrative and staff actions audit trail",
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        tooltip: "Configure devices, pricing, and happy hours settings",
      },
      {
        title: "Terms & Conditions",
        url: "/terms",
        icon: Scale,
        adminOnly: true,
        tooltip: "View and manage service terms and conditions",
      },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { theme } = useTheme();

  const { data: foodItems = [] } = useQuery<FoodItem[]>({
    queryKey: ["/api/food"],
  });

  const lowStockCount = foodItems.filter(
    item => item.currentStock <= item.minStockLevel && item.category === "trackable"
  ).length;

  const counts = {
    lowStock: lowStockCount,
  };

  return (
    <Sidebar className="border-r bg-white dark:bg-gray-950">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-200 dark:border-gray-800">
            <img 
              src={theme === "dark" ? logoDark : logoLight} 
              alt="Airavoto Gaming Logo" 
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain"
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Airavoto Gaming</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</p>
            </div>
          </div>
        </SidebarGroup>

        {menuCategories.map((category) => (
            <SidebarGroup key={category.label}>
              <SidebarGroupLabel className="text-xs text-gray-500 dark:text-gray-400 px-4 py-2">
                {category.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {category.items.map((item) => {
                    const isActive = location === item.url;
                    const count = item.countKey ? counts[item.countKey as keyof typeof counts] : 0;
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton 
                                asChild 
                                isActive={isActive}
                                className={isActive ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 font-medium hover:bg-purple-100 dark:hover:bg-purple-950/50' : ''}
                                data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                                data-joyride={`sidebar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <Link href={item.url}>
                                  <item.icon className={isActive ? 'text-purple-600 dark:text-purple-400' : ''} />
                                  <span className="flex items-center gap-1.5 flex-1">
                                    {item.title}
                                    {item.hasAI && (
                                      <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />
                                    )}
                                  </span>
                                  {count > 0 && (
                                    <Badge 
                                      variant="secondary" 
                                      className="ml-auto bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-0"
                                    >
                                      {count}
                                    </Badge>
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>{item.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>
    </Sidebar>
  );
}

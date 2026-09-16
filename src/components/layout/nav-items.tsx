import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  BarChart3,
  CalendarDays,
  AlertTriangle,
  FileText,
  Wallet,
  Layers,
  Settings,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Journal", href: "/journal", icon: BookOpen },
  { label: "Add Trade", href: "/trades/new", icon: PlusCircle },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Mistakes", href: "/mistakes", icon: AlertTriangle },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Assets", href: "/assets", icon: Layers },
  { label: "Settings", href: "/settings", icon: Settings },
];

// The mobile bottom bar has room for 4 direct links plus a "More" sheet
// (see MobileNav) — every item in NAV_ITEMS must end up in one of these two
// lists, or it becomes unreachable on a phone-width screen.
export const MOBILE_PRIMARY_NAV_ITEMS: NavItem[] = [NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[2], NAV_ITEMS[3]];
export const MOBILE_MORE_NAV_ITEMS: NavItem[] = NAV_ITEMS.slice(4);

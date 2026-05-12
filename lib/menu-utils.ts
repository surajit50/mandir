import {
  LayoutDashboard,
  Gift,
  Wallet,
  FileText,
  Users,
  Building2,
  Settings,
  CreditCard,
  TrendingDown,
  BookOpen,
  ShoppingCart,
  Calendar,
  Archive,
  ListChecks,
  Package,
  Gem,
} from "lucide-react";

export type Role = "ADMIN" | "ACCOUNTANT" | "MEMBER";

export interface MenuItem {
  label: string;
  href: string;
  icon: any;
  roles: Role[] | boolean;
}

export interface MenuGroup {
  group: string;
  items: MenuItem[];
}

export const menuGroups: MenuGroup[] = [
  {
    group: "General",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: true,
      },
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: FileText,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Filing",
        href: "/dashboard/filing",
        icon: Archive,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
    ],
  },
  {
    group: "Financial",
    items: [
      {
        label: "Cash Ledger",
        href: "/dashboard/cash-ledger",
        icon: Wallet,
        roles: true,
      },
      {
        label: "Cash Book",
        href: "/dashboard/cash-book",
        icon: BookOpen,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Vouchers",
        href: "/dashboard/vouchers",
        icon: FileText,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "GL Accounts",
        href: "/dashboard/gl-accounts",
        icon: BookOpen,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Financial Years",
        href: "/dashboard/financial-years",
        icon: Calendar,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    group: "Banking",
    items: [
      {
        label: "Bank Accounts",
        href: "/dashboard/bank-accounts",
        icon: Building2,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Bank Passbook",
        href: "/dashboard/bank-passbook",
        icon: BookOpen,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Bank Reconciliation",
        href: "/dashboard/bank-reconciliation",
        icon: Building2,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Cheque Register",
        href: "/dashboard/cheques",
        icon: CreditCard,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Bank Deposits",
        href: "/dashboard/bank-deposits",
        icon: TrendingDown,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
    ],
  },
  {
    group: "Asset Management",
    items: [
      {
        label: "Asset Register",
        href: "/dashboard/assets",
        icon: Package,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Jewellery Register",
        href: "/dashboard/jewellery",
        icon: Gem,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        label: "Donations",
        href: "/dashboard/donations",
        icon: Gift,
        roles: ["ADMIN", "ACCOUNTANT", "MEMBER"],
      },
      {
        label: "Cash Handovers",
        href: "/dashboard/cash-handovers",
        icon: Wallet,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Festivals",
        href: "/dashboard/festivals",
        icon: Calendar,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Inventory",
        href: "/dashboard/inventory",
        icon: ShoppingCart,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
    ],
  },
  {
    group: "System",
    items: [
      {
        label: "Members",
        href: "/dashboard/members",
        icon: Users,
        roles: ["ADMIN"],
      },
      {
        label: "Audit Logs",
        href: "/dashboard/audit-logs",
        icon: ListChecks,
        roles: ["ADMIN"],
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
];

/**
 * Checks if a user role has access to a menu item
 */
export function hasAccess(item: MenuItem, role: string): boolean {
  if (item.roles === true) return true;
  return (item.roles as string[]).includes(role);
}

/**
 * Gets all visible menu items for a specific role
 */
export function getVisibleMenuItems(role: string) {
  return menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasAccess(item, role)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Gets the label for a path, checking all menu items
 */
export function getLabelForPath(path: string): string | undefined {
  for (const group of menuGroups) {
    const item = group.items.find((i) => i.href === path);
    if (item) return item.label;
  }
  return undefined;
}

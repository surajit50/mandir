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
  Plus,
  Handshake,
  Landmark,
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
        label: "Trust Committee",
        href: "/dashboard/committee",
        icon: Landmark,
        roles: true,
      },
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: FileText,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
    ],
  },
  {
    group: "Approvals & Review",
    items: [
      {
        label: "Voucher Approvals",
        href: "/dashboard/vouchers",
        icon: ListChecks,
        roles: ["ADMIN"],
      },
      {
        label: "Vouchers",
        href: "/dashboard/vouchers",
        icon: ListChecks,
        roles: ["ACCOUNTANT"],
      },
      {
        label: "Bank Deposits",
        href: "/dashboard/bank-deposits",
        icon: TrendingDown,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Cash Handovers",
        href: "/dashboard/cash-handovers",
        icon: Wallet,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
    ],
  },
  {
    group: "Data Entry",
    items: [
      {
        label: "New Voucher",
        href: "/dashboard/vouchers/new",
        icon: Plus,
        roles: ["ACCOUNTANT"],
      },
      {
        label: "Donations / Collections",
        href: "/dashboard/donations",
        icon: Gift,
        roles: ["ACCOUNTANT", "MEMBER"],
      },
      {
        label: "Cheque Register",
        href: "/dashboard/cheques",
        icon: CreditCard,
        roles: ["ACCOUNTANT"],
      },
      {
        label: "Bank Reconciliation",
        href: "/dashboard/bank-reconciliation",
        icon: Building2,
        roles: ["ACCOUNTANT"],
      },
      {
        label: "Donation Receipts",
        href: "/dashboard/receipts",
        icon: FileText,
        roles: ["ACCOUNTANT", "ADMIN"],
      },
    ],
  },
  {
    group: "Financial Books",
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
        label: "Bank Passbook",
        href: "/dashboard/bank-passbook",
        icon: BookOpen,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
    ],
  },
  {
    group: "Banking & Assets",
    items: [
      {
        label: "Bank Accounts",
        href: "/dashboard/bank-accounts",
        icon: Building2,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
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
      {
        label: "Inventory",
        href: "/dashboard/inventory",
        icon: ShoppingCart,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        label: "Festivals",
        href: "/dashboard/festivals",
        icon: Calendar,
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
      {
        label: "Filing",
        href: "/dashboard/filing",
        icon: Archive,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
    ],
  },
  {
    group: "System Management",
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
      {
        label: "Payees / Contacts",
        href: "/dashboard/payees",
        icon: Users,
        roles: ["ADMIN", "ACCOUNTANT"],
      },
      {
        label: "Temples",
        href: "/dashboard/temples",
        icon: Landmark,
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

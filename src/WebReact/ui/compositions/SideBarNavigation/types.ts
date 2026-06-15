import type { NavigationItem } from '@ui/navigation/app-navigation';

export interface SideBarNavigationProps {
  currentUserName?: string;
  homeHref?: string;
  initialCollapsed?: boolean;
  navigationItems?: NavigationItem[];
}

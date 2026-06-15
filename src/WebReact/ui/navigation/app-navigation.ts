export interface NavigationItem {
  title: string;
  href?: string;
  strict?: boolean;
  badge?: string;
  children?: NavigationItem[];
}

export const reportNavigationItems: NavigationItem[] = [
  { title: 'Overview', href: '/reports', strict: true },
  { title: 'Executive Summary', href: '/reports/executive-summary' },
  { title: 'AGP', href: '/reports/agp' },
  { title: 'Glucose Distribution', href: '/reports/glucose-distribution' },
  { title: 'Data Quality', href: '/reports/data-quality' },
  { title: 'Year Overview', href: '/reports/year-overview' },
  { title: 'Readings', href: '/reports/readings' },
  { title: 'Day in Review', href: '/reports/day-in-review' },
  { title: 'Week to Week', href: '/reports/week-to-week' },
  { title: 'Month to Month', href: '/reports/month-to-month' },
  { title: 'Comparison', href: '/reports/comparison' },
  { title: 'Steps', href: '/reports/steps' },
  { title: 'Heart Rate', href: '/reports/heart-rate' },
  { title: 'Sleep', href: '/reports/sleep' },
  { title: 'Treatments', href: '/reports/treatments' },
  { title: 'Basal Analysis', href: '/reports/basal-analysis' },
  { title: 'Insulin Delivery', href: '/reports/insulin-delivery' },
  { title: 'Site Change Impact', href: '/reports/site-change-impact' },
  { title: 'IDP', href: '/reports/idp' },
  { title: 'Battery', href: '/reports/battery' }
];

export const appNavigationItems: NavigationItem[] = [
  { title: 'Dashboard', href: '/', strict: true },
  { title: 'Calendar', href: '/calendar' },
  { title: 'Time Spans', href: '/time-spans' },
  {
    title: 'Reports',
    children: reportNavigationItems
  },
  { title: 'Clock', href: '/clock' },
  { title: 'Food', href: '/food' },
  { title: 'Meals', href: '/meals' },
  {
    title: 'Tools',
    children: [
      { title: 'Tools Home', href: '/tools', strict: true },
      { title: 'Packing', href: '/tools/packing' }
    ]
  },
  { title: 'Tenants', href: '/tenants' },
  {
    title: 'Alerts',
    children: [
      { title: 'Rules', href: '/alerts', strict: true },
      { title: 'Simulator', href: '/alerts/simulator' },
      { title: 'Do Not Disturb', href: '/alerts/dnd' },
      { title: 'History', href: '/alerts/history' }
    ]
  },
  {
    title: 'Dev Tools',
    children: [
      { title: 'Compatibility', href: '/compatibility', strict: true },
      { title: 'Test Endpoint Compatibility', href: '/compatibility/test' }
    ]
  },
  {
    title: 'Settings',
    children: [
      { title: 'Settings Home', href: '/settings', strict: true },
      { title: 'Setup', href: '/setup' },
      { title: 'Account', href: '/settings/account' },
      { title: 'Patient Record', href: '/settings/patient' },
      { title: 'Appearance', href: '/settings/appearance' },
      { title: 'Therapy', href: '/settings/profile' },
      { title: 'Data Quality', href: '/settings/data-quality' },
      { title: 'Notifications & Trackers', href: '/settings/trackers' },
      { title: 'Connectors & Apps', href: '/settings/connectors' },
      { title: 'Timezone History', href: '/settings/timezone' },
      { title: 'Sharing & Privacy', href: '/settings/members' },
      { title: 'Audit Log', href: '/settings/audit' },
      { title: 'Support & Community', href: '/settings/support' },
      { title: 'Tenant Management', href: '/settings/admin/tenants', badge: 'Admin' },
      {
        title: 'Reset Connector Cursors',
        href: '/settings/admin/connector-cursors',
        badge: 'Admin'
      }
    ]
  }
];

export function getFlatNavigationItems(items = appNavigationItems): NavigationItem[] {
  return items.flatMap((item) => [
    ...(item.href ? [item] : []),
    ...(item.children ? getFlatNavigationItems(item.children) : [])
  ]);
}

export function findNavigationItem(pathname: string): NavigationItem | undefined {
  return getFlatNavigationItems()
    .sort((left, right) => (right.href?.length ?? 0) - (left.href?.length ?? 0))
    .find((item) => {
      if (!item.href) {
        return false;
      }

      if (item.strict || item.href === '/') {
        return pathname === item.href;
      }

      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    });
}

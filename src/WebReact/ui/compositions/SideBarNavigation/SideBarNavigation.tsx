'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { appNavigationItems, type NavigationItem } from '@ui/navigation/app-navigation';
import type { SideBarNavigationProps } from './types';

const SIDEBAR_WIDTH_EXPANDED = '270px';
const SIDEBAR_WIDTH_COLLAPSED = '76px';
const SIDEBAR_COLLAPSED_COOKIE = 'nocturne-react-sidebar-collapsed';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getSidebarCollapsedPreference(): boolean | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${SIDEBAR_COLLAPSED_COOKIE}=`));

  if (!cookie) {
    return undefined;
  }

  return cookie.endsWith('=true');
}

function setSidebarCollapsedPreference(collapsed: boolean): void {
  document.cookie = [
    `${SIDEBAR_COLLAPSED_COOKIE}=${String(collapsed)}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax'
  ].join('; ');
}

function itemIsActive(item: NavigationItem, pathname: string): boolean {
  if (item.href) {
    if (item.strict || item.href === '/') {
      return pathname === item.href;
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return item.children?.some((child) => itemIsActive(child, pathname)) ?? false;
}

function navInitial(title: string): string {
  return title
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function NavGlyph({ title, className }: { title: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={className ? `sidebar-glyph ${className}` : 'sidebar-glyph'}
    >
      {navInitial(title)}
    </span>
  );
}

function SidebarLink({
  item,
  collapsed,
  labelClassName,
  nested = false
}: {
  item: NavigationItem;
  collapsed: boolean;
  labelClassName: string;
  nested?: boolean;
}) {
  const pathname = usePathname();

  if (!item.href) {
    return null;
  }

  const active = itemIsActive(item, pathname);

  return (
    <li className="sidebar-nav-item">
      <Link
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? item.title : undefined}
        className="sidebar-link"
        data-active={active ? 'true' : 'false'}
        data-has-badge={item.badge ? 'true' : 'false'}
        data-nested={nested ? 'true' : 'false'}
        href={item.href}
        title={collapsed ? item.title : undefined}
      >
        <NavGlyph title={item.title} />
        <span className={labelClassName}>{item.title}</span>
        {item.badge && !collapsed ? (
          <span className="sidebar-badge">
            {item.badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function SidebarGroup({
  item,
  collapsed,
  labelClassName
}: {
  item: NavigationItem;
  collapsed: boolean;
  labelClassName: string;
}) {
  const pathname = usePathname();
  const active = itemIsActive(item, pathname);
  const [expanded, setExpanded] = useState(true);

  if (!item.children) {
    return <SidebarLink collapsed={collapsed} item={item} labelClassName={labelClassName} />;
  }

  return (
    <li className="sidebar-nav-item">
      <button
        aria-expanded={expanded}
        className="sidebar-group-button"
        data-active={active ? 'true' : 'false'}
        onClick={() => setExpanded((current) => !current)}
        title={collapsed ? item.title : undefined}
        type="button"
      >
        <NavGlyph title={item.title} />
        <span className={labelClassName}>{item.title}</span>
        {!collapsed ? (
          <span className="sidebar-disclosure">{expanded ? 'Hide' : 'Show'}</span>
        ) : null}
      </button>
      {!collapsed ? (
        <div
          aria-hidden={!expanded}
          className="sidebar-subtree"
          data-expanded={expanded ? 'true' : 'false'}
        >
          <div className="sidebar-subtree-inner">
            <ul className="sidebar-sublist">
              {item.children.map((child) => (
                <SidebarLink
                  collapsed={collapsed}
                  item={child}
                  key={`${item.title}-${child.title}`}
                  labelClassName="sidebar-label"
                  nested
                />
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function SideBarNavigation({
  currentUserName = 'Nocturne',
  homeHref = '/',
  initialCollapsed = false,
  navigationItems = appNavigationItems
}: SideBarNavigationProps) {
  const [collapsed, setCollapsed] = useState(
    () => getSidebarCollapsedPreference() ?? initialCollapsed
  );
  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  const labelClassName = 'sidebar-label';

  useEffect(() => {
    document.documentElement.style.setProperty('--dashboard-sidebar-width', sidebarWidth);
    document.documentElement.dataset.sidebarCollapsed = collapsed ? 'true' : 'false';
  }, [collapsed, sidebarWidth]);

  return (
    <nav
      aria-label="Sidebar navigation"
      className="sidebar-navigation"
      data-sidebar-state={collapsed ? 'collapsed' : 'expanded'}
    >
      <div className="sidebar-brand-row">
        <Link
          aria-label="Nocturne"
          className="sidebar-brand-link"
          href={homeHref}
        >
          <span className="sidebar-wordmark">
            Nocturne
          </span>
          <span className="sidebar-logo-mark">
            N
          </span>
        </Link>
      </div>

      <div className="sidebar-scroll">
        <ul className="sidebar-list">
          {navigationItems.map((item) => (
            <SidebarGroup
              collapsed={collapsed}
              item={item}
              key={item.title}
              labelClassName={labelClassName}
            />
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
          className="sidebar-collapse-button"
          onClick={() => {
            const nextCollapsed = !collapsed;
            setCollapsed(nextCollapsed);
            setSidebarCollapsedPreference(nextCollapsed);
          }}
          title={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
          type="button"
        >
          <NavGlyph title={collapsed ? 'Expand' : 'Collapse'} />
          <span className={labelClassName}>{collapsed ? 'Expand' : 'Collapse'}</span>
        </button>
        <div className="sidebar-user-card">
          <span className="sidebar-user-avatar">
            {navInitial(currentUserName)}
          </span>
          <p className={labelClassName}>
            {currentUserName}
          </p>
        </div>
      </div>
    </nav>
  );
}

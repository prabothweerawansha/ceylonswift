import { NAVIGATION_REGISTRY } from './navigation-registry.js';

const asSet = values => new Set(Array.isArray(values) ? values : []);

export function allowedNavigationItems({ capabilities, capabilityStatus = 'ready' } = {}) {
  if (capabilityStatus !== 'ready' || !capabilities || !Array.isArray(capabilities.roles) || !Array.isArray(capabilities.permissions) || !capabilities.workspace?.type) return [];
  const roles = asSet(capabilities.roles);
  const permissions = asSet(capabilities.permissions);
  if (roles.has('SUPER_ADMIN')) return [];
  return NAVIGATION_REGISTRY.filter(item => {
    if (!item.workspaceTypes.includes(capabilities.workspace.type)) return false;
    if (item.requiredRoles?.length && !item.requiredRoles.some(role => roles.has(role))) return false;
    if (item.requiredPermissions?.some(permission => !permissions.has(permission))) return false;
    if (item.requiredAnyPermissions?.length && !item.requiredAnyPermissions.some(permission => permissions.has(permission))) return false;
    return true;
  });
}

export function allowedSectionIds(context) { return allowedNavigationItems(context).map(item => item.section); }
export function safeDefaultSection(context) { return allowedNavigationItems(context)[0]?.section ?? 'access-unavailable'; }
export function isSectionAllowed(section, context) { return allowedSectionIds(context).includes(section); }

const INTERNAL_ROLES = ['RIDER', 'AGENT', 'OFFICE_STAFF', 'BRANCH_MANAGER', 'ADMIN', 'OWNER'];
const CUSTOMER_ROLES = ['CUSTOMER', 'VIP_CUSTOMER'];
const PARTNER_ROLES = ['PARTNER_USER', 'PARTNER_ADMIN'];

export const NAVIGATION_REGISTRY = Object.freeze([
  Object.freeze({ id: 'partner-overview', label: 'Partner workspace', icon: 'P', section: 'partner-home', workspaceTypes: ['ORGANIZATION'], requiredRoles: PARTNER_ROLES }),
  Object.freeze({ id: 'track-shipment', label: 'Track Shipment', icon: 'T', section: 'customertrack', workspaceTypes: ['PERSONAL'], requiredRoles: CUSTOMER_ROLES, requiredPermissions: ['tracking.read.public'] }),
  Object.freeze({ id: 'book-delivery', label: 'Book Delivery', icon: 'B', section: 'customerrequest', workspaceTypes: ['PERSONAL'], requiredRoles: CUSTOMER_ROLES, requiredPermissions: ['package.create'] }),
  Object.freeze({ id: 'customer-reviews', label: 'Reviews', icon: 'R', section: 'customer-reviews', workspaceTypes: ['PERSONAL'], requiredRoles: CUSTOMER_ROLES, requiredPermissions: ['review.create'] }),
  Object.freeze({ id: 'operations-overview', label: 'Overview', icon: 'O', section: 'dashboard', workspaceTypes: ['ORGANIZATION'], requiredRoles: INTERNAL_ROLES.filter(role => role !== 'RIDER' && role !== 'AGENT'), requiredAnyPermissions: ['package.read.branch', 'package.read.organization'] }),
  Object.freeze({ id: 'assigned-deliveries', label: 'Assigned Deliveries', icon: 'D', section: 'packages', workspaceTypes: ['ORGANIZATION'], requiredRoles: INTERNAL_ROLES, requiredAnyPermissions: ['package.read.own', 'package.read.branch', 'package.read.organization'] }),
  Object.freeze({ id: 'hubs', label: 'Hubs & rates', icon: 'H', section: 'hubs', workspaceTypes: ['PERSONAL', 'ORGANIZATION'], requiredRoles: [...CUSTOMER_ROLES, ...INTERNAL_ROLES], requiredPermissions: ['hub.read'] }),
  Object.freeze({ id: 'team-directory', label: 'Team directory', icon: 'T', section: 'employees', workspaceTypes: ['ORGANIZATION'], requiredRoles: [...INTERNAL_ROLES.filter(role => role !== 'RIDER' && role !== 'AGENT'), 'PARTNER_ADMIN'], requiredPermissions: ['staff.read'] }),
  Object.freeze({ id: 'approvals', label: 'Approvals', icon: 'A', section: 'accesscontrol', workspaceTypes: ['ORGANIZATION'], requiredRoles: ['BRANCH_MANAGER', 'ADMIN', 'OWNER', 'PARTNER_ADMIN'], requiredAnyPermissions: ['rider.approve', 'staff.approve'] }),
  Object.freeze({ id: 'access-management', label: 'Access management', icon: 'M', section: 'access-management', workspaceTypes: ['ORGANIZATION'], requiredRoles: ['ADMIN', 'OWNER'], requiredPermissions: ['role.read'] }),
  Object.freeze({ id: 'website-content', label: 'Website content', icon: 'W', section: 'website-content', workspaceTypes: ['ORGANIZATION'], requiredRoles: ['OFFICE_STAFF', 'BRANCH_MANAGER', 'ADMIN', 'OWNER'], requiredPermissions: ['website_content.read'] }),
  Object.freeze({ id: 'review-moderation', label: 'Review moderation', icon: 'R', section: 'review-moderation', workspaceTypes: ['ORGANIZATION'], requiredRoles: ['ADMIN', 'OWNER'], requiredPermissions: ['review.moderate'] }),
  Object.freeze({ id: 'security', label: 'Security & sessions', icon: 'S', section: 'security-center', workspaceTypes: ['PERSONAL', 'ORGANIZATION'], requiredRoles: [...CUSTOMER_ROLES, ...INTERNAL_ROLES, ...PARTNER_ROLES], requiredPermissions: ['session.revoke.own'] }),
]);

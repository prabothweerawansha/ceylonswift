const queryString = values => {
  const query = new URLSearchParams();
  Object.entries(values || {}).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)); });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
};

export class WorkforceApi {
  constructor(request) { this.request = request; }
  employees(query, signal) { return this.request(`/employees${queryString(query)}`, { signal }); }
  employeeStatus(id, status, reason) { return this.request(`/employees/${id}/status`, { method: 'PATCH', body: { status, reason } }); }
  employeeBranch(id, branchId) { return this.request(`/employees/${id}/branch`, { method: 'PATCH', body: { branchId } }); }
  userStatus(id, status, reason) { return this.request(`/users/${id}/status`, { method: 'PATCH', body: { status, reason } }); }
  riders(query, signal) { return this.request(`/riders${queryString(query)}`, { signal }); }
  riderStatus(id, status, reason) { return this.request(`/riders/${id}/status`, { method: 'PATCH', body: { status, reason } }); }
  invitations(query, signal) { return this.request(`/invitations${queryString(query)}`, { signal }); }
  createInvitation(body) { return this.request('/invitations', { method: 'POST', body }); }
  revokeInvitation(id) { return this.request(`/invitations/${id}/revoke`, { method: 'POST', body: {} }); }
  acceptInvitation(body) { return this.request('/invitations/accept', { method: 'POST', body, authenticated: false }); }
  approvals(query, signal) { return this.request(`/approvals${queryString(query)}`, { signal }); }
  decideApproval(id, approve, reason) { return this.request(`/approvals/${id}/${approve ? 'approve' : 'reject'}`, { method: 'POST', body: { reason } }); }
  branches(organizationId, signal) { return this.request(`/organizations/${organizationId}/branches`, { signal }); }
}

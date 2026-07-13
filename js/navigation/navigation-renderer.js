import { allowedNavigationItems } from './navigation-policy.js';

export function renderPermissionNavigation(container, context, onSelect) {
  const items = allowedNavigationItems(context);
  container.replaceChildren(...items.map(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-item';
    button.dataset.tab = item.section;
    button.setAttribute('aria-label', item.label);
    const icon = document.createElement('span'); icon.className = 'nav-icon-mark'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = item.icon;
    const label = document.createElement('span'); label.className = 'nav-text'; label.textContent = item.label;
    button.append(icon, label);
    button.addEventListener('click', () => { activateNavigation(container, item.section); onSelect(item.section); });
    return button;
  }));
  return { items, allowedSections: items.map(item => item.section), defaultSection: items[0]?.section ?? 'access-unavailable' };
}

export function activateNavigation(container, section) {
  container.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.tab === section));
}

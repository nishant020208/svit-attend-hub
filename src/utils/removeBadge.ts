// Utility to remove Lovable badge from DOM
export const removeLovableBadge = () => {
  // Run multiple times to catch dynamically inserted badges
  const removeInterval = setInterval(() => {
    // Find all possible badge elements
    const selectors = [
      '[data-lovable-badge]',
      'iframe[src*="lovable.dev"]',
      'a[href*="lovable.dev"]',
      'a[href*="lovable.app"]',
      '[id*="lovable-badge"]',
      '[class*="lovable"]',
      '[class*="edit-in-lovable"]',
      'div[style*="lovable"]',
      'button[class*="lovable"]'
    ];

    let removed = false;
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
          removed = true;
        }
      });
    });

    // Also check for iframes without src
    document.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.getAttribute('src');
      if (src && (src.includes('lovable') || src.includes('badge'))) {
        iframe.parentNode?.removeChild(iframe);
        removed = true;
      }
    });
  }, 100);

  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(removeInterval), 10000);
};

// Auto-run on load
if (typeof window !== 'undefined') {
  removeLovableBadge();
  window.addEventListener('load', removeLovableBadge);
  document.addEventListener('DOMContentLoaded', removeLovableBadge);
}

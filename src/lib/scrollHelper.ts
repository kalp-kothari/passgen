/**
 * Utility to smoothly scroll to any application step/section.
 * Uses smooth scrolling and respects the top fixed navbar offset via CSS scroll-margin-top.
 */
export function scrollToStep(stepId: string) {
  const targetId = stepId.replace(/^#/, '');
  const el = document.getElementById(targetId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

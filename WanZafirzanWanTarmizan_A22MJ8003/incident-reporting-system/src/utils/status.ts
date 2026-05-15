export function getStatusLabel(status?: string | null): string {
  if (!status) return '';
  switch (status) {
    case 'published':
      return 'Resolved';
    case 'reviewed':
      return 'Reviewed';
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'closed':
      return 'Closed';
    default:
      return String(status).replace(/_/g, ' ');
  }
}

export function getStatusLabelUpper(status?: string | null): string {
  return getStatusLabel(status).toUpperCase();
}

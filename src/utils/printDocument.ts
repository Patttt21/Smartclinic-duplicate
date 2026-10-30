/**
 * Direct Real-Time Print Helper
 * Dispatches native browser window.print() after setting dynamic document title.
 */

export interface PrintDocumentOptions {
  title: string;
  isDark?: boolean;
  documentType: 'prescription' | 'receipt' | 'lab_report';
}

export function triggerRealtimePrint(options: PrintDocumentOptions): boolean {
  if (typeof window === 'undefined') return false;

  const originalTitle = document.title;
  if (options.title) {
    document.title = options.title;
  }

  const cleanup = () => {
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });

  try {
    window.focus();
    window.print();
    setTimeout(cleanup, 2000);
    return true;
  } catch (err) {
    console.error('window.print() error:', err);
    cleanup();
    return false;
  }
}

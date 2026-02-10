import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept when user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      shortcuts.forEach(({ key, ctrl, shift, alt, callback }) => {
        const ctrlMatch = ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shift ? event.shiftKey : !event.shiftKey;
        const altMatch = alt ? event.altKey : !event.altKey;

        // Skip bare-key shortcuts (no modifier) when typing in inputs
        const isBareKey = !ctrl && !shift && !alt;
        if (isBareKey && isTyping) return;
        
        if (
          event.key.toLowerCase() === key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          event.preventDefault();
          callback();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

// Pre-configured shortcuts hook for common actions
export function useTareasShortcuts(callbacks: {
  onQuickCreate?: () => void;
  onSearch?: () => void;
  onListView?: () => void;
  onKanbanView?: () => void;
  onCalendarView?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'k',
      ctrl: true,
      callback: () => callbacks.onQuickCreate?.(),
      description: 'Quick Create'
    },
    {
      key: 'f',
      ctrl: true,
      callback: () => callbacks.onSearch?.(),
      description: 'Buscar'
    },
    {
      key: 'l',
      callback: () => callbacks.onListView?.(),
      description: 'Vista Lista'
    },
    {
      key: 'k',
      callback: () => callbacks.onKanbanView?.(),
      description: 'Vista Kanban'
    },
    {
      key: 'c',
      callback: () => callbacks.onCalendarView?.(),
      description: 'Vista Calendario'
    }
  ];

  useKeyboardShortcuts(shortcuts.filter(s => s.callback));
}
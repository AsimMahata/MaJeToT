import { useRef, useCallback, useState } from 'react';
import api from '@/lib/api';
import { useProgressStore } from '@/store/progressStore';

interface PendingUpdate {
  sectionId: string;
  topicId?: string | null;
  type: 'checkbox' | 'lecture';
  checked?: boolean;
  lecturesDone?: number;
}

export function useProgress() {
  const pendingRef = useRef<Map<string, PendingUpdate>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const updateLocal = useProgressStore(s => s.updateLocal);

  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    if (pending.size === 0) return;

    const updates = Array.from(pending.values());
    pendingRef.current = new Map();

    setIsSaving(true);
    try {
      await api.patch('/progress', { updates });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save progress:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const queueUpdate = useCallback(
    (update: PendingUpdate) => {
      const key = `${update.sectionId}:${update.topicId || '_lecture'}`;
      pendingRef.current.set(key, update);

      // Optimistic local update
      if (update.type === 'checkbox') {
        updateLocal(update.sectionId, update.topicId || null, 'checkbox', update.checked!);
      } else {
        updateLocal(update.sectionId, null, 'lecture', update.lecturesDone!);
      }

      // Reset debounce
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 5000);
    },
    [flush, updateLocal]
  );

  return { queueUpdate, flush, isSaving, lastSaved };
}

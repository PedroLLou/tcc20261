import { useCallback, useEffect, useState } from 'react';
import feedbackProcessService from '../services/feedbackProcessService';
import type { FeedbackProcess } from '../types/feedback-process';

interface UseFeedbackProcessesResult {
  processes: FeedbackProcess[];
  isLoading: boolean;
  error: string;
  reload: () => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useFeedbackProcesses = (
  enabled: boolean,
): UseFeedbackProcessesResult => {
  const [processes, setProcesses] = useState<FeedbackProcess[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!enabled) {
      setProcesses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setProcesses(await feedbackProcessService.list());
      setError('');
    } catch {
      setError('Não foi possível carregar os processos.');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    feedbackProcessService
      .list()
      .then((nextProcesses) => {
        if (isMounted) {
          setProcesses(nextProcesses);
          setError('');
        }
      })
      .catch(() => {
        if (isMounted) setError('Não foi possível carregar os processos.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  const remove = useCallback(async (id: number) => {
    await feedbackProcessService.remove(id);
    setProcesses((current) => current.filter((process) => process.id !== id));
  }, []);

  return { processes, isLoading, error, reload, remove };
};

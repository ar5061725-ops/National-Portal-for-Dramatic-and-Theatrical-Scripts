'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/api/client';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface AsyncState<R> {
  status: AsyncStatus;
  data?: R;
  error?: string;
}

/**
 * يلفّ أي عملية غير متزامنة (إرسال نموذج، دفع…) بحالات موحّدة:
 * idle → loading → success | error، مع منع تحديث الحالة بعد إزالة المكوّن.
 */
export function useAsyncAction<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const [state, setState] = useState<AsyncState<R>>({ status: 'idle' });
  const actionRef = useRef(action);
  const mountedRef = useRef(true);

  useEffect(() => {
    actionRef.current = action;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    setState({ status: 'loading' });
    try {
      const data = await actionRef.current(...args);
      if (mountedRef.current) setState({ status: 'success', data });
      return data;
    } catch (error) {
      if (mountedRef.current) setState({ status: 'error', error: getErrorMessage(error) });
      return undefined;
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return {
    ...state,
    run,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}

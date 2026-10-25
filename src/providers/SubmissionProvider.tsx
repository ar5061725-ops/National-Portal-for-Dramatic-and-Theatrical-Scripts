'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import type { RequiredFileId, SubmissionDraft, WorkType } from '@/types';

const STORAGE_KEY = 'nsp.submission-draft.v1';

export const EMPTY_DRAFT: SubmissionDraft = {
  title: '',
  type: 'series',
  genres: ['social'],
  details: {},
  logline: '',
  workNo: '',
  files: {},
};

type Action =
  | { type: 'hydrate'; draft: SubmissionDraft }
  | { type: 'patch'; patch: Partial<SubmissionDraft> }
  | { type: 'setType'; workType: WorkType }
  | { type: 'toggleGenre'; genreId: string }
  | { type: 'setDetail'; key: string; value: string }
  | { type: 'setFile'; fileId: RequiredFileId; name: string }
  | { type: 'reset' };

function reducer(state: SubmissionDraft, action: Action): SubmissionDraft {
  switch (action.type) {
    case 'hydrate':
      return action.draft;
    case 'patch':
      return { ...state, ...action.patch };
    case 'setType':
      return { ...state, type: action.workType };
    case 'toggleGenre':
      return {
        ...state,
        genres: state.genres.includes(action.genreId)
          ? state.genres.filter((g) => g !== action.genreId)
          : [...state.genres, action.genreId],
      };
    case 'setDetail':
      return { ...state, details: { ...state.details, [action.key]: action.value } };
    case 'setFile':
      return { ...state, files: { ...state.files, [action.fileId]: action.name } };
    case 'reset':
      return EMPTY_DRAFT;
  }
}

interface SubmissionContextValue {
  draft: SubmissionDraft;
  /** false حتى تُقرأ المسودة من التخزين (لتفادي وميض الحالة الفارغة). */
  hydrated: boolean;
  patch: (patch: Partial<SubmissionDraft>) => void;
  setType: (type: WorkType) => void;
  toggleGenre: (genreId: string) => void;
  setDetail: (key: string, value: string) => void;
  setFile: (fileId: RequiredFileId, name: string) => void;
  reset: () => void;
}

const SubmissionContext = createContext<SubmissionContextValue | null>(null);

export function SubmissionProvider({ children }: { children: ReactNode }) {
  const [draft, dispatch] = useReducer(reducer, EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: 'hydrate', draft: { ...EMPTY_DRAFT, ...JSON.parse(raw) } });
    } catch {
      // التخزين غير متاح أو البيانات تالفة: نبدأ بمسودة فارغة.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // تجاهل أخطاء امتلاء التخزين أو الوضع الخاص.
    }
  }, [draft, hydrated]);

  const patch = useCallback((p: Partial<SubmissionDraft>) => dispatch({ type: 'patch', patch: p }), []);
  const setType = useCallback((workType: WorkType) => dispatch({ type: 'setType', workType }), []);
  const toggleGenre = useCallback((genreId: string) => dispatch({ type: 'toggleGenre', genreId }), []);
  const setDetail = useCallback((key: string, value: string) => dispatch({ type: 'setDetail', key, value }), []);
  const setFile = useCallback(
    (fileId: RequiredFileId, name: string) => dispatch({ type: 'setFile', fileId, name }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const value = useMemo(
    () => ({ draft, hydrated, patch, setType, toggleGenre, setDetail, setFile, reset }),
    [draft, hydrated, patch, setType, toggleGenre, setDetail, setFile, reset],
  );

  return <SubmissionContext.Provider value={value}>{children}</SubmissionContext.Provider>;
}

export function useSubmission(): SubmissionContextValue {
  const ctx = useContext(SubmissionContext);
  if (!ctx) throw new Error('useSubmission must be used inside <SubmissionProvider>');
  return ctx;
}

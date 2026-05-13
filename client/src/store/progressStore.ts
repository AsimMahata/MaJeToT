import { create } from 'zustand';
import api from '@/lib/api';

interface ProgressEntry {
  _id?: string;
  userId: string;
  groupId: string;
  sectionId: string;
  topicId: string | null;
  type: 'checkbox' | 'lecture';
  checked: boolean | null;
  lecturesDone: number | null;
}

interface ProgressState {
  myProgress: ProgressEntry[];
  groupProgress: ProgressEntry[];
  isLoading: boolean;
  fetchMyProgress: () => Promise<void>;
  fetchGroupProgress: (groupId: string) => Promise<void>;
  updateLocal: (sectionId: string, topicId: string | null, type: 'checkbox' | 'lecture', value: boolean | number) => void;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  myProgress: [],
  groupProgress: [],
  isLoading: false,

  fetchMyProgress: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/progress/me');
      set({ myProgress: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchGroupProgress: async (groupId: string) => {
    try {
      const { data } = await api.get(`/progress/group/${groupId}`);
      set({ groupProgress: data });
    } catch (err) {
      console.error('Failed to fetch group progress:', err);
    }
  },

  updateLocal: (sectionId, topicId, type, value) => {
    set((state) => {
      const existing = state.myProgress.find(
        p => p.sectionId === sectionId && p.topicId === topicId
      );

      if (existing) {
        return {
          myProgress: state.myProgress.map(p =>
            p.sectionId === sectionId && p.topicId === topicId
              ? {
                  ...p,
                  checked: type === 'checkbox' ? (value as boolean) : p.checked,
                  lecturesDone: type === 'lecture' ? (value as number) : p.lecturesDone,
                }
              : p
          ),
        };
      }

      return {
        myProgress: [
          ...state.myProgress,
          {
            userId: '',
            groupId: '',
            sectionId,
            topicId,
            type,
            checked: type === 'checkbox' ? (value as boolean) : null,
            lecturesDone: type === 'lecture' ? (value as number) : null,
          },
        ],
      };
    });
  },
}));

import { create } from 'zustand';

interface PointsState {
  points: number;
  addPoints: (amount: number) => void;
}

export const usePointsStore = create<PointsState>((set) => ({
  points: 0,
  addPoints: (amount) => set((state) => ({ points: state.points + amount })),
}));
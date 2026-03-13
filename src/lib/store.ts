import { create } from "zustand";

export type LocationData = {
  address: string;      // 전체 주소 (도로명)
  shortAddress: string; // 짧은 표시용 (예: "강남구 역삼동")
  lat: number;
  lng: number;
  radius: number;       // 검색 반경 (미터)
};

type FilterState = {
  budget: number;
  foodTypes: string[];
  people: number;
  withKids: boolean;
  travelMode: string;
  hasParking: boolean;
  location: LocationData | null;

  setBudget: (budget: number) => void;
  toggleFoodType: (type: string) => void;
  setPeople: (people: number) => void;
  setWithKids: (withKids: boolean) => void;
  setTravelMode: (mode: string) => void;
  setHasParking: (hasParking: boolean) => void;
  setLocation: (location: LocationData) => void;
  clearLocation: () => void;
  resetFilters: () => void;
};

const initialState = {
  budget: 0,
  foodTypes: [],
  people: 1,
  withKids: false,
  travelMode: "도보",
  hasParking: false,
  location: null,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,

  setBudget: (budget) => set({ budget }),

  toggleFoodType: (type) =>
    set((state) => ({
      foodTypes: state.foodTypes.includes(type)
        ? state.foodTypes.filter((t) => t !== type)
        : [...state.foodTypes, type],
    })),

  setPeople: (people) => set({ people }),

  setWithKids: (withKids) => set({ withKids }),

  setTravelMode: (travelMode) =>
    set({ travelMode, hasParking: travelMode === "차량" ? true : false }),

  setHasParking: (hasParking) => set({ hasParking }),

  setLocation: (location) => set({ location }),

  clearLocation: () => set({ location: null }),

  resetFilters: () => set(initialState),
}));

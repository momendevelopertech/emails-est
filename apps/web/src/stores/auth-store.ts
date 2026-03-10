import { create } from 'zustand';

export type UserProfile = {
    id: string;
    email: string;
    username?: string;
    fullName: string;
    fullNameAr?: string;
    role: 'SUPER_ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'BRANCH_SECRETARY' | 'SUPPORT' | 'EMPLOYEE';
    governorate?: 'CAIRO' | 'ALEXANDRIA' | null;
    mustChangePass?: boolean;
    department?: { id: string; name: string; nameAr?: string } | null;
    profileImage?: string | null;
    employeeNumber?: string;
};

type AuthState = {
    user: UserProfile | null;
    loading: boolean;
    bootstrapped: boolean;
    setUser: (user: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    setBootstrapped: (bootstrapped: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    bootstrapped: false,
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),
    setBootstrapped: (bootstrapped) => set({ bootstrapped }),
}));

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 2 * 60 * 1000,   // 2 minutes - data stays fresh longer
            gcTime: 15 * 60 * 1000,      // 15 minutes garbage collection
            refetchOnWindowFocus: false,  // Don't refetch on every tab switch
            refetchOnReconnect: true,
            refetchOnMount: 'always',
            retry: 1
        },
        mutations: {
            retry: 0
        }
    }
});
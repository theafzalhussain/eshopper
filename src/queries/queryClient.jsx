import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,     // 5 minutes - data stays fresh longer
            gcTime: 30 * 60 * 1000,       // keep it in memory for instant back-navigation
            refetchOnWindowFocus: false,  // don't refetch on every tab switch
            refetchOnReconnect: true,
            /* 'always' forced a network round trip on every single mount,
               which made navigating between pages feel slow even when the
               data was already fresh. Respect staleTime instead. */
            refetchOnMount: false,
            retry: 1,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
            /* keep showing cached data instead of flashing a spinner */
            notifyOnChangeProps: ['data', 'error', 'isLoading', 'isFetching']
        },
        mutations: {
            retry: 0
        }
    }
});

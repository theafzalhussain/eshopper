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
            /* keep showing cached data instead of flashing a spinner.
               `isFetching` was in this list, which meant every observer of a query
               re-rendered twice per background refetch — once when it started, once
               when it ended. Nothing in the app reads isFetching from these
               queries, so those renders bought nothing. */
            notifyOnChangeProps: ['data', 'error', 'isLoading']
        },
        mutations: {
            retry: 0
        }
    }
});

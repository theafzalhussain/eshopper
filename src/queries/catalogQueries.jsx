import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fastAPI } from '../Store/Services';
import { queryClient } from './queryClient';

export const catalogQueryKeys = {
    root: ['catalog'],
    products: ['catalog', 'products'],
    product: (id) => ['catalog', 'products', String(id || '')],
    maincategories: ['catalog', 'maincategories'],
    subcategories: ['catalog', 'subcategories'],
    brands: ['catalog', 'brands']
};

const asArray = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.products)) return response.products;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

const normalizeSingleProduct = (response) => {
    if (!response) return null;
    if (response.product) return response.product;
    if (response.data && !Array.isArray(response.data)) return response.data;
    return response;
};

/* The listing endpoint is paginated and caps a page at 100 items.
   Previously we fired a single unparameterised call, so the app silently
   only ever saw the newest 50 products. We now walk the pages (in parallel
   after the first) so the catalogue is always complete and still fast. */
const PAGE_SIZE = 100;
const MAX_PAGES = 12;

export const fetchProducts = async ({ signal } = {}) => {
    const first = await fastAPI(`/product/list?page=1&limit=${PAGE_SIZE}`, 'GET', null, 0, null, { signal });
    const items = asArray(first);

    const total = Number(first?.total || 0);
    const hasMore = first?.hasMore === true || (total > items.length);
    if (!hasMore || items.length === 0) return items;

    const pages = Math.min(MAX_PAGES, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) return items;

    const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
            fastAPI(`/product/list?page=${i + 2}&limit=${PAGE_SIZE}`, 'GET', null, 0, null, { signal })
                .then(asArray)
                .catch(() => [])
        )
    );

    return items.concat(...rest);
};

export const fetchProductById = async (id, { signal } = {}) => {
    if (!id) return null;
    try {
        const response = await fastAPI(`/product/${id}`, 'GET', null, 0, null, { signal });
        return normalizeSingleProduct(response);
    } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw error;
    }
};

export const fetchMaincategories = async ({ signal } = {}) => {
    const response = await fastAPI('/maincategory', 'GET', null, 0, null, { signal });
    return asArray(response);
};

export const fetchSubcategories = async ({ signal } = {}) => {
    const response = await fastAPI('/subcategory', 'GET', null, 0, null, { signal });
    return asArray(response);
};

export const fetchBrands = async ({ signal } = {}) => {
    const response = await fastAPI('/brand', 'GET', null, 0, null, { signal });
    return asArray(response);
};

export const useProductsQuery = () => useQuery({
    queryKey: catalogQueryKeys.products,
    queryFn: ({ signal }) => fetchProducts({ signal }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false
});

export const useProductQuery = (id) => useQuery({
    queryKey: catalogQueryKeys.product(id),
    queryFn: ({ signal }) => fetchProductById(id, { signal }),
    enabled: Boolean(id),
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Use cached product from the products list for instant display while fetching fresh data
    placeholderData: () => {
        const cachedProducts = queryClient.getQueryData(catalogQueryKeys.products);
        if (Array.isArray(cachedProducts) && id) {
            return cachedProducts.find(p => String(p._id || p.id) === String(id)) || undefined;
        }
        return undefined;
    }
});

export const useMaincategoriesQuery = () => useQuery({
    queryKey: catalogQueryKeys.maincategories,
    queryFn: ({ signal }) => fetchMaincategories({ signal }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
});

export const useSubcategoriesQuery = () => useQuery({
    queryKey: catalogQueryKeys.subcategories,
    queryFn: ({ signal }) => fetchSubcategories({ signal }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
});

export const useBrandsQuery = () => useQuery({
    queryKey: catalogQueryKeys.brands,
    queryFn: ({ signal }) => fetchBrands({ signal }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
});

export const invalidateCatalogQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: catalogQueryKeys.root });
};
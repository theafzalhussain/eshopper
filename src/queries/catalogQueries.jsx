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

export const fetchProducts = async ({ signal } = {}) => {
    const response = await fastAPI('/product/list', 'GET', null, 0, null, { signal });
    return asArray(response);
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
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true
});

export const useProductQuery = (id) => useQuery({
    queryKey: catalogQueryKeys.product(id),
    queryFn: ({ signal }) => fetchProductById(id, { signal }),
    enabled: Boolean(id),
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true
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
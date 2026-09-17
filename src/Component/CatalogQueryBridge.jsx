import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { GET_BRAND_RED, GET_MAINCATEGORY_RED, GET_PRODUCT_RED, GET_SUBCATEGORY_RED } from '../Store/Constant';
import { useBrandsQuery, useMaincategoriesQuery, useProductsQuery, useSubcategoriesQuery } from '../queries/catalogQueries';
import { catalogQueryKeys } from '../queries/catalogQueries';
import { queryClient } from '../queries/queryClient';

export default function CatalogQueryBridge() {
    const dispatch = useDispatch();
    const productsQuery = useProductsQuery();
    const maincategoriesQuery = useMaincategoriesQuery();
    const subcategoriesQuery = useSubcategoriesQuery();
    const brandsQuery = useBrandsQuery();

    /* Catalog invalidation lives here rather than in individual pages.
       Before, five customer pages (Cart, Checkout, confirmation, MyOrders,
       OrderTracking) each called invalidateQueries on mount purely to keep Redux
       warm — and because this bridge is a permanently active observer, every one of
       those forced an immediate refetch of the whole catalog. Walking
       Home -> Cart -> Checkout -> Confirmation re-downloaded it four times over.

       Now the refetch happens when the catalog has actually changed: the admin
       adds, edits or deletes a product, the server broadcasts dbChange, and this
       fires once for the entire app. Every screen gets the update, not just the
       ones that had a socket of their own. */
    useEffect(() => {
        let timer = null;

        const onDbChange = (event) => {
            const collection = event && event.detail && event.detail.collection;
            if (collection && collection !== 'products') return;

            /* coalesce bursts — a bulk admin edit emits one event per product */
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                queryClient.invalidateQueries({ queryKey: catalogQueryKeys.products });
                queryClient.invalidateQueries({ queryKey: catalogQueryKeys.maincategories });
                queryClient.invalidateQueries({ queryKey: catalogQueryKeys.subcategories });
                queryClient.invalidateQueries({ queryKey: catalogQueryKeys.brands });
            }, 400);
        };

        window.addEventListener('realtime:dbChange', onDbChange);
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('realtime:dbChange', onDbChange);
        };
    }, []);

    useEffect(() => {
        if (Array.isArray(productsQuery.data)) {
            dispatch({ type: GET_PRODUCT_RED, data: productsQuery.data });
        }
    }, [dispatch, productsQuery.data]);

    useEffect(() => {
        if (Array.isArray(maincategoriesQuery.data)) {
            dispatch({ type: GET_MAINCATEGORY_RED, data: maincategoriesQuery.data });
        }
    }, [dispatch, maincategoriesQuery.data]);

    useEffect(() => {
        if (Array.isArray(subcategoriesQuery.data)) {
            dispatch({ type: GET_SUBCATEGORY_RED, data: subcategoriesQuery.data });
        }
    }, [dispatch, subcategoriesQuery.data]);

    useEffect(() => {
        if (Array.isArray(brandsQuery.data)) {
            dispatch({ type: GET_BRAND_RED, data: brandsQuery.data });
        }
    }, [dispatch, brandsQuery.data]);

    return null;
}
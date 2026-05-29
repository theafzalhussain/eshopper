import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { GET_BRAND_RED, GET_MAINCATEGORY_RED, GET_PRODUCT_RED, GET_SUBCATEGORY_RED } from '../Store/Constant';
import { useBrandsQuery, useMaincategoriesQuery, useProductsQuery, useSubcategoriesQuery } from '../queries/catalogQueries';

export default function CatalogQueryBridge() {
    const dispatch = useDispatch();
    const productsQuery = useProductsQuery();
    const maincategoriesQuery = useMaincategoriesQuery();
    const subcategoriesQuery = useSubcategoriesQuery();
    const brandsQuery = useBrandsQuery();

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
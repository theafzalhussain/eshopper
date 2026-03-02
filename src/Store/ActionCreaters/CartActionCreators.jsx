import {ADD_CART, CLEAR_CART, DELETE_CART, GET_CART, UPDATE_CART } from "../Constant";

export function addCart(data){
    return{
        type:ADD_CART,
        payload:data
    }
}
export function getCart(){
    return{
        type:GET_CART,
       
    }
}
export function updateCart(data){
    return{
        type:UPDATE_CART,
        payload:data
    }
}
export function deleteCart(data){
    return{
        type:DELETE_CART,
        payload:data
    }
}

export function clearCart(data){
    return{
        type:CLEAR_CART,
        payload:data
    }
}
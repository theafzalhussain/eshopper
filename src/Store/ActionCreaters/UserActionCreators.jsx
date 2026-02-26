import {ADD_USER, DELETE_USER, GET_USER, UPDATE_USER, FORGET_PASSWORD } from "../Constant";

export function addUser(data){
    return{
        type:ADD_USER,
        payload:data
    }
}
export function getUser(){
    return{
        type:GET_USER,

    }
}
export function updateUser(data){
    return{
        type:UPDATE_USER,
        payload:data
    }
}
export function deleteUser(data){
    return{
        type:DELETE_USER,
        payload:data
    }
}
export function forgetPassword(data){
    return{
        type:FORGET_PASSWORD,
        payload:data
    }
}
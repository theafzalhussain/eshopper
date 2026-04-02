import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { BASE_URL } from '../constants'

const MembershipContext = createContext({
    membershipType: 'Silver',
    totalOrders: 0,
    loading: false,
    refreshMembership: () => {},
})

export function MembershipProvider({ children }) {
    const [membershipType, setMembershipType] = useState(localStorage.getItem('membershipType') || 'Silver')
    const [totalOrders, setTotalOrders] = useState(Number(localStorage.getItem('totalOrders') || 0))
    const [loading, setLoading] = useState(false)

    const refreshMembership = useCallback(async () => {
        const userId = localStorage.getItem('userid')
        if (!userId) {
            setMembershipType('Silver')
            setTotalOrders(0)
            localStorage.setItem('membershipType', 'Silver')
            localStorage.setItem('totalOrders', '0')
            return
        }

        try {
            setLoading(true)
            const response = await axios.get(`${BASE_URL}/api/membership/check`, {
                params: { userId },
                timeout: 10000,
            })
            const data = response?.data || {}
            const nextType = data.membershipType || 'Silver'
            const nextOrders = Number(data.totalOrders || 0)

            setMembershipType(nextType)
            setTotalOrders(nextOrders)
            localStorage.setItem('membershipType', nextType)
            localStorage.setItem('totalOrders', String(nextOrders))
        } catch (error) {
            const fallbackType = localStorage.getItem('membershipType') || 'Silver'
            const fallbackOrders = Number(localStorage.getItem('totalOrders') || 0)
            setMembershipType(fallbackType)
            setTotalOrders(fallbackOrders)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refreshMembership()

        const handleMembershipEvent = () => refreshMembership()
        const handleFocus = () => refreshMembership()

        window.addEventListener('profile-updated', handleMembershipEvent)
        window.addEventListener('membership-updated', handleMembershipEvent)
        window.addEventListener('focus', handleFocus)

        return () => {
            window.removeEventListener('profile-updated', handleMembershipEvent)
            window.removeEventListener('membership-updated', handleMembershipEvent)
            window.removeEventListener('focus', handleFocus)
        }
    }, [refreshMembership])

    return (
        <MembershipContext.Provider value={{ membershipType, totalOrders, loading, refreshMembership }}>
            {children}
        </MembershipContext.Provider>
    )
}

export function useMembership() {
    return useContext(MembershipContext)
}
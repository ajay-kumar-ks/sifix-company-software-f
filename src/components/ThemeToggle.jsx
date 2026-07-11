import React, {useEffect, useState} from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'

export default function ThemeToggle(){
  const [dark, setDark] = useState(()=>{
    if (typeof window === 'undefined') return false
    return localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(()=>{
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  },[dark])

  return (
    <button onClick={()=>setDark(d => !d)} className="p-2 rounded bg-gray-200 dark:bg-gray-700">
      {dark ? <FaSun /> : <FaMoon />}
    </button>
  )
}

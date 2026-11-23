'use client'

import {useState} from 'react'
import Image from 'next/image'
import {useDemoPhoto} from '../../lib/demo-photo'

export default function ProfileAvatar({initials, size = 44}: {initials: string; size?: number}) {
  const photo = useDemoPhoto()
  const [broken, setBroken] = useState('')
  return <span aria-hidden className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-100 font-semibold text-pink-700" style={{width: size, height: size}}>
    {photo && broken !== photo ?
      <Image unoptimized src={photo} width={size} height={size} alt="" onError={() => setBroken(photo)}/> : initials}
  </span>
}

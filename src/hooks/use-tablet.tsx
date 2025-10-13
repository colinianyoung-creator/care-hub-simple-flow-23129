import * as React from "react"

const TABLET_BREAKPOINT_MIN = 768
const TABLET_BREAKPOINT_MAX = 1199

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)
  const [orientation, setOrientation] = React.useState<'landscape' | 'portrait'>('landscape')

  React.useEffect(() => {
    const tabletQuery = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT_MIN}px) and (max-width: ${TABLET_BREAKPOINT_MAX}px)`)
    const orientationQuery = window.matchMedia('(orientation: portrait)')
    
    const updateTabletState = () => {
      const isTabletSize = window.innerWidth >= TABLET_BREAKPOINT_MIN && window.innerWidth <= TABLET_BREAKPOINT_MAX
      const isPortraitOrientation = window.innerHeight > window.innerWidth
      
      setIsTablet(isTabletSize)
      setOrientation(isPortraitOrientation ? 'portrait' : 'landscape')
    }

    const onTabletChange = () => updateTabletState()
    const onOrientationChange = () => updateTabletState()

    tabletQuery.addEventListener("change", onTabletChange)
    orientationQuery.addEventListener("change", onOrientationChange)
    
    updateTabletState()

    return () => {
      tabletQuery.removeEventListener("change", onTabletChange)
      orientationQuery.removeEventListener("change", onOrientationChange)
    }
  }, [])

  return { 
    isTablet: !!isTablet, 
    orientation,
    isTabletLandscape: !!isTablet && orientation === 'landscape',
    isTabletPortrait: !!isTablet && orientation === 'portrait'
  }
}
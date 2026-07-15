import IconDensityLarge from '@material-symbols/svg-400/outlined/density_large.svg?react'
import IconDensitySmall from '@material-symbols/svg-400/outlined/density_small.svg?react'
import { Icon } from '@higgsfield/quanta/icon'
import { Slider } from '@higgsfield/quanta/slider'
import { Typography } from '@higgsfield/quanta/typography'
import { DENSITY_ROW_HEIGHTS } from './use-justified-gallery.ts'

/**
 * Column-density control. A Quanta stepped `Slider` maps its notches to the
 * gallery's target row heights: dragging right increases density (smaller
 * tiles / more per row), dragging left makes tiles larger. Changing it triggers
 * a layout recompute in the engine while scroll anchoring keeps the view stable.
 */
export interface DensityControlProps {
  value: number
  onChange: (level: number) => void
}

export function DensityControl({ value, onChange }: DensityControlProps) {
  const steps = DENSITY_ROW_HEIGHTS.length
  return (
    <div className="flex items-center gap-2">
      <Typography as="span" variant="caption-sm-medium" color="tertiary" className="hidden sm:inline">
        Density
      </Typography>
      <Icon as={IconDensityLarge} size="sm" color="tertiary" aria-hidden="true" />
      <Slider
        aria-label="Tile density"
        steps={steps}
        value={value}
        onChange={onChange}
        className="w-32"
      />
      <Icon as={IconDensitySmall} size="sm" color="tertiary" aria-hidden="true" />
    </div>
  )
}

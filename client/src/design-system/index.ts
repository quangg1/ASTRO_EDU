/**
 * Canonical entry point for the design system.
 *
 * Prefer `import { Button, Card, … } from '@/design-system'` over deep imports
 * so that future moves of primitive files stay invisible to consumers.
 */

export { Button } from './primitives/Button'
export type { ButtonProps } from './primitives/Button'

export { Card } from './primitives/Card'
export type { CardProps } from './primitives/Card'

export { Input, Textarea } from './primitives/Input'
export type { InputProps, TextareaProps } from './primitives/Input'

export { Badge } from './primitives/Badge'
export type { BadgeProps } from './primitives/Badge'

export { Dialog, DialogFooter, DialogCloseButton } from './primitives/Dialog'
export type { DialogProps } from './primitives/Dialog'

export { Tabs, Tab, TabList, TabPanel } from './primitives/Tabs'
export type { TabProps } from './primitives/Tabs'

export { Tooltip } from './primitives/Tooltip'
export type { TooltipProps } from './primitives/Tooltip'

export { ToastProvider, useToast } from './primitives/Toast'

export { Select } from './primitives/Select'
export type { SelectProps } from './primitives/Select'

export {
  space,
  radius,
  duration,
  easing,
  type SpaceKey,
  type RadiusKey,
  type DurationKey,
  type EasingKey,
} from './tokens/primitive'

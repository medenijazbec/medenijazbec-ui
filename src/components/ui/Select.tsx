import type { SelectHTMLAttributes } from 'react'
import cx from 'classnames'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx('px-2 py-2 rounded border border-emerald-400 bg-transparent text-emerald-300', className)}
      {...props}
    />
  )
}

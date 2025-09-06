import type { ButtonHTMLAttributes } from 'react'
import cx from 'classnames'

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx('px-3 py-2 rounded border border-emerald-400 text-emerald-300 hover:bg-emerald-500/10', className)}
      {...props}
    />
  )
}

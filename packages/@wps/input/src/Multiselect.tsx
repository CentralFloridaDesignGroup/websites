import { useEffect, useRef, useState } from 'react'

interface MultiselectComponentProps {
  field: string
  label: string
  columns?: number
  options?: { key: string, value: string }[]
  onChange?: (field: string, value: string) => void
  separator?: string
  helperText?: string
  exportType?: 'key' | 'value'
}

export function Multiselect ({
  field,
  label,
  columns = 1,
  options = [],
  onChange,
  separator = ', ',
  helperText = '',
  exportType = 'key'
}: MultiselectComponentProps) {
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const hasInteractedRef = useRef(false)
  const onChangeRef = useRef(onChange)

  const formatSelectedValues = (values: string[]): string => {
    if (!values.length) return ''
    if (values.length === 1) return values[0]
    if (values.length === 2) return values.join(' and ')
    const allButLast = values.slice(0, -1).join(separator)
    const last = values[values.length - 1]
    return `${allButLast}, and ${last}`
  }

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const handleCheckboxChange = (optionValue: string): void => {
    setSelectedValues((prev) => {
      hasInteractedRef.current = true
      if (prev.includes(optionValue)) {
        return prev.filter((val) => val !== optionValue)
      }
      return [...prev, optionValue]
    })
  }

  useEffect(() => {
    if (!hasInteractedRef.current) return
    onChangeRef.current?.(field, formatSelectedValues(selectedValues))
  }, [field, selectedValues, separator])

  const getGridColsClass = (cols: number): string => {
    const colMap: Record<number, string> = {
      1: 'md:col-span-1',
      2: 'md:col-span-2',
      3: 'md:col-span-3',
      4: 'md:col-span-4',
      5: 'md:col-span-5',
      6: 'md:col-span-6',
    }
    return colMap[cols] || 'md:col-span-1'
  }

  return (
    <fieldset className={`mb-4 ${getGridColsClass(columns)} gap-2`}>
      <legend className="block text-sm font-medium text-gray-900 mb-2">
        {label}
      </legend>
      {helperText && (
        <p className="mt-1 text-sm text-gray-500 mb-2">{helperText}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((option, index) => {
          const optionValue = exportType === 'key' ? option.key : option.value
          const optionLabel = option.key
          const displayValue = option.value
          const optionId = `${field}-${index}`
          const isSelected = selectedValues.includes(optionValue)

          return (
            <label
              key={optionId}
              htmlFor={optionId}
              className={`relative flex items-start p-4 border cursor-pointer transition-all dark:border-gray-700 dark:bg-gray-800 ${
                isSelected
                  ? 'border-2 border-primary dark:border-primary-500 bg-primary/10 dark:bg-primary-500/10'
                  : 'border border-gray-200 dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <div className="flex h-6 items-center">
                <input
                  id={optionId}
                  name={field}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleCheckboxChange(optionValue)}
                  className="size-4 rounded border-gray-300 text-nile-blue focus:ring-2 focus:ring-nile-blue focus:ring-offset-0 sr-only dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-nile-blue dark:focus:ring-offset-gray-800"
                />
              </div>
              <div className="ml-3 text-sm/6 flex-1">
                <span className="font-medium text-gray-900 dark:text-gray-300">
                  {optionLabel}
                </span>
                {displayValue && (
                  <>
                    <br />
                    {displayValue}
                  </>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
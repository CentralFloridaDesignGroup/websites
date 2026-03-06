import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Combobox, ComboboxButton, ComboboxOption, ComboboxOptions } from '@headlessui/react';

type NorthSouth = 'North' | 'South'
type EastWest = 'East' | 'West'

interface BearingErrors {
    degrees: boolean;
    minutes: boolean;
    seconds: boolean;
}


export interface BearingProperties {
    field: string;
    label?: string;
    value?: string;
    onChange?: (field: string, value: string) => void;
    properties?: {
        required?: boolean;
    }
}

export function Bearing({ field, label, onChange, properties }: BearingProperties): React.JSX.Element {
    const [northSouth, setNorthSouth] = useState<NorthSouth>('North')
    const [degrees, setDegrees] = useState<string>('')
    const [minutes, setMinutes] = useState<string>('')
    const [seconds, setSeconds] = useState<string>('')
    const [eastWest, setEastWest] = useState<EastWest>('East')
    const [errors, setErrors] = useState<BearingErrors>({ degrees: false, minutes: false, seconds: false })

    const convertNumber = (val: string): string => {
        const formatter = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
            minimumIntegerDigits: 2
        })
        return formatter.format(Number(val || 0))
    }

    const validateDegrees = (value: string): boolean => {
        if (value === '') return true
        const num = parseFloat(value)
        return !isNaN(num) && num >= 0 && num <= 90
    }

    const validateMinutes = (value: string): boolean => {
        if (value === '') return true
        const num = parseFloat(value)
        return !isNaN(num) && num >= 0 && num <= 59
    }

    const validateSeconds = (value: string): boolean => {
        if (value === '') return true
        const num = parseFloat(value)
        return !isNaN(num) && num >= 0 && num <= 59
    }

    const handleChange = (
        newNorth: NorthSouth,
        newDegrees: string,
        newMinutes: string,
        newSeconds: string,
        newEast: EastWest
    ): void => {
        const bearingString = `${newNorth} ${convertNumber(newDegrees)}°${convertNumber(newMinutes)}'${convertNumber(newSeconds)}" ${newEast}`
        onChange?.(field, bearingString.trim())
    }

    const hasError = errors.degrees || errors.minutes || errors.seconds

    return (
        <div>
            <label htmlFor={`${field}-northSouth`} className={`${label ? '' : 'hidden'} block text-sm/6 font-medium text-gray-900 dark:text-gray-300 text-start ${properties?.required ? 'after:text-red-500 after:content-["*"]' : ''}`}>
                {label}
            </label>
            <div id={field}>
                <div className={`flex w-full items-center bg-gray-50/20 py-1 text-gray-900 dark:text-gray-300 dark:bg-gray-700/75 border-b ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} transition focus-within:border-primary focus-within:border-b-2`}>
                    <Combobox as="div" className="relative px-2" value={northSouth} onChange={(value) => {
                        const newNorth = value as NorthSouth
                        setNorthSouth(newNorth)
                        handleChange(newNorth, degrees, minutes, seconds, eastWest)
                    }
                    }>
                        <div className="relative">
                            <ComboboxButton className="flex items-center gap-1 text-sm/6 text-gray-900 dark:text-gray-300 focus:outline-none">
                                {northSouth}
                                <ChevronDown aria-hidden="true" className="size-4 text-gray-500 dark:text-gray-400" />
                            </ComboboxButton>
                            <ComboboxOptions className="absolute mt-1 w-full rounded-md bg-white shadow-lg z-10">
                                <ComboboxOption value="North" className={({ selected }) => `cursor-pointer select-none px-2 py-1 text-sm/6 ${selected ? 'bg-primary text-white' : 'text-gray-900 dark:text-gray-300 dark:bg-gray-700'}`}>
                                    North
                                </ComboboxOption>
                                <ComboboxOption value="South" className={({ selected }) => `cursor-pointer select-none px-2 py-1 text-sm/6 ${selected ? 'bg-primary text-white' : 'text-gray-900 dark:text-gray-300 dark:bg-gray-700'}`}>
                                    South
                                </ComboboxOption>
                            </ComboboxOptions>
                        </div>
                    </Combobox>
                    <input
                        id={`${field}-degrees`}
                        name={`${field}-degrees`}
                        type="number"
                        placeholder="00"
                        value={degrees}
                        onChange={(e) => {
                            const value = e.target.value
                            setDegrees(value)
                            const isValid = validateDegrees(value)
                            setErrors(prev => ({ ...prev, degrees: !isValid }))
                            handleChange(northSouth, value, minutes, seconds, eastWest)
                        }}
                        className="block min-w-0 w-12 bg-transparent py-0 pr-1 pl-1 text-sm/6 text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-300"
                    />
                    <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6">°</div>
                    <input
                        id={`${field}-minutes`}
                        name={`${field}-minutes`}
                        type="number"
                        placeholder="00"
                        value={minutes}
                        onChange={(e) => {
                            const value = e.target.value
                            setMinutes(value)
                            const isValid = validateMinutes(value)
                            setErrors(prev => ({ ...prev, minutes: !isValid }))
                            handleChange(northSouth, degrees, value, seconds, eastWest)
                        }}
                        className="block min-w-0 w-12 bg-transparent py-0 pr-1 pl-1 text-sm/6 text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-300"
                    />
                    <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6">'</div>
                    <input
                        id={`${field}-seconds`}
                        name={`${field}-seconds`}
                        type="number"
                        placeholder="00"
                        value={seconds}
                        onChange={(e) => {
                            const value = e.target.value
                            setSeconds(value)
                            const isValid = validateSeconds(value)
                            setErrors(prev => ({ ...prev, seconds: !isValid }))
                            handleChange(northSouth, degrees, minutes, value, eastWest)
                        }}
                        className="block min-w-0 w-12 bg-transparent py-0 pr-1 pl-1 text-sm/6 text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-300"
                    />
                    <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6">"</div>

                    <Combobox as="div" className="relative px-2" value={eastWest} onChange={(value) => {
                        const newEast = value as EastWest
                        setEastWest(newEast)
                        handleChange(northSouth, degrees, minutes, seconds, newEast)
                    }
                    }>
                        <div className="relative">
                            <ComboboxButton className="flex items-center gap-1 text-sm/6 text-gray-900 dark:text-gray-300 focus:outline-none">
                                {eastWest}
                                <ChevronDown aria-hidden="true" className="size-4 text-gray-500 dark:text-gray-400" />
                            </ComboboxButton>
                            <ComboboxOptions className="absolute mt-1 w-full rounded-md bg-white shadow-lg z-10">
                                <ComboboxOption value="East" className={({ focus, selected }) => `cursor-pointer select-none px-2 py-1 text-sm/6 ${selected ? 'bg-primary text-white' : 'text-gray-900 dark:text-gray-300 dark:bg-gray-700'} ${focus ? 'bg-gray-100 dark:bg-gray-600' : ''}`}>
                                    East
                                </ComboboxOption>
                                <ComboboxOption value="West" className={({ focus, selected }) => `cursor-pointer select-none px-2 py-1 text-sm/6 ${selected ? 'bg-primary text-white' : 'text-gray-900 dark:text-gray-300 dark:bg-gray-700'} ${focus ? 'bg-gray-100 dark:bg-gray-600' : ''}`}>
                                    West
                                </ComboboxOption>
                            </ComboboxOptions>
                        </div>
                    </Combobox>
                </div>
                {hasError && (
                    <div className="mt-0.5 text-sm text-red-600 text-start" id={`${field}-error`}>
                        {errors.degrees && <div><span className="font-medium">Error: </span>Degrees must be between 0 and 90</div>}
                        {errors.minutes && <div><span className="font-medium">Error: </span>Minutes must be between 0 and 59</div>}
                        {errors.seconds && <div><span className="font-medium">Error: </span>Seconds must be between 0 and 59</div>}
                    </div>
                )}
            </div>
        </div>
    )
}
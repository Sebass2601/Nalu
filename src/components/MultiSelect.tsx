"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

// A generic "pick many from a list" control. The tutorial builds this on top of
// a Popover + cmdk Command combobox; this project has neither installed, so we
// reuse the Dialog + Badge components that already exist here. Same public API.
export function MultiSelect<Option>({
    options,
    getValue,
    getLabel,
    selectedValues,
    onSelectedValuesChange,
    selectPlaceholder = "Select",
    searchPlaceholder = "Search",
    noSearchResultsMessage = "No results",
}: {
    options: Option[]
    getValue: (option: Option) => string
    getLabel: (option: Option) => React.ReactNode
    selectedValues: string[]
    onSelectedValuesChange: (values: string[]) => void
    selectPlaceholder?: string
    searchPlaceholder?: string
    noSearchResultsMessage?: string
}) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const filteredOptions = options.filter(option =>
        String(getLabel(option)).toLowerCase().includes(search.toLowerCase())
    )

    function toggle(value: string) {
        if (selectedValues.includes(value)) {
            onSelectedValuesChange(selectedValues.filter(v => v !== value))
        } else {
            onSelectedValuesChange([...selectedValues, value])
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="justify-between h-auto py-1.5 px-2 min-h-9 hover:bg-background w-full"
                >
                    <div className="flex gap-1 flex-wrap">
                        {selectedValues.length > 0 ? (
                            selectedValues.map(value => {
                                const option = options.find(o => getValue(o) === value)
                                if (option == null) return null

                                return (
                                    <Badge key={value} variant="outline">
                                        {getLabel(option)}
                                    </Badge>
                                )
                            })
                        ) : (
                            <span className="text-muted-foreground">{selectPlaceholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectPlaceholder}</DialogTitle>
                    <DialogDescription>
                        Click an item to add or remove it from the selection.
                    </DialogDescription>
                </DialogHeader>
                <Input
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
                    {filteredOptions.length === 0 ? (
                        <div className="text-muted-foreground text-sm py-2 text-center">
                            {noSearchResultsMessage}
                        </div>
                    ) : (
                        filteredOptions.map(option => {
                            const value = getValue(option)
                            const isSelected = selectedValues.includes(value)

                            return (
                                <button
                                    type="button"
                                    key={value}
                                    onClick={() => toggle(value)}
                                    className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                                >
                                    <Check
                                        className={cn(
                                            "size-4 shrink-0",
                                            isSelected ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {getLabel(option)}
                                </button>
                            )
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

"use client"

import * as React from "react"
import { CalendarPlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTrigger,
} from "@/components/ui/drawer"

export function CalendarComponent() {
    const [open, setOpen] = React.useState(false)
    const [date, setDate] = React.useState<Date | undefined>(undefined)

    const formatDateRussian = (date: Date) => {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    return (
        <div className="flex flex-col gap-3">
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button
                        variant="outline"
                        id="date"
                        className="w-48 justify-between font-normal"
                    >
                        {date ? formatDateRussian(date) : "Выберите дату"}
                        <CalendarPlusIcon />
                    </Button>
                </DrawerTrigger>
                <DrawerContent className="w-auto overflow-hidden p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                            setDate(date)
                            setOpen(false)
                        }}
                        className="mx-auto [--cell-size:clamp(0px,calc(100vw/7),60px)]"
                    />
                </DrawerContent>
            </Drawer>
        </div>
    )
}
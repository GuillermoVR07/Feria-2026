"use client"

import * as React from "react"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const Form = FormProvider

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return <Controller {...props} />
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-2", className)} {...props} />
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label className={cn("text-foreground", className)} {...props} />
}

function FormControl(props: React.ComponentProps<"div">) {
  return <div {...props} />
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-muted-foreground text-sm", className)} {...props} />
}

function FormMessage({ name, className, ...props }: React.ComponentProps<"p"> & { name?: string }) {
  const {
    formState: { errors },
  } = useFormContext()
  const error = name ? errors[name] : undefined
  const message = typeof error?.message === "string" ? error.message : props.children

  if (!message) {
    return null
  }

  return (
    <p className={cn("text-destructive text-sm", className)} {...props}>
      {message}
    </p>
  )
}

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage }

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type EmptyFlowStateProps = {
  icon: LucideIcon
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}

export function EmptyFlowState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyFlowStateProps) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {actionHref && actionLabel ? (
        <CardContent>
          <Link href={actionHref} className={buttonVariants()}>
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </CardContent>
      ) : null}
    </Card>
  )
}

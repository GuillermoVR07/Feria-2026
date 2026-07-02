import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AssetViewerProps = {
  originalUrl?: string | null
  gradcamUrl?: string | null
}

export function AssetViewer({ originalUrl, gradcamUrl }: AssetViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Imagenes del caso</CardTitle>
        <CardDescription>URLs temporales firmadas generadas por Supabase.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Original</p>
          {originalUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={originalUrl} alt="Imagen original del caso" className="h-72 w-full rounded-lg border object-contain" />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
              Imagen original no disponible
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Grad-CAM</p>
          {gradcamUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gradcamUrl} alt="Grad-CAM del caso" className="h-72 w-full rounded-lg border object-contain" />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-lg border bg-muted px-4 text-center text-sm text-muted-foreground">
              Grad-CAM no disponible en esta prueba
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

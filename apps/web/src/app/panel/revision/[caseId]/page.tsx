import { ReviewForm } from "@/components/review/review-form";

export default async function ReviewCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Detalle de revision</h1>
        <p className="text-sm text-muted-foreground">
          Usa el ID del caso para registrar una revision interna.
        </p>
      </div>
      <ReviewForm caseId={caseId} />
    </div>
  );
}

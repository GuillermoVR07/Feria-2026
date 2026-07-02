import { ReviewTable } from "@/components/review/review-table";

export default function ReviewPage() {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Revision especialista</h1>
        <p className="text-sm text-muted-foreground">
          Registro interno para especialista o administrador.
        </p>
      </div>
      <ReviewTable />
    </div>
  );
}

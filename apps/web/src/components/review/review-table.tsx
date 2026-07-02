import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ReviewTable() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Cola de revision</CardTitle>
          <CardDescription>
            El listado automatizado queda pendiente hasta contar con una funcion de cola.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert>
            <AlertTitle>Listado pendiente</AlertTitle>
            <AlertDescription>
              Por ahora el registro se realiza con el ID del caso. No se consulta una
              tabla directa desde el navegador.
            </AlertDescription>
          </Alert>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Endpoint de listado</TableCell>
                <TableCell className="text-muted-foreground">Pendiente backend</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Registro de revision</TableCell>
                <TableCell className="text-muted-foreground">Disponible por case_id</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div>
            <Link href="/panel/revision/manual" className={buttonVariants()}>
              Registrar revision manual
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

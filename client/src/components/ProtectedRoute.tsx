import { dbGetItem } from "@/lib/dbStorage";
import { Route, Redirect } from "wouter";
import { hasAccess } from "@/lib/permissions";
import { ShieldOff } from "lucide-react";

export default function ProtectedRoute({
  component: Component,
  path,
  page,
}: {
  component: React.ComponentType<any>;
  path: string;
  page: string;
}) {
  return (
    <Route path={path}>
      {(params) => {
        const user = JSON.parse(dbGetItem("user") || "null");

        if (!user) {
          return <Redirect to="/" />;
        }

        if (page !== "*" && !hasAccess(user, page)) {
          return (
            <div className="flex items-center justify-center h-[60vh] flex-col gap-4 text-center p-8">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldOff className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">لا تملك صلاحية الوصول</p>
                <p className="text-sm text-muted-foreground mt-1">You don't have permission to access this page</p>
              </div>
              <p className="text-xs text-muted-foreground/60 bg-muted px-3 py-1 rounded-md font-mono">{page}</p>
            </div>
          );
        }

        return <Component {...params} />;
      }}
    </Route>
  );
}

import { Route, Redirect } from "wouter";
import { hasAccess, type SystemUser } from "@/lib/permissions";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<unknown>;
  page: string;
}

export default function ProtectedRoute({ component: Component, path, page }: ProtectedRouteProps) {
  return (
    <Route path={path}>
      {(params) => {
        const user: SystemUser | null = JSON.parse(localStorage.getItem("user") || "null");

        if (!user) {
          return <Redirect to="/" />;
        }

        if (!user.active) {
          localStorage.removeItem("user");
          return <Redirect to="/" />;
        }

        if (!hasAccess(user, page)) {
          return (
            <div className="flex items-center justify-center h-screen">
              <div className="text-center space-y-2">
                <p className="text-4xl">🚫</p>
                <p className="text-lg font-semibold">لا تملك صلاحية الوصول لهذه الصفحة</p>
                <p className="text-sm text-muted-foreground">تواصل مع مدير النظام لمنحك الصلاحية</p>
              </div>
            </div>
          );
        }

        return <Component {...params} />;
      }}
    </Route>
  );
}

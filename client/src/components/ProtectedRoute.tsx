import { dbGetItem } from "@/lib/dbStorage";
import { Route, Redirect } from "wouter";
import { hasAccess } from "@/lib/permissions";

export default function ProtectedRoute({ component: Component, path, page }: { component: React.ComponentType<any>; path: string; page: string }) {
  return (
    <Route path={path}>
      {(params) => {
        const user = JSON.parse(dbGetItem("user") || "null");

        if (!user) {
          return <Redirect to="/" />;
        }

        if (!hasAccess(user, page)) {
          return <div style={{ padding: 40 }}>🚫 لا تملك صلاحية</div>;
        }

        return <Component {...params} />;
      }}
    </Route>
  );
}

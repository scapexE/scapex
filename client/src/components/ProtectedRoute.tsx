import { Route, Redirect } from "wouter";
import { hasAccess } from "@/lib/permissions";

export default function ProtectedRoute({ component: Component, path, page }: { component: React.ComponentType<any>; path: string; page: string }) {
  return (
    <Route path={path}>
      {(params) => {
        const user = JSON.parse(localStorage.getItem("user") || "null");

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

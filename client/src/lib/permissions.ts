export function hasAccess(user, page) {
  if (!user) return false;

  if (user.role === "admin") return true;

  const permissions = {
    accountant: ["dashboard"],
    engineer: ["dashboard"],
    client: ["dashboard"],
  };

  return permissions[user.role]?.includes(page);
}

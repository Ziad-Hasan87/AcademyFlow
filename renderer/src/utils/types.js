
export const ROLES = ["Teacher", "Observer", "Admin", "Student", "Moderator"];
export const PermissionLevels = {
    "Admin": 0,
    "Moderator": 1,
    "Teacher": 2,
    "Observer": 3,
    "Student": 4
};
export function hasPermission(userRole, requiredRole) {
    return PermissionLevels[userRole] <= PermissionLevels[requiredRole];
}
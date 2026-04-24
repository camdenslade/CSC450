const AVATAR_COLORS = [
  { bg: "#E8F0FE", text: "#1967D2" },
  { bg: "#FCE8F3", text: "#9C27B0" },
  { bg: "#E6F4EA", text: "#1E8E3E" },
  { bg: "#FEF3E2", text: "#E37400" },
  { bg: "#FDE8E8", text: "#C5221F" },
  { bg: "#E4F7FB", text: "#007B83" },
  { bg: "#F3E8FD", text: "#6200EE" },
  { bg: "#E8F5E9", text: "#2E7D32" },
];

export function avatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

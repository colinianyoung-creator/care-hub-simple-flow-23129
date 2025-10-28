export const logUserContext = (user: any, familyId: string | undefined, role: string) => {
  console.log("🧭 Context Snapshot", {
    userId: user?.id || "None",
    role: role || "Unknown",
    familyId: familyId || "None",
    timestamp: new Date().toISOString(),
  });
};

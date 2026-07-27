export type CurrentEmployeeContext = {
  businessId: string;
  employeeId: string;
  permissions: string[];
};

export async function getCurrentEmployeeContext(): Promise<CurrentEmployeeContext> {
  return {
    businessId: "seed-business",
    employeeId: "seed-employee",
    permissions: [
      "tables.read",
      "tables.update_status",
      "sessions.start",
      "sessions.pause",
      "sessions.resume",
      "sessions.extend",
      "sessions.end",
      "settings.update"
    ]
  };
}

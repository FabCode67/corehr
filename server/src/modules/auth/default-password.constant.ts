/** Every employee gets this password on creation and is expected to change
 *  it afterward from their profile page (see AuthService.changePassword).
 *  Kept as its own tiny module so both AuthService and EmployeesService can
 *  import it without depending on each other. */
export const DEFAULT_EMPLOYEE_PASSWORD = "Staff@123"

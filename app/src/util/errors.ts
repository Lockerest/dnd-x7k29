/** A readable message for anything thrown (Errors give their message). */
export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

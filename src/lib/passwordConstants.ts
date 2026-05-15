// Constants that need to be readable from both server actions ("use server")
// and client components. Server-only modules and "use server" files can't
// expose plain values to client components — only async functions — so any
// number/string shared with the UI lives here.

export const MIN_PASSWORD_LEN = 8;

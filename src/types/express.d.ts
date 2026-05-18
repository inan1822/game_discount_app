// Augment Express Request so req.user is typed throughout the project
declare namespace Express {
  interface User {
    id:   string
    role: string
  }
}

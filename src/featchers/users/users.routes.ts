import { Router } from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { isAdmin } from "../../shared/middlewares/shared.admin.js"
import { getUser, getAll, deleteUser, updateUser, promoteToAdmin, deleteMyUser } from "./users.controller.js"

const userRouter: Router = Router()

// Admin: get all users
userRouter.get("/admin", authMiddleware, isAdmin, getAll)

// Get user by id (public)
userRouter.get("/:id", getUser)

// Admin: delete any user
userRouter.delete("/admin/:id", authMiddleware, isAdmin, deleteUser)

// User: delete own account (requires password confirmation)
userRouter.delete("/:id", authMiddleware, deleteMyUser)

// Admin: promote user to admin
userRouter.patch("/role/:id", authMiddleware, isAdmin, promoteToAdmin)

// User: update own profile
userRouter.patch("/:id", authMiddleware, updateUser)

export default userRouter

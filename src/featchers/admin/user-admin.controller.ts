import { Request, Response, NextFunction } from "express"
import userModel from "../users/User.model.js"
import { Order } from "../orders/Order.model.js"

// ── GET /api/v1/admin/users ─────────────────────────────────────────────────
export async function listUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const page   = Math.max(1, parseInt(String(req.query.page  || "1")))
        const limit  = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"))))
        const search = String(req.query.search || "").trim()
        const role   = String(req.query.role   || "")
        const banned = req.query.banned // "true" | "false" | undefined

        const filter: Record<string, unknown> = {}

        if (search) {
            filter.$or = [
                { name:  { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ]
        }
        if (role === "user" || role === "admin") {
            filter.role = role
        }
        if (banned === "true")  filter.isBanned = true
        if (banned === "false") filter.isBanned = { $ne: true }

        const [users, total] = await Promise.all([
            userModel
                .find(filter)
                .select("name email role isVerified isBanned avatar lastSeenAt createdAt")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            userModel.countDocuments(filter),
        ])

        res.json({
            users,
            total,
            page,
            pages: Math.ceil(total / limit),
        })
    } catch (err) {
        next(err)
    }
}

// ── GET /api/v1/admin/users/:id ─────────────────────────────────────────────
export async function getUser(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await userModel
            .findById(req.params.id)
            .select("name email role isVerified isBanned avatar lastSeenAt createdAt notificationPrefs isPrivate")
            .lean()

        if (!user) {
            res.status(404).json({ message: "User not found" })
            return
        }

        // Attach order summary
        const [orderCount, recentOrders, lifetimeSpend] = await Promise.all([
            Order.countDocuments({ customerUserId: user._id }),
            Order.find({ customerUserId: user._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select("_id totalAmount status createdAt items")
                .lean(),
            Order.aggregate([
                { $match: { customerUserId: user._id, status: { $in: ["paid", "delivered"] } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),
        ])

        res.json({
            user,
            orderCount,
            recentOrders,
            lifetimeSpend: lifetimeSpend[0]?.total ?? 0,
        })
    } catch (err) {
        next(err)
    }
}

// ── PATCH /api/v1/admin/users/:id ───────────────────────────────────────────
// Allowed patches: isBanned, role
export async function updateUser(req: Request, res: Response, next: NextFunction) {
    try {
        const { isBanned, role } = req.body as { isBanned?: boolean; role?: string }

        const patch: Record<string, unknown> = {}
        if (typeof isBanned === "boolean") patch.isBanned = isBanned
        if (role === "user" || role === "admin") patch.role = role

        if (Object.keys(patch).length === 0) {
            res.status(400).json({ message: "No valid fields to update" })
            return
        }

        const user = await userModel
            .findByIdAndUpdate(req.params.id, patch, { new: true })
            .select("name email role isVerified isBanned avatar lastSeenAt")
            .lean()

        if (!user) {
            res.status(404).json({ message: "User not found" })
            return
        }

        res.json({ user })
    } catch (err) {
        next(err)
    }
}

// ── DELETE /api/v1/admin/users/:id ──────────────────────────────────────────
// Hard-delete only if user has no orders — otherwise refuse.
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
        const orderCount = await Order.countDocuments({ customerUserId: req.params.id })
        if (orderCount > 0) {
            res.status(400).json({
                message: `Cannot delete — user has ${orderCount} order(s). Ban them instead.`,
            })
            return
        }

        const user = await userModel.findByIdAndDelete(req.params.id).lean()
        if (!user) {
            res.status(404).json({ message: "User not found" })
            return
        }

        res.json({ message: "User deleted" })
    } catch (err) {
        next(err)
    }
}

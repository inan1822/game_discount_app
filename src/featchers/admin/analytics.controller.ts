import { Request, Response, NextFunction } from "express"
import { Order } from "../orders/Order.model.js"
import userModel from "../users/User.model.js"

// ── GET /api/v1/admin/analytics?period=30 ─────────────────────────────────
// period: 7 | 30 | 90  (days, default 30)
export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const rawPeriod = parseInt(String(req.query.period || "30"))
    const period    = [7, 30, 90].includes(rawPeriod) ? rawPeriod : 30

    const now        = new Date()
    const periodStart = new Date(now)
    periodStart.setDate(now.getDate() - (period - 1))
    periodStart.setHours(0, 0, 0, 0)

    const prevStart = new Date(periodStart)
    prevStart.setDate(periodStart.getDate() - period)

    // ── Revenue series (delivered, per day) ─────────────────────────────────
    const revenueByDay = await Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: periodStart } } },
      {
        $group: {
          _id:     { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ])
    const revenueMap = Object.fromEntries(revenueByDay.map(r => [r._id as string, r.revenue as number]))

    const revenueSeries = Array.from({ length: period }).map((_, i) => {
      const d = new Date(periodStart)
      d.setDate(periodStart.getDate() + i)
      const date = d.toISOString().slice(0, 10)
      return { date, revenue: revenueMap[date] ?? 0 }
    })
    const revenueTotal = revenueSeries.reduce((s, r) => s + r.revenue, 0)

    // ── Orders series (all statuses, per day) ────────────────────────────────
    const ordersByDay = await Order.aggregate([
      { $match: { createdAt: { $gte: periodStart } } },
      {
        $group: {
          _id:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ])
    const ordersMap = Object.fromEntries(ordersByDay.map(r => [r._id as string, r.count as number]))
    const ordersSeries = Array.from({ length: period }).map((_, i) => {
      const d = new Date(periodStart)
      d.setDate(periodStart.getDate() + i)
      const date = d.toISOString().slice(0, 10)
      return { date, count: ordersMap[date] ?? 0 }
    })

    // ── Orders by status (total for period) ──────────────────────────────────
    const statusAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: periodStart } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    const byStatus: Record<string, number> = {
      pending: 0, paid: 0, delivered: 0, cancelled: 0, refunded: 0,
    }
    for (const s of statusAgg) byStatus[s._id as string] = s.count as number
    const ordersTotal = Object.values(byStatus).reduce((a, b) => a + b, 0)

    // ── Average order value ───────────────────────────────────────────────────
    const avgOrderValue = ordersTotal === 0 ? 0 : Number((revenueTotal / (byStatus.delivered || ordersTotal)).toFixed(2))

    // ── New user signups per day ──────────────────────────────────────────────
    const signupsByDay = await userModel.aggregate([
      { $match: { createdAt: { $gte: periodStart } } },
      {
        $group: {
          _id:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ])
    const signupsMap = Object.fromEntries(signupsByDay.map(r => [r._id as string, r.count as number]))
    const signupsSeries = Array.from({ length: period }).map((_, i) => {
      const d = new Date(periodStart)
      d.setDate(periodStart.getDate() + i)
      const date = d.toISOString().slice(0, 10)
      return { date, count: signupsMap[date] ?? 0 }
    })
    const newUsersTotal = signupsSeries.reduce((s, r) => s + r.count, 0)

    // ── Category breakdown (revenue + units for period) ───────────────────────
    const categoryAgg = await Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: periodStart } } },
      { $unwind: "$items" },
      {
        $lookup: {
          from:         "products",
          localField:   "items.productId",
          foreignField: "_id",
          as:           "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id:     "$product.category",
          revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          count:   { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
    ])
    const categoryBreakdown = categoryAgg.map(c => ({
      category: (c._id as string) ?? "unknown",
      revenue:  c.revenue as number,
      count:    c.count   as number,
    }))

    // ── Top 8 products (revenue) ──────────────────────────────────────────────
    const topProductsAgg = await Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: periodStart } } },
      { $unwind: "$items" },
      {
        $group: {
          _id:     "$items.productId",
          name:    { $first: "$items.productName" },
          sold:    { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ])
    const topProducts = topProductsAgg.map(p => ({
      id:      (p._id as { toString(): string }).toString(),
      name:    p.name    as string,
      sold:    p.sold    as number,
      revenue: p.revenue as number,
    }))

    res.json({
      period,
      revenue: { total: revenueTotal, series: revenueSeries },
      orders:  { total: ordersTotal,  byStatus, series: ordersSeries },
      users:   { newTotal: newUsersTotal, series: signupsSeries },
      topProducts,
      categoryBreakdown,
      avgOrderValue,
    })
  } catch (err) {
    next(err)
  }
}

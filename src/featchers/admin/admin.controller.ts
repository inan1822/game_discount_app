import { Request, Response, NextFunction } from "express"
import { Order } from "../orders/Order.model.js"
import { Product } from "../products/Product.model.js"

// ── GET /api/v1/admin/dashboard/stats ──────────────────────────────────────
export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date()

    // ── Revenue (delivered orders) ─────────────────────────────────────────
    // Current 30-day window
    const thirtyDaysAgo  = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30)
    const sixtyDaysAgo   = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60)

    const [revenueCurrent, revenuePrev] = await Promise.all([
      Order.aggregate([
        { $match: { status: "delivered", createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { status: "delivered", createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ])

    const revenueTotal   = revenueCurrent[0]?.total ?? 0
    const revenuePrevVal = revenuePrev[0]?.total    ?? 0
    const revenueDelta   = revenuePrevVal === 0
      ? 0
      : Number(((revenueTotal - revenuePrevVal) / revenuePrevVal * 100).toFixed(1))

    // ── Orders today ────────────────────────────────────────────────────────
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1)

    const [ordersToday, ordersYesterday] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.countDocuments({ createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
    ])

    const ordersDelta = ordersYesterday === 0
      ? 0
      : Number(((ordersToday - ordersYesterday) / ordersYesterday * 100).toFixed(1))

    // ── Active users (distinct customers in last 30 days) ───────────────────
    const [activeUsersResult] = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: "$customerUserId" } },
      { $count: "count" },
    ])
    const [activeUsersPrevResult] = await Order.aggregate([
      { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: { _id: "$customerUserId" } },
      { $count: "count" },
    ])
    const activeCount     = activeUsersResult?.count     ?? 0
    const activePrevCount = activeUsersPrevResult?.count ?? 0
    const activesDelta    = activePrevCount === 0
      ? 0
      : Number(((activeCount - activePrevCount) / activePrevCount * 100).toFixed(1))

    // ── Low stock (isActive products with availableKeys < 5) ────────────────
    const lowStockProducts = await Product.find(
      { isActive: true, availableKeys: { $lt: 5 } },
      { name: 1, availableKeys: 1 }
    ).lean()

    // ── Revenue series (last 14 days, delivered orders) ─────────────────────
    const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(now.getDate() - 13)
    fourteenDaysAgo.setHours(0, 0, 0, 0)

    const revenueByDay = await Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ])
    const revenueMap = Object.fromEntries(revenueByDay.map(r => [r._id, r.revenue]))

    const revenueSeries = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - (13 - i))
      const date = d.toISOString().slice(0, 10)
      return { date, revenue: revenueMap[date] ?? 0 }
    })

    // ── Recent orders (last 10) ──────────────────────────────────────────────
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    const recentOrdersSummary = recentOrders.map(o => ({
      id:            o._id.toString(),
      customerEmail: o.customerEmail,
      productName:   o.items[0]?.productName ?? "—",
      amount:        o.totalAmount,
      status:        o.status,
      createdAt:     o.createdAt.toISOString(),
    }))

    // ── Top products by units sold (last 30 days) ───────────────────────────
    const topProductsAgg = await Order.aggregate([
      { $match: { status: "delivered", createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: "$items" },
      {
        $group: {
          _id:     "$items.productId",
          name:    { $first: "$items.productName" },
          sold:    { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 5 },
    ])

    const topProducts = topProductsAgg.map(p => ({
      id:      p._id.toString(),
      name:    p.name,
      sold:    p.sold,
      revenue: p.revenue,
    }))

    return res.status(200).json({
      status: "200",
      message: "ok",
      data: {
        revenue:      { total: revenueTotal,  deltaPct: revenueDelta },
        ordersToday:  { count: ordersToday,   deltaPct: ordersDelta },
        activeUsers:  { count: activeCount,   deltaPct: activesDelta },
        lowStock: {
          count:    lowStockProducts.length,
          products: lowStockProducts.map(p => ({
            id:    p._id.toString(),
            name:  p.name,
            stock: p.availableKeys,
          })),
        },
        revenueSeries,
        recentOrders:  recentOrdersSummary,
        topProducts,
      },
    })
  } catch (err) {
    next(err)
  }
}

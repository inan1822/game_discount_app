import orderModel from "./Order.model.js";
import productModel from "../products/Products.Model.js";
import userModel from "../users/User.model.js";
import { sendOrderEmail, sendOrderStatusEmail } from "../../shared/utils/mailer.js";
import { getIO } from "../../config/socket.js";
export const createOrder = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                status: "401",
                message: "You must be logged in to create an order",
                data: null
            });
        }
        const UserId = req.user.id;
        const { items, address, shippingCost, paymentMethod, notes } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({
                status: "400",
                message: "Order must have at least one item",
                data: null
            });
        }
        if (!address) {
            return res.status(400).json({
                status: "400",
                message: "Address is required",
                data: null
            });
        }
        const orderItems = [];
        let totalPrice = 0;
        for (const item of items) {
            const product = await productModel.findById(item.productId);
            if (!product) {
                return res.status(404).json({
                    status: "404",
                    message: `Product ${item.productId} not found`,
                    data: null
                });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    status: "400",
                    message: `Not enough stock for ${product.title}`,
                    data: null
                });
            }
            orderItems.push({
                productId: product._id,
                name: product.title,
                price: product.price,
                quantity: item.quantity,
                image: product.imageUrl ?? undefined
            });
            totalPrice += product.price * item.quantity;
            product.stock -= item.quantity;
            product.sold += item.quantity;
            await product.save();
            const io = getIO();
            io.to(String(product._id)).emit("stock-updated", {
                productId: product._id,
                newStock: product.stock
            });
            if (product.stock === 0) {
                io.to(String(product._id)).emit("product-out-of-stock", {
                    productId: product._id,
                    name: product.title
                });
            }
        }
        totalPrice += shippingCost || 0;
        const newOrder = await orderModel.create({
            orderedBy: UserId,
            items: orderItems,
            address,
            totalPrice,
            shippingCost: shippingCost || 0,
            paymentMethod: paymentMethod || 'cash',
            notes
        });
        const user = await userModel.findById(UserId);
        if (!user) {
            return res.status(404).json({
                status: "404",
                message: "User not found",
                data: undefined
            });
        }
        await sendOrderEmail(user.email, newOrder._id.toString(), totalPrice, orderItems);
        // ── Notify admin of new order ────────────────────────
        getIO().emit("order-created", {
            orderId: newOrder._id,
            totalPrice: newOrder.totalPrice,
            itemCount: orderItems.length
        });
        return res.status(201).json({
            status: "201",
            message: "Order created successfully",
            data: newOrder
        });
    }
    catch (error) {
        return res.status(500).json({
            status: "500",
            message: "Server error",
            data: error.message
        });
    }
};
export const getMyOrders = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                status: "401",
                message: "You must be logged in to get your orders",
                data: undefined
            });
        }
        const UserId = req.user.id;
        const orders = await orderModel.find({ orderedBy: UserId })
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({
            status: "200",
            message: "Orders fetched successfully",
            data: orders
        });
    }
    catch (error) {
        return res.status(500).json({
            status: "500",
            message: "Server error",
            data: error.message
        });
    }
};
export const getOrderById = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: "401",
                message: "You must be logged in to get your order",
                data: undefined
            });
            return;
        }
        const UserId = req.user.id;
        const orderId = req.params.id;
        const order = await orderModel.findById(orderId)
            .lean();
        if (!order) {
            res.status(404).json({
                status: "404",
                message: "Order not found",
                data: null
            });
            return;
        }
        if (order.orderedBy.toString() !== UserId && req.user.role !== "admin") {
            res.status(403).json({
                status: "403",
                message: "Access denied",
                data: null
            });
            return;
        }
        res.status(200).json({
            status: "200",
            message: "Order fetched successfully",
            data: order
        });
        return;
    }
    catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error.message
        });
        return;
    }
};
export const getAllOrders = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: "401",
                message: "You must be logged in to get all orders",
                data: undefined
            });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const totalOrders = await orderModel.countDocuments();
        const orders = await orderModel.find()
            .populate("orderedBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        res.status(200).json({
            status: "200",
            message: "Orders fetched successfully",
            data: {
                orders,
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit),
                totalOrders
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error.message
        });
        return;
    }
};
export const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { orderStatus } = req.body;
        const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
        if (!orderStatus || !validStatuses.includes(orderStatus)) {
            res.status(400).json({
                status: "400",
                message: "Invalid status, must be processing/shipped/delivered/cancelled",
                data: null
            });
            return;
        }
        const order = await orderModel.findByIdAndUpdate(orderId, { orderStatus }, { new: true });
        if (!order) {
            res.status(404).json({
                status: "404",
                message: "Order not found",
                data: null
            });
            return;
        }
        const user = await userModel.findById(order.orderedBy);
        if (user) {
            await sendOrderStatusEmail(user.email, order.id, orderStatus);
        }
        res.status(200).json({
            status: "200",
            message: "Order status updated successfully",
            data: order
        });
    }
    catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error.message
        });
        return;
    }
};
export const cancelOrder = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: "401",
                message: "You must be logged in to cancel an order",
                data: null
            });
            return;
        }
        const UserId = req.user.id;
        const orderId = req.params.id;
        const order = await orderModel.findById(orderId);
        if (!order) {
            res.status(404).json({
                status: "404",
                message: "Order not found",
                data: null
            });
            return;
        }
        if (order.orderedBy.toString() !== UserId) {
            res.status(403).json({
                status: "403",
                message: "Access denied",
                data: null
            });
            return;
        }
        if (order.orderStatus !== 'processing') {
            res.status(400).json({
                status: "400",
                message: "Order cannot be cancelled after it has been shipped",
                data: null
            });
            return;
        }
        const io = getIO();
        for (const item of order.items) {
            const product = await productModel.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity, sold: -item.quantity } }, { new: true });
            if (!product) {
                res.status(400).json({
                    status: "400",
                    message: "Product not found",
                    data: null
                });
                return;
            }
            io.to(String(item.productId)).emit("stock-updated", {
                productId: item.productId,
                newStock: product.stock
            });
        }
        order.orderStatus = 'cancelled';
        await order.save();
        res.status(200).json({
            status: "200",
            message: "Order cancelled successfully",
            data: order
        });
    }
    catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error.message
        });
        return;
    }
};
//# sourceMappingURL=order.controller.js.map
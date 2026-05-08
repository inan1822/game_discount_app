import mongoose from "mongoose"

const addressSchema = new mongoose.Schema<IAddress>({
    street: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String, required: true }
})

const OrderItemSchema = new mongoose.Schema<IOrderItem>({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: false
    }
})

const orderSchema = new mongoose.Schema<IOrder>({
    orderedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,

    },
    items: {
        type: [OrderItemSchema],
        required: true
    },
    address: {
        type: addressSchema,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        default: 'cash'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    orderStatus: {
        type: String,
        enum: ['processing', 'shipped', 'delivered', 'cancelled'],
        default: 'processing'
    },
    trackingNumber: {
        type: String
    },
    notes: {
        type: String
    }
},
    { timestamps: true }
)

orderSchema.index({ orderedBy: 1 })
orderSchema.index({ orderStatus: 1 })
orderSchema.index({ paymentStatus: 1 })
orderSchema.index({ orderedBy: 1, orderStatus: 1 })


const orderModel = mongoose.model("order", orderSchema)
export default orderModel
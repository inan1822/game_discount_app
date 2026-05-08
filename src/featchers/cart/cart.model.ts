import mongoose from "mongoose"


export const cartItemSchema = new mongoose.Schema<ICartItem>({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true,
        index: true
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
        required: true,
        min: 1,
        default: 1
    },
    image: {
        type: String,
        default: null
    }
})

const cartSchema = new mongoose.Schema<ICart>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },
    items: {
        type: [cartItemSchema],
        default: []
    }
}, { timestamps: true })

const cartModel = mongoose.model<ICart>("cart", cartSchema)
export default cartModel
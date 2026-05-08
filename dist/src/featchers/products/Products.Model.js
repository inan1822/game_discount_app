import mongoose from "mongoose";
const ratingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    }
});
const productSchema = new mongoose.Schema({
    price: {
        required: true,
        type: Number,
        min: 0
    },
    title: {
        required: true,
        type: String
    },
    description: {
        required: true,
        type: String
    },
    category: {
        type: String,
        required: true,
        enum: ["electronics", "clothing", "food"]
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    sold: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    rating: {
        type: [ratingSchema],
        default: []
    },
    averageRating: {
        type: Number,
        default: 0,
        max: 5
    },
    imageUrl: { type: String, default: null },
    // מזהה של התמונה כמו ID
    imagePublicId: { type: String, default: null },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    }
}, { timestamps: true });
productSchema.index({ createdBy: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ category: 1, Price: 1 });
const productModel = mongoose.model("product", productSchema);
export default productModel;
//# sourceMappingURL=Products.Model.js.map
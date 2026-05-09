import mongoose from "mongoose"

export interface IWishlistItem extends mongoose.Document {
    userId: mongoose.Types.ObjectId
    gameId: string           // RAWG game id (number as string)
    gameName: string
    gameCover: string | null
    gameSlug: string
    addedAt: Date
}

const wishlistSchema = new mongoose.Schema<IWishlistItem>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },
    gameId: {
        type: String,
        required: true
    },
    gameName: {
        type: String,
        required: true
    },
    gameCover: {
        type: String,
        default: null
    },
    gameSlug: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

// One game per user
wishlistSchema.index({ userId: 1, gameId: 1 }, { unique: true })

const WishlistModel = mongoose.model<IWishlistItem>("wishlist", wishlistSchema)
export default WishlistModel

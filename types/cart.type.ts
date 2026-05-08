
import { Document, Types } from "mongoose"

declare global {

    export interface ICartItem {
        productId: Types.ObjectId
        name: string
        price: number
        quantity: number
        image?: string | null

    }



    export interface ICart extends Document {
        userId: Types.ObjectId

        items: ICartItem[]
    }
}
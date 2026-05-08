import cartModel from "./cart.model.js"
import productModel from "../products/Products.Model.js"
import { Request, Response } from "express"
import { AppError } from "../../shared/utils/AppError.js"
// GET / — get current cart
export const getCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            throw new AppError("You must be logged in to get your cart", 401)
        }
        const UserId = req.user.id

        const cart = await cartModel.findOne({ userId: UserId })
            .lean()
        if (!cart) {
            res.status(200).json({
                status: "200",
                message: "Cart is empty",
                data: { items: [] }
            })
            return
        }

        res.status(200).json({
            status: "200",
            message: "your saver productsg   ",
            data: cart
        })

    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error instanceof Error ? error.message : "Internal server error"
        })
        return
    }
}

// POST / — add item to cart or update quantity if already exists
export const addToCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            throw new AppError("You must be logged in to add items to your cart", 401)
        }
        const UserId = req.user.id
        const { productId, quantity } = req.body

        if (!productId) {
            res.status(400).json({
                status: "400",
                message: "Product id is required",
                data: null
            })
            return
        }

        // find the product
        const product = await productModel.findById(productId).lean()
        if (!product) {
            res.status(404).json({
                status: "404",
                message: "Product not found",
                data: null
            })
            return
        }

        if (product.stock < 1) {
            res.status(400).json({
                status: "400",
                message: "Product is out of stock",
                data: null
            })
            return
        }

        // find or create cart
        let cart = await cartModel.findOne({ userId: UserId })
        if (!cart) {
            cart = await cartModel.create({
                userId: UserId,
                items: []
            })
        }

        // check if product already in cart
        const existingItem = cart.items.find(
            item => item.productId.toString() === productId
        )

        if (existingItem) {
            // update quantity
            existingItem.quantity += quantity || 1
        } else {
            // add new item
            cart.items.push({

                productId: product._id,
                name: product.title,
                price: product.price,
                quantity: quantity || 1,
                image: product.imageUrl
            })
        }

        await cart.save()

        res.status(200).json({
            status: "200",
            message: "Cart updated successfully",
            data: cart
        })


    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error instanceof Error ? error.message : "Internal error server"
        })
        return
    }
}

// PUT /:productId — update quantity of specific item
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            throw new AppError("You must be logged in to update items in your cart", 401)
        }
        const UserId = req.user.id
        const { productId } = req.params
        const { quantity } = req.body

        if (!quantity || quantity < 1) {
            res.status(400).json({
                status: "400",
                message: "Quantity must be at least 1",
                data: null
            })
            return
        }

        const cart = await cartModel.findOne({ userId: UserId })
        if (!cart) {
            res.status(404).json({
                status: "404",
                message: "Cart not found",
                data: null
            })
            return
        }

        const item = cart.items.find(
            item => item.productId.toString() === productId
        )

        if (!item) {
            res.status(404).json({
                status: "404",
                message: "Item not found in cart",
                data: null
            })
            return
        }

        item.quantity = quantity
        await cart.save()

        res.status(200).json({
            status: "200",
            message: "Cart item updated successfully",
            data: cart
        })

    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error instanceof Error ? error.message : "Internal server error"
        })
        return
    }
}


export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            throw new AppError("You must be logged in to remove items from your cart", 401)
        }
        const userId = req.user.id
        const { productId } = req.params

        const cart = await cartModel.findOne({ userId })
        if (!cart) {
            res.status(404).json({
                status: "404",
                message: "Cart not found",
                data: null
            })
            return
        }

        const originalLength = cart.items.length

        cart.items = cart.items.filter(
            item => item.productId.toString() !== productId
        )

        if (cart.items.length === originalLength) {
            res.status(404).json({
                status: "404",
                message: "Item not found in cart",
                data: null
            })
            return
        }

        await cart.save()

        cart.items = cart.items.filter(
            item => item.productId.toString() !== productId
        )

        await cart.save()

        res.status(200).json({
            status: "200",
            message: "Item removed from cart",
            data: cart
        })


    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error instanceof Error ? error.message : "Internal server error"
        })
        return
    }
}


export const clearCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            throw new AppError("You must be logged in to clear your cart", 401)
        }
        const UserId = req.user.id

        const cart = await cartModel.findOne({ userId: UserId })
        if (!cart) {
            res.status(404).json({
                status: "404",
                message: "Cart not found",
                data: null
            })
            return
        }

        cart.items = []
        await cart.save()

        res.status(200).json({
            status: "200",
            message: "Cart cleared successfully",
            data: cart
        })
        return

    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error instanceof Error ? error.message : "Internal server error"
        })
        return
    }
}

// POST /sync — sync localStorage cart with DB
export const syncCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            throw new AppError("You must be logged in to sync your cart", 401)
        }
        const UserId = req.user.id
        const { items } = req.body

        if (!items || items.length === 0) {
            res.status(400).json({
                status: "400",
                message: "No items to sync",
                data: null
            })
            return
        }

        // find or create cart
        let cart = await cartModel.findOne({ userId: UserId })

        if (!cart) {
            cart = await cartModel.create({ userId: UserId, items: [] })
        }

        // merge localStorage items with DB cart
        for (const localItem of items) {
            const product = await productModel.findById(localItem.productId)
            if (!product) continue

            const existingItem = cart.items.find(
                item => item.productId.toString() === localItem.productId
            )

            if (existingItem) {
                // take the higher quantity
                existingItem.quantity = Math.max(existingItem.quantity, localItem.quantity)
            } else {
                cart.items.push({
                    productId: product._id,
                    name: product.title,
                    price: product.price,
                    quantity: localItem.quantity,
                    image: product.imageUrl
                })
            }
        }

        await cart.save()

        res.status(200).json({
            status: "200",
            message: "Cart synced successfully",
            data: cart
        })
        return

    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error instanceof Error ? error.message : "Internal server error"
        })
        return
    }
}

import bcrypt from "bcrypt"
import productModel from "../products/Products.Model.js"
import userModel from "./User.model.js"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import orderModel from "../order/Order.model.js"
import { Request, Response } from "express"
import cartModel from "../cart/cart.model.js"

export const getUser = async (req: Request, res: Response) => {
    try {
        const UserId = req.params.id
        const OneUser = await userModel.findById(UserId).select("-token -sendVerificationCode -sendVerificationCodeExpiry -resetPasswordToken -resetPasswordExpiry").lean()
        if (!OneUser)
            return res.status(400).json({
                status: "400",
                message: "user doesn't exist",
                data: null
            })

        return res.status(200).json({
            status: "200",
            message: `user ${UserId} found`,
            data: OneUser,
        })

    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({
            status: String(status),
            message,
            data: null
        })
        return
    }
}

export const getAll = async (req: Request, res: Response) => {
    try {
        const allUsers = await userModel.find().select("-password").lean()

        res.status(200).json({
            status: "200",
            message: "All users fetched successfully",
            count: allUsers.length,
            data: allUsers
        });
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        return res.status(status).json({
            status: String(status),
            message,
            data: null
        })

    }
}
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const UserId = req.params.id

        // const userNameType = req.body.name
        // const userName = user.name

        // if (userNameType !== userName) {
        //     return res.status(400).json({
        //         message: "Wrong name"
        //     })
        // }
        // 1. מצא את המשתמש
        const user = await userModel.findById(UserId)
        if (!user) {
            return res.status(404).json({
                status: "404",
                message: "User doesn't exist",
                data: null
            })
        }

        await Promise.all([
            productModel.deleteMany({ createdBy: UserId }),

            orderModel.deleteMany({ orderedBy: UserId }),
        ])
        // 3. מחיקה
        await userModel.findByIdAndDelete(UserId)

        res.status(200).json({
            status: "200",
            message: `User with email ${user.email} deleted successfully`,
            data: null
        })

    } catch (error) {
        const { status, message } = getErrorInfo(error)
        return res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}
export const deleteMyUser = async (req: Request, res: Response) => {
    try {
        const UserId = req.params.id
        const { password } = req.body

        // 1. מצא את המשתמש
        const user = await userModel.findById(UserId).select("+password")
        if (!user) {
            return res.status(404).json({
                status: "404",
                message: "User doesn't exist",
                data: null
            })
        }

        // 2. בדוק סיסמה
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!password || password.trim() === "" || !isPasswordCorrect) {
            return res.status(401).json({
                status: "401",
                message: "Incorrect password",
                data: null
            })
        }
        await Promise.all([
            productModel.deleteMany({ createdBy: UserId }),

            orderModel.deleteMany({ orderedBy: UserId }),
        ])
        // 3. מחיקהs
        await userModel.findByIdAndDelete(UserId)

        res.status(200).json({
            status: "200",
            message: `User with email ${user.email} deleted successfully`,
            data: null
        })

    } catch (error) {
        const { status, message } = getErrorInfo(error)
        return res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}



export const updateUser = async (req: Request, res: Response) => {
    try {
        const { name, email, currentPassword, newPassword } = req.body
        const userId = req.params.id

        const user = await userModel.findById(userId).select("+password")

        if (!user)
            return res.status(404).json({
                status: "404",
                message: "user not found",
                data: null
            })


        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password)
        if (email || newPassword) {
            if (!isPasswordCorrect)
                return res.status(401).json({
                    status: "401",
                    message: "Incorrect password",
                    data: null
                })
        }


        // Update fields
        if (name) user.name = name
        if (email) user.email = email
        if (newPassword) user.password = newPassword  // pre-save hook will hash it

        const updatedUser = await user.save()

        res.status(200).json({
            status: "200",
            message: "user updated successfully",
            data: updatedUser
        })

    } catch (error) {
        const { status, message } = getErrorInfo(error)
        return res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}



export const promoteToAdmin = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id

        const user = await userModel.findByIdAndUpdate(
            userId,
            { role: "admin" },
            { new: true }  // returns the updated user
        )

        if (!user) return res.status(404).json({
            status: "404",
            message: "user not found",
            data: null
        })

        res.status(200).json({
            status: "200",
            message: `${user.name} promoted to admin`,
            data: user
        })

    } catch (error) {
        const { status, message } = getErrorInfo(error)
        return res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}

export const addAddress = async (req: Request, res: Response) => {
    try {
        const { street, city, country, zipCode } = req.body
        if (!req.user)
            return res.status(404).json({
                status: "404",
                message: "id not found",
                data: null
            })
        const userId = req.user.id

        const user = await userModel.findById(userId)

        if (!user) return res.status(404).json({
            status: "404",
            message: "user not found",
            data: null
        })

        const alreadyExists = user.addresses.some(
            addr =>
                addr.street === street &&
                addr.city === city &&
                addr.country === country &&
                addr.zipCode === zipCode
        )
        if (alreadyExists) return res.status(400).json({
            status: "400",
            message: "address already exists",
            data: null
        })

        user.addresses.push({ street, city, country, zipCode })

        await user.save()

        res.status(201).json({
            status: "201",
            message: "address added successfully",
            data: user.addresses
        })

    } catch (error) {
        const { status, message } = getErrorInfo(error)
        return res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}
export const deleteAddress = async (req: Request, res: Response) => {
    try {
        if (!req.user)
            return res.status(404).json({
                status: "404",
                message: "id not found",
                data: null
            })
        const userId = req.user.id
        const { addressId } = req.params

        const user = await userModel.findById(userId)

        if (!user) return res.status(404).json({
            status: "404",
            message: "user not found",
            data: null
        })

        // Check if address exists
        if (!addressId)
            return res.status(404).json({
                status: "404",
                message: "address not found",
                data: null
            })
        const addressExists = user.addresses.find(
            address => String(address._id) === String(addressId)
        )

        if (!addressExists) return res.status(404).json({
            status: "404",
            message: "address not found",
            data: null
        })
        if (!addressId)
            return res.status(404).json({
                status: "404",
                message: "address not found",
                data: null
            })
        // Remove address
        user.addresses = user.addresses.filter(
            address => String(address._id) !== String(addressId)
        )

        await user.save()

        res.status(200).json({
            status: "200",
            message: "address deleted successfully",
            data: user.addresses
        })

    } catch (error) {
        const { status, message } = getErrorInfo(error)
        return res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}

// ADD TO CART
export const addToCart = async (req: Request, res: Response) => {
    try {
        const { productId, quantity } = req.body
        if (!req.user)
            return res.status(401).json({
                status: "401",
                message: "Unauthorized",
                data: null
            })
        const userId = req.user.id

        const product = await productModel.findById(productId)
        if (!product) return res.status(404).json({
            status: "404",
            message: "product not found",
            data: null
        })

        const cart = await cartModel.findOne({ userId })
        const existingItem = cart?.items.find(
            item => String(item.productId) === String(productId)
        )

        if (existingItem) {
            await cartModel.findOneAndUpdate(
                { userId, "items.productId": productId },
                { $inc: { "items.$.quantity": quantity } }
            )
        } else {
            await cartModel.findOneAndUpdate(
                { userId },
                {
                    $push: {
                        items: {
                            productId,
                            name: product.title,
                            price: product.price,
                            quantity,
                            image: product.imageUrl
                        }
                    }
                },
                { upsert: true }
            )
        }

        const updatedCart = await cartModel.findOne({ userId })
        return res.status(201).json({
            status: "201",
            message: "product added to cart",
            data: updatedCart
        })

    } catch (error) {
        const { status: errStatus, message: errMessage } = getErrorInfo(error)
        return res.status(errStatus).json({
            status: String(errStatus),
            message: errMessage,
            data: null
        })
    }
}
// REMOVE FROM CART
export const removeFromCart = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params
        if (!req.user)
            return res.status(404).json({
                status: "404",
                message: "id not found",
                data: null
            })
        const userId = req.user.id

        const user = await userModel.findById(userId)
        if (!user) return res.status(404).json({
            status: "404",
            message: "user not found",
            data: null
        })


        const itemExists = user.cart.find(
            item => String(item.productId) === String(productId)
        )

        if (!itemExists) return res.status(404).json({
            status: "404",
            message: "product not found in cart",
            data: null
        })

        user.cart = user.cart.filter(
            item => String(item.productId) !== String(productId)
        )

        await user.save()

        res.status(200).json({
            status: "200",
            message: "product removed from cart",
            data: user.cart
        })

    } catch (error) {
        const { status: errStatus, message: errMessage } = getErrorInfo(error)
        return res.status(errStatus).json({
            status: String(errStatus),
            message: errMessage,
            data: null
        })
    }
}


export const getCart = async (req: Request, res: Response) => {
    try {
        if (!req.user)
            return res.status(404).json({
                status: "404",
                message: "id not found",
                data: null
            })
        const userId = req.user.id

        const user = await userModel.findById(userId).populate("cart.product")

        if (!user) return res.status(404).json({
            status: "404",
            message: "user not found",
            data: null
        })

        res.status(200).json({
            status: "200",
            message: "cart fetched successfully",
            data: user.cart
        })

    } catch (error) {
        const { status: errStatus, message: errMessage } = getErrorInfo(error)
        res.status(errStatus).json({
            status: String(errStatus),
            message: errMessage,
            data: null
        })
        return
    }
}
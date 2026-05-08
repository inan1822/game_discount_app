
import productModel from "./Products.Model.js"
import { uploadToCloud, deleteImage } from "./cloudinary.service.js"
import { Response, Request } from "express"
import { Types } from "mongoose"

interface Body {
    Title: string
    Price: number
    description: string
    category: string
    stock: number
}

export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { Title: title, Price: price, description: description, category: category, stock: stock } = req.body as Body
        const UserId = req.user!.id

        if (!UserId) {
            res.status(401).json({
                status: "401",
                message: "You must be logged in to create a product",
                data: null
            })
            return
        }

        if (!title || !price || !description || !category || !stock) {
            res.status(400).json({
                status: "400",
                message: "Please provide all required fields",
                data: null
            })
            return
        }

        const usedTitle = await productModel.findOne({ title, createdBy: UserId })
        if (usedTitle) {
            res.status(400).json({
                status: "400",
                message: "You already have a product with this title",
                data: null
            })
            return
        }

        if (req.file) {
            const result = await uploadToCloud(req.file.buffer, "image")
            req.body.imageUrl = result.secure_url
            req.body.imagePublicId = result.public_id
        }

        const newProduct = await productModel.create({
            title,
            price,
            description,
            category,
            stock,
            imageUrl: req.body.imageUrl || null,
            imagePublicId: req.body.imagePublicId || null,
            createdBy: UserId
        })

        res.status(201).json({
            status: "201",
            message: "Product created successfully",
            data: newProduct
        })

    } catch (error: unknown) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: error instanceof Error ? error.message : String(error)
        })
        return
    }
}

export const getProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const productID = req.params.id
        const OneProduct = await productModel.findOne({ _id: productID, isActive: true })
        if (!OneProduct) {
            res.status(404).json({
                status: "404",
                message: "cannot find product",
                data: null
            })
            return
        }

        res.status(200).json({
            status: "200",
            message: `found product`,
            data: OneProduct
        })


    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "cannot get product",
            data: error instanceof Error ? error.message : String(error)
        })
        return
    }
}
interface IRating {
    user: string
    rating: number
    comment: string
}
interface InProduct {
    page: number | string
    limit: number | string
    category: string
    minPrice: number | string
    maxPrice: number | string
    sort: string
    order: string
    search: string
    averageRating: number

}
interface ProductFilter {
    isActive: boolean
    category?: string
    Price?: {
        $gte?: number
        $lte?: number
    }
    title?: {
        $regex: string
        $options: string
    }
}

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            minPrice,
            maxPrice,
            sort = "createdAt",
            order = "desc",
            search
        } = req.query as unknown as InProduct

        const filter: ProductFilter = { isActive: true }

        if (category) filter.category = category

        if (minPrice || maxPrice) {
            filter.Price = {}
            if (minPrice) filter.Price.$gte = Number(minPrice)
            if (maxPrice) filter.Price.$lte = Number(maxPrice)
        }

        if (search) filter.title = { $regex: search, $options: "i" }

        const pageNum: InProduct["page"] = Math.max(1, parseInt(page as string))
        const limitNum: InProduct["limit"] = Math.min(100, Math.max(1, parseInt(limit as string)))
        const skip = (pageNum - 1) * limitNum

        const sortOrder = order === "asc" ? 1 : -1
        const allowedSortFields = ["createdAt", "Price", "Title"]   // ✅ match schema casing
        const sortField = allowedSortFields.includes(sort) ? sort : "createdAt"

        const [products, totalCount] = await Promise.all([
            productModel
                .find(filter)
                .select("Title Price description category stock sold averageRating imageUrl isActive createdAt")
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            productModel.countDocuments(filter)
        ])

        res.status(200).json({
            status: "200",
            message: "Products retrieved successfully",
            data: {
                products,
                currentPage: pageNum,
                totalPages: Math.ceil(totalCount / limitNum),
                totalCount,
                hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
                hasPrevPage: pageNum > 1
            }

        })

    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Cannot get products",
            error: error instanceof Error ? error.message : String(error)
        })
        return
    }
}

export const getUsersProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.id
        const userProducts = await productModel.find({ createdBy: userId, isActive: true }).lean()

        if (!userProducts) {
            res.status(404).json({
                status: "404",
                message: "cannot find user",
                data: null
            })
            return
        }



        res.status(200).json({
            status: "200",
            message: "Successfully retrieved all products",
            data: userProducts
        })
    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "cannot get products",
            data: (error as Error).message
        })
        return
    }
}
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = req.params.id

        const product = await productModel.findById(productId)
        if (!product) {
            res.status(404).json({
                status: "404",
                message: "Cannot find product",
                data: null
            })
            return
        }

        // soft delete — just hide it instead of removing from DB
        product.isActive = false
        if (product.imagePublicId) {
            await deleteImage(product.imagePublicId)
        }
        await product.save()

        res.status(200).json({
            status: "200",
            message: "Product deleted successfully",
            data: null
        })


    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Cannot delete product",
            data: (error as Error).message
        })
        return
    }
}


export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = req.params.id
        const userId = req.user!.id
        const { Title, Price, description, category, stock, isActive } = req.body

        const product = await productModel.findOne({ _id: productId, createdBy: userId })
        if (!product) {
            res.status(404).json({
                status: "404",
                message: "Product not found or you don't own it",
                data: null
            })
            return
        }
        // handle image update
        if (req.file) {
            if (product.imagePublicId)
                await deleteImage(product.imagePublicId)

            const result = await uploadToCloud(req.file.buffer, "image")
            req.body.imageUrl = result.secure_url
            req.body.imagePublicId = result.public_id
        }

        if (Title) product.title = Title
        if (Price !== undefined) product.price = Price
        if (description) product.description = description
        if (category) product.category = category
        if (stock !== undefined) product.stock = stock
        if (isActive !== undefined) product.isActive = isActive
        if (req.body.imageUrl) product.imageUrl = req.body.imageUrl
        if (req.body.imagePublicId) product.imagePublicId = req.body.imagePublicId

        const updatedProduct = await product.save()

        res.status(200).json({
            status: "200",
            message: "Product updated successfully",
            data: updatedProduct
        })
        return

    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Cannot update product",
            data: (error as Error).message
        })
        return
    }
}

export const addRating = async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = req.params.id
        const UserId = req.user!.id
        const { rating, comment } = req.body

        // validate input
        if (!rating || !comment) {
            res.status(400).json({
                status: "400",
                message: "Please provide rating and comment",
                data: null
            })
            return
        }

        // find product
        const product = await productModel.findById(productId)
        if (!product) {
            res.status(404).json({
                status: "404",
                message: "Product not found",
                data: null
            })
            return
        }

        // check if user already rated this product
        const alreadyRated = product.rating.find(r => r.user.toString() === UserId)
        if (alreadyRated) {
            res.status(400).json({
                status: "400",
                message: "You already rated this product",
                data: null
            })
            return
        }

        // check user is not rating their own product
        if (product.createdBy.toString() === UserId) {
            res.status(400).json({
                status: "400",
                message: "You cannot rate your own product",
                data: null
            })
            return
        }

        // add the rating
        product.rating.push({ user: new Types.ObjectId(UserId), rating, comment })

        // recalculate average rating
        const total = product.rating.reduce((sum, r) => sum + r.rating, 0)
        product.averageRating = Math.round((total / product.rating.length) * 10) / 10

        await product.save()

        res.status(200).json({
            status: "200",
            message: "Rating added successfully",
            data: product
        })

    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: (error as Error).message
        })
        return
    }
}


export const restoreProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const product = await productModel.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        )
        if (!product) {
            res.status(404).json({
                status: "404",
                message: "Product not found",
                data: null
            })
            return
        }
        res.status(200).json({
            status: "200",
            message: "Product restored",
            data: product
        })
    } catch (error) {
        res.status(500).json({
            status: "500",
            message: "Server error",
            data: (error as Error).message
        })
        return
    }
}


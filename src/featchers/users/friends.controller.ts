import { Request, Response } from "express"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import {
    listFollowingService,
    listFollowersService,
    listRequestsService,
    followService,
    unfollowService,
    acceptRequestService,
    declineRequestService,
    searchUsersService,
    getPublicProfileService,
} from "./friends.service.js"

export const listFollowing = async (req: Request, res: Response) => {
    try {
        const data = await listFollowingService(req.user!.id)
        res.status(200).json({ status: "200", message: "OK", data })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const listFollowers = async (req: Request, res: Response) => {
    try {
        const data = await listFollowersService(req.user!.id)
        res.status(200).json({ status: "200", message: "OK", data })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const listRequests = async (req: Request, res: Response) => {
    try {
        const data = await listRequestsService(req.user!.id)
        res.status(200).json({ status: "200", message: "OK", data })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const follow = async (req: Request, res: Response) => {
    try {
        const data = await followService(req.user!.id, String(req.params.id))
        res.status(200).json({ status: "200", message: "OK", data })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const unfollow = async (req: Request, res: Response) => {
    try {
        await unfollowService(req.user!.id, String(req.params.id))
        // 204 keeps response identical whether or not anything actually changed —
        // prevents probing relationship state through differing payloads.
        res.status(204).end()
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const acceptRequest = async (req: Request, res: Response) => {
    try {
        await acceptRequestService(req.user!.id, String(req.params.requesterId))
        res.status(200).json({ status: "200", message: "Request accepted", data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const declineRequest = async (req: Request, res: Response) => {
    try {
        await declineRequestService(req.user!.id, String(req.params.requesterId))
        res.status(204).end()
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const searchUsers = async (req: Request, res: Response) => {
    try {
        // Joi has already validated + coerced these to the right types.
        const q     = String(req.query.q)
        const limit = Number(req.query.limit ?? 20)
        const data  = await searchUsersService(req.user!.id, q, limit)
        res.status(200).json({ status: "200", message: "OK", data })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const getPublicProfile = async (req: Request, res: Response) => {
    try {
        const data = await getPublicProfileService(req.user!.id, String(req.params.id))
        res.status(200).json({ status: "200", message: "OK", data })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

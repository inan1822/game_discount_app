import { Request, Response } from "express"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import { submitFeedbackService, submitBugService, exportUserDataService } from "./support.service.js"

export const submitFeedback = async (req: Request, res: Response) => {
    try {
        const { text, email } = req.body as { text: string; email?: string }
        const userId = req.user?.id ?? null
        await submitFeedbackService(userId, { text, email })
        res.status(201).json({ status: "201", message: "Feedback received. Thank you!", data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const submitBug = async (req: Request, res: Response) => {
    try {
        const { steps, expected, device, email } = req.body as {
            steps: string; expected: string; device: string; email?: string
        }
        const userId = req.user?.id ?? null
        await submitBugService(userId, { steps, expected, device, email })
        res.status(201).json({ status: "201", message: "Bug report received. Thank you!", data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const exportUserData = async (req: Request, res: Response) => {
    try {
        const data = await exportUserDataService(req.user!.id)
        const filename = `dislow-data-${req.user!.id}-${new Date().toISOString().slice(0, 10)}.json`
        res.setHeader("Content-Type", "application/json")
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
        res.status(200).send(JSON.stringify(data, null, 2))
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

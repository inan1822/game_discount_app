import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

export const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

const FROM = `"DisLow Store" <${process.env.EMAIL_USER}>`
const SITE_URL = process.env.CLIENT_URL || "http://localhost:3000"

// Used by checkout (paid orders, BEFORE webhook delivers the key)
export const sendPaidConfirmationEmail = async (
    to: string,
    productName: string,
    finalPrice: number,
    orderId: string,
): Promise<void> => {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Order confirmed — ${productName} — #${orderId.slice(-8).toUpperCase()}`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#12131a;color:#fff;border-radius:12px;padding:32px">
                <h1 style="color:#6475D1;font-size:20px;margin-bottom:8px">Payment confirmed</h1>
                <p style="color:#b3bade;margin-bottom:24px">Your payment was successful. Your key will arrive in a separate email once the transaction settles.</p>
                <div style="background:#1c1e2a;border:1px solid rgba(188,188,201,0.15);border-radius:10px;padding:20px;margin-bottom:24px">
                    <p style="color:#9fa0a1;font-size:12px;margin-bottom:4px">PRODUCT</p>
                    <p style="color:#fff;font-weight:700;font-size:16px;margin-bottom:16px">${productName}</p>
                    <p style="color:#9fa0a1;font-size:12px;margin-bottom:4px">AMOUNT PAID</p>
                    <p style="color:#44d62c;font-weight:800;font-size:20px">$${finalPrice.toFixed(2)}</p>
                </div>
                <p style="color:#9fa0a1;font-size:12px">Order ID: #${orderId.slice(-8).toUpperCase()}</p>
                <p style="color:#9fa0a1;font-size:12px;margin-top:12px">Track your order at <a href="${SITE_URL}/account/orders" style="color:#6475D1">DisLow</a>.</p>
            </div>
        `,
    })
}

// Used by free-product checkout AND webhook (post-payment) AND admin resend.
// Same content/look-and-feel for both — single source of truth.
export const sendKeyDeliveryEmail = async (
    to: string,
    productName: string,
    code: string,
    orderId: string,
): Promise<void> => {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Your key for ${productName} — Order #${orderId.slice(-8).toUpperCase()}`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#12131a;color:#fff;border-radius:12px;padding:32px">
                <h1 style="color:#44d62c;font-size:20px;margin-bottom:8px">Your key is ready</h1>
                <p style="color:#b3bade;margin-bottom:24px">Thanks for your purchase on DisLow. Here is your product key:</p>
                <div style="background:#1c1e2a;border:1px solid rgba(188,188,201,0.15);border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
                    <p style="color:#9fa0a1;font-size:12px;margin-bottom:8px">PRODUCT</p>
                    <p style="color:#fff;font-weight:700;font-size:16px;margin-bottom:20px">${productName}</p>
                    <p style="color:#9fa0a1;font-size:12px;margin-bottom:8px">YOUR KEY</p>
                    <p style="color:#44d62c;font-family:monospace;font-size:20px;font-weight:700;letter-spacing:2px;word-break:break-all">${code}</p>
                </div>
                <p style="color:#9fa0a1;font-size:12px">Order ID: #${orderId.slice(-8).toUpperCase()}</p>
                <p style="color:#9fa0a1;font-size:12px;margin-top:12px">View your purchase history at <a href="${SITE_URL}/account/orders" style="color:#6475D1">DisLow</a>.</p>
            </div>
        `,
    })
}

export const sendVerificationEmail = async (to: string, code: string): Promise<void> => {
    try {

        await transporter.sendMail({
            from: `"My App" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: "Your verification code",
            text: `your verification code is: ${code}`,
            html: `<h1>copy your code: ${code}</h1>`
        })
        console.log("Email sent successfully")
    } catch (error) {
        console.log(error, "Email didn't send")
    }
}
export const sendResetPasswordEmail = async (to: string, token: string): Promise<void> => {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000"
    const resetLink = `${clientUrl}/reset-password?token=${token}`
    try {
        await transporter.sendMail({
            from: `"DisLow" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: "Reset your DisLow password",
            text: `Click the link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#12131a;border-radius:12px;color:#fff;">
                  <h1 style="font-size:22px;font-weight:800;margin-bottom:8px;">Reset your password</h1>
                  <p style="color:#9fa0a1;font-size:14px;margin-bottom:24px;">
                    We received a request to reset the password for your DisLow account.
                    Click the button below to set a new password.
                  </p>
                  <a href="${resetLink}"
                     style="display:inline-block;background:#6475D1;color:#fff;text-decoration:none;
                            padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:24px;">
                    Reset Password →
                  </a>
                  <p style="color:#9fa0a1;font-size:12px;margin-top:24px;">
                    This link expires in <strong style="color:#fff;">1 hour</strong>.<br/>
                    If you didn't request a password reset, you can safely ignore this email.
                  </p>
                </div>
            `
        })
        console.log("Email sent successfully")
    } catch (error) {
        console.log(error, "Email didn't send")
    }
}


export const sendOrderEmail = async (to: string, orderId: string, totalPrice: number, items: { name: string; price: number; quantity: number; image?: string }[]): Promise<void> => {
    try {
        const itemsList = items
            .map(item => `<li>${item.name} x ${item.quantity} — $${item.price}</li>`)
            .join("");

        await transporter.sendMail({
            from: `"My App" <${process.env.EMAIL_USER}>`,
            to,
            subject: `Order Confirmation #${orderId}`,
            text: `Your order #${orderId} has been placed successfully! Total: $${totalPrice}`,
            html: `
                <h2>Thank you for your order!</h2>
                <p>Your order <strong>#${orderId}</strong> has been placed successfully.</p>
                <h3>Order Summary:</h3>
                <ul>${itemsList}</ul>9
                <p><strong>Total:</strong> $${totalPrice}</p>
            `
        });

        console.log("Order email sent successfully");
    } catch (error) {
        console.log(error, "Order email failed");
    }
};


export const sendOrderStatusEmail = async (to: string, orderId: string, newStatus: string): Promise<void> => {
    const statusMessages: StatusMessages = {
        processing: {
            subject: "Your order is being processed",
            color: "#F59E0B",
            message: "We have received your order and it is currently being processed."
        },
        shipped: {
            subject: "Your order has been shipped! ",
            color: "#3B82F6",
            message: "Great news! Your order is on its way to you."
        },
        delivered: {
            subject: "Your order has been delivered! ",
            color: "#10B981",
            message: "Your order has been delivered. We hope you enjoy your purchase!"
        },
        cancelled: {
            subject: "Your order has been cancelled",
            color: "#EF4444",
            message: "Your order has been cancelled. If you have any questions, please contact us."
        }
    }
    interface StatusMessages {
        [key: string]: {
            subject: string;
            color: string;
            message: string;
        }
    }
    const { subject, color, message } = statusMessages[newStatus]

    try {
        await transporter.sendMail({
            from: `"My Shop" <${process.env.EMAIL_USER}>`,
            to,
            subject: `${subject} - Order #${orderId}`,
            text: `Order #${orderId} status update: ${newStatus}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${color};">${subject}</h2>
                    <p>Hi there,</p>
                    <p>${message}</p>
                    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Order ID:</strong> #${orderId}</p>
                        <p style="margin: 8px 0 0;"><strong>New Status:</strong> 
                            <span style="color: ${color}; font-weight: bold; text-transform: uppercase;">
                                ${newStatus}
                            </span>
                        </p>
                    </div>
                    <p>Thank you for shopping with us!</p>
                </div>
            `
        })
        console.log("Order status email sent successfully")
    } catch (error) {
        console.log(error, "Order status email failed")
    }
}
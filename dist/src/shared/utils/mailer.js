import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
export const sendVerificationEmail = async (to, code) => {
    try {
        await transporter.sendMail({
            from: `"My App" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: "Your verification code",
            text: `your verification code is: ${code}`,
            html: `<h1>copy your code: ${code}</h1>`
        });
        console.log("Email sent successfully");
    }
    catch (error) {
        console.log(error, "Email didn't send");
    }
};
export const sendResetPasswordEmail = async (to, code) => {
    try {
        await transporter.sendMail({
            from: `"My App" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: "Your verification code to reset your password",
            text: `Your verification code is: ${code}`,
            html: `
                <h1>Your verification code is: ${code}</h1>
                <p>If you didn't request this, please secure your account.</p>
            `
        });
        console.log("Email sent successfully");
    }
    catch (error) {
        console.log(error, "Email didn't send");
    }
};
export const sendOrderEmail = async (to, orderId, totalPrice, items) => {
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
    }
    catch (error) {
        console.log(error, "Order email failed");
    }
};
export const sendOrderStatusEmail = async (to, orderId, newStatus) => {
    const statusMessages = {
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
    };
    const { subject, color, message } = statusMessages[newStatus];
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
        });
        console.log("Order status email sent successfully");
    }
    catch (error) {
        console.log(error, "Order status email failed");
    }
};
//# sourceMappingURL=mailer.js.map
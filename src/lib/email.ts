import { MailtrapClient } from "mailtrap";
import { render } from "@react-email/components";
import PurchaseConfirmation from "@/emails/purchase-confirmation";

const mailtrap = new MailtrapClient({
  token: process.env.MAILTRAP_API_TOKEN!,
});

export interface PurchaseEmailData {
  buyerEmail: string;
  buyerName: string | null;
  productName: string;
  amountCents: number;
  currency: string;
  storeName: string;
  creatorEmail: string;
  orderId: string;
  downloadUrl: string;
  purchaseDate: Date;
}

export async function sendPurchaseConfirmation(data: PurchaseEmailData) {
  const component = PurchaseConfirmation(data);
  const [html, text] = await Promise.all([
    render(component),
    render(component, { plainText: true }),
  ]);

  await mailtrap.send({
    from: {
      name: "Fooshop",
      email: process.env.EMAIL_FROM || "noreply@fooshop.ai",
    },
    to: [{ email: data.buyerEmail }],
    subject: `Il tuo acquisto: ${data.productName}`,
    html,
    text,
    category: "purchase-confirmation",
  });
}

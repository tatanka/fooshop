import { MailtrapClient } from "mailtrap";
import { render } from "@react-email/components";
import PurchaseConfirmation from "@/emails/purchase-confirmation";

let _mailtrap: MailtrapClient | null = null;

function getMailtrap(): MailtrapClient {
  if (!_mailtrap) {
    _mailtrap = new MailtrapClient({
      token: process.env.MAILTRAP_API_TOKEN!,
    });
  }
  return _mailtrap;
}

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

  await getMailtrap().send({
    from: {
      name: "Fooshop",
      email: process.env.EMAIL_FROM || "noreply@fooshop.ai",
    },
    to: [{ email: data.buyerEmail }],
    subject: `Your purchase: ${data.productName}`,
    html,
    text,
    category: "purchase-confirmation",
  });
}

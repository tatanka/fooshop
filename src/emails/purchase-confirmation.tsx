import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
} from "@react-email/components";
import type { PurchaseEmailData } from "@/lib/email";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function PurchaseConfirmation({
  buyerName,
  productName,
  amountCents,
  currency,
  storeName,
  creatorEmail,
  orderId,
  downloadUrl,
  purchaseDate,
}: PurchaseEmailData) {
  const shortOrderId = orderId.slice(0, 8).toUpperCase();

  return (
    <Html lang="en">
      <Head />
      <Preview>Your purchase: {productName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            <Heading style={heading}>Purchase confirmed</Heading>

            <Text style={text}>
              {buyerName ? `Hi ${buyerName},` : "Hi,"} your purchase is complete.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailRow}>
                <strong>Product:</strong> {productName}
              </Text>
              <Text style={detailRow}>
                <strong>Amount:</strong> {formatPrice(amountCents, currency)}
              </Text>
              <Text style={detailRow}>
                <strong>Store:</strong> {storeName}
              </Text>
              <Text style={detailRow}>
                <strong>Order:</strong> #{shortOrderId}
              </Text>
              <Text style={detailRow}>
                <strong>Date:</strong> {formatDate(purchaseDate)}
              </Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={downloadUrl} style={button}>
                Download your file
              </Button>
            </Section>

            <Text style={expiry}>
              This link expires in 72 hours.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              Need help? Contact the seller at {creatorEmail}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

PurchaseConfirmation.PreviewProps = {
  buyerEmail: "buyer@example.com",
  buyerName: "John",
  productName: "Ultimate Design Kit",
  amountCents: 2900,
  currency: "usd",
  storeName: "Creative Studio",
  creatorEmail: "creator@example.com",
  orderId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  downloadUrl: "https://fooshop.ai/api/download/abc123",
  purchaseDate: new Date("2026-03-11"),
} satisfies PurchaseEmailData;

// --- Styles ---

const body = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "20px 0",
};

const section = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "32px",
};

const heading = {
  fontSize: "22px",
  fontWeight: "700" as const,
  color: "#18181b",
  margin: "0 0 16px",
};

const text = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#3f3f46",
  margin: "0 0 16px",
};

const detailsBox = {
  backgroundColor: "#fafafa",
  borderRadius: "6px",
  padding: "16px",
  margin: "0 0 24px",
};

const detailRow = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#3f3f46",
  margin: "0 0 4px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const button = {
  backgroundColor: "#18181b",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  borderRadius: "6px",
};

const expiry = {
  fontSize: "13px",
  color: "#71717a",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "0 0 16px",
};

const footer = {
  fontSize: "13px",
  color: "#a1a1aa",
  margin: "0",
};

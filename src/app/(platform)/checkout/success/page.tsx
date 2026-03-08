export default function CheckoutSuccess() {
  return (
    <main className="max-w-lg mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Purchase complete!</h1>
      <p className="mt-4 text-gray-600">
        Check your email for the download link.
      </p>
      <a href="/" className="mt-8 inline-block underline">
        Back to Fooshop
      </a>
    </main>
  );
}
